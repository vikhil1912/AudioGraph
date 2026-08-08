"""
FastAPI server bridging the existing GraphRAG pipelines to HTTP endpoints.
Now uses MongoDB for persistence, Cloudinary for media storage,
and JWT authentication for security.

Start with:
    uvicorn api_server:app --reload --port 8000
"""

import os
import uuid
import asyncio
import traceback
import tempfile
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, WebSocket, WebSocketDisconnect, Query
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import config
import database
import cloudinary_utils
from auth import router as auth_router, get_current_user, decode_token
from neo4j import GraphDatabase
from src.pipelines.ingestion_pipeline import build_ingestion_pipeline
from src.pipelines.query_pipeline import build_query_pipeline


def get_neo4j_driver():
    uri = config.NEO4J_URI
    username = config.NEO4J_USERNAME
    password = config.NEO4J_PASSWORD

    # Try different routing schemes if the original fails
    schemes_to_try = [uri]

    # Generate fallback schemes based on the provided URI
    if uri.startswith("neo4j://"):
        schemes_to_try.append(uri.replace("neo4j://", "neo4j+s://"))
        schemes_to_try.append(uri.replace("neo4j://", "neo4j+ssc://"))
    elif uri.startswith("neo4j+s://"):
        schemes_to_try.append(uri.replace("neo4j+s://", "neo4j+ssc://"))
        schemes_to_try.append(uri.replace("neo4j+s://", "neo4j://"))

    last_exception = None
    for test_uri in schemes_to_try:
        try:
            driver = GraphDatabase.driver(test_uri, auth=(username, password))
            driver.verify_connectivity()
            return driver
        except Exception as e:
            last_exception = e
            continue

    raise last_exception or Exception("Failed to connect to Neo4j with any URI scheme")


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, meeting_id: str):
        await websocket.accept()
        if meeting_id not in self.active_connections:
            self.active_connections[meeting_id] = []
        self.active_connections[meeting_id].append(websocket)

    def disconnect(self, websocket: WebSocket, meeting_id: str):
        if meeting_id in self.active_connections:
            if websocket in self.active_connections[meeting_id]:
                self.active_connections[meeting_id].remove(websocket)
            if not self.active_connections[meeting_id]:
                del self.active_connections[meeting_id]

    async def broadcast(self, meeting_id: str, message: dict):
        if meeting_id in self.active_connections:
            # Create a list copy to avoid iteration mutation errors
            for connection in list(self.active_connections[meeting_id]):
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

class StatsConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        await self.broadcast()

    async def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        await self.broadcast()

    async def broadcast(self):
        if not self.active_connections:
            return
        total_users = await database.count_users()
        active_users = len(self.active_connections)
        message = {"total_users": total_users, "active_users": active_users}
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()
stats_manager = StatsConnectionManager()
main_loop = None

# ── Lifespan ────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    global main_loop
    main_loop = asyncio.get_running_loop()
    await database.init_db()
    # Keep temp dirs for pipeline intermediate files
    os.makedirs(config.RAW_AUDIO_DIR, exist_ok=True)
    os.makedirs(config.TRANSCRIPTS_DIR, exist_ok=True)
    os.makedirs(config.OUTPUTS_DIR, exist_ok=True)
    yield
    await database.close_db()


app = FastAPI(title="Meeting GraphRAG API", lifespan=lifespan)

# Include auth router
app.include_router(auth_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response Models ───────────────────────────────────────────────

class QueryRequest(BaseModel):
    meeting_id: str
    question: str


class QueryResponse(BaseModel):
    answer: str
    meeting_id: str
    question: str
    sources: list[dict] = []


# ── Background ingestion ────────────────────────────────────────────────────

def _run_ingestion(meeting_id: str, audio_url: str):
    """Runs the full ingestion pipeline synchronously (called in a thread)."""
    def update_status(status, error=None):
        if error:
            database.sync_update_meeting_status(meeting_id, status, error)
            msg = {"status": status, "error": error}
        else:
            database.sync_update_meeting_status(meeting_id, status)
            msg = {"status": status}
        if main_loop:
            asyncio.run_coroutine_threadsafe(manager.broadcast(meeting_id, msg), main_loop)

    try:
        update_status("processing")

        # Use meeting_id for temp file stems
        chunks_path = os.path.join(config.TRANSCRIPTS_DIR, f"{meeting_id}_chunks.json")
        extractions_path = os.path.join(config.OUTPUTS_DIR, f"{meeting_id}_extractions.json")

        pipeline = build_ingestion_pipeline()
        result = pipeline.invoke({
            "audio_url": audio_url,
            "meeting_id": meeting_id,
            "chunks_path": chunks_path,
            "extractions_path": extractions_path,
        })

        # Save transcripts and extractions to MongoDB
        if result.get("chunks"):
            database.sync_save_transcript(meeting_id, result["chunks"])
        if result.get("extractions"):
            database.sync_save_extractions(meeting_id, result["extractions"])

        # Trigger automated email minutes
        if result.get("chunks"):
            try:
                from src.agents.summary_agent import generate_meeting_minutes
                from src.services.email_service import send_meeting_minutes_email
                print(f"[Ingestion] Generating email minutes for {meeting_id}...")
                
                # Fetch the email address of the user who uploaded the meeting
                user_email = database.sync_get_user_email_by_meeting(meeting_id)
                if user_email:
                    html_minutes = generate_meeting_minutes(result["chunks"])
                    send_meeting_minutes_email(user_email, meeting_id, html_minutes)
                else:
                    print(f"[Ingestion] Could not find user email for {meeting_id}. Skipping email.")
            except Exception as email_err:
                print(f"[Ingestion] Failed to send email minutes: {email_err}")

        update_status("ready")

        # Clean up temp files
        for path in [chunks_path, extractions_path]:
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                except OSError:
                    pass

    except Exception as e:
        traceback.print_exc()
        update_status("error", str(e))


# ── Endpoints ───────────────────────────────────────────────────────────────

SUPPORTED_EXTENSIONS = {".mp3", ".wav", ".m4a", ".ogg", ".flac", ".webm", ".mp4", ".wma", ".aac"}


@app.get("/api/health")
async def health_check():
    """Simple endpoint for UptimeRobot pinging."""
    return {"status": "ok"}


@app.post("/api/ingest")
async def ingest_audio(
    file: UploadFile = File(...),
    meeting_id: str = Form(None),
    current_user: dict = Depends(get_current_user),
):
    """Upload an audio file and kick off ingestion in the background."""
    user_id = current_user["_id"]

    # Validate file extension
    _, ext = os.path.splitext(file.filename or "")
    if ext.lower() not in SUPPORTED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported format '{ext}'. Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}")

    # Generate meeting ID if not provided
    if not meeting_id:
        meeting_id = f"meeting_{uuid.uuid4().hex[:8]}"

    # Upload to Cloudinary via stream directly from UploadFile
    try:
        cloud_result = cloudinary_utils.upload_audio(file.file, file.filename, meeting_id)
        audio_url = cloud_result["url"]
        audio_public_id = cloud_result["public_id"]
    except Exception as e:
        raise HTTPException(500, f"Failed to upload to Cloudinary: {str(e)}")

    # Create meeting record in MongoDB
    await database.create_meeting(
        meeting_id=meeting_id,
        user_id=user_id,
        original_name=file.filename or meeting_id,
        audio_url=audio_url,
        audio_public_id=audio_public_id,
    )

    # Start ingestion in background thread (pipeline is CPU/GPU-bound)
    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, _run_ingestion, meeting_id, audio_url)

    return {
        "meeting_id": meeting_id,
        "status": "uploading",
        "audio_url": audio_url,
        "message": "Audio uploaded. Ingestion started in background.",
    }


@app.get("/api/meetings")
async def list_meetings(current_user: dict = Depends(get_current_user)):
    """List all meetings for the current user."""
    return await database.list_meetings(current_user["_id"])


@app.get("/api/meetings/{meeting_id}")
async def get_meeting(meeting_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single meeting's metadata + status."""
    meeting = await database.get_meeting(meeting_id, current_user["_id"])
    if not meeting:
        raise HTTPException(404, "Meeting not found")
    return meeting


@app.websocket("/api/ws/meetings/{meeting_id}")
async def websocket_endpoint(meeting_id: str, websocket: WebSocket, token: str = Query(...)):
    """Real-time WebSocket endpoint for meeting status updates."""
    # Authenticate via query param token
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id or payload.get("type") != "access":
            await websocket.close(code=1008)
            return
    except Exception:
        await websocket.close(code=1008)
        return

    # Accept connection
    await manager.connect(websocket, meeting_id)
    try:
        # Keep connection open and wait for client to disconnect
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, meeting_id)
    except Exception:
        manager.disconnect(websocket, meeting_id)


@app.websocket("/api/ws/stats")
async def stats_websocket_endpoint(websocket: WebSocket):
    """Real-time WebSocket endpoint for global app statistics."""
    await stats_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await stats_manager.disconnect(websocket)
    except Exception:
        await stats_manager.disconnect(websocket)


@app.get("/api/meetings/{meeting_id}/audio")
async def get_meeting_audio(meeting_id: str, token: str = Query(...)):
    """Redirect to the Cloudinary audio URL. Uses query token for native <audio> tags."""
    try:
        from auth import decode_token
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id or payload.get("type") != "access":
            raise HTTPException(401, "Invalid token")
    except Exception:
        raise HTTPException(401, "Invalid token")

    meeting = await database.get_meeting(meeting_id, user_id)
    if not meeting:
        raise HTTPException(404, "Meeting not found")

    audio_url = meeting.get("audio_url")
    if not audio_url:
        raise HTTPException(404, "Audio file not found")

    return RedirectResponse(url=audio_url)


@app.get("/api/meetings/{meeting_id}/graph")
async def get_graph(meeting_id: str, current_user: dict = Depends(get_current_user)):
    """Return Neo4j graph nodes and links for this meeting, fallback to MongoDB extractions if DB fails."""
    # Verify ownership
    meeting = await database.get_meeting(meeting_id, current_user["_id"])
    if not meeting:
        raise HTTPException(404, "Meeting not found")

    try:
        driver = get_neo4j_driver()
        query = """
        MATCH (n:Entity {meeting_id: $meeting_id})
        OPTIONAL MATCH (n)-[r]->(m:Entity {meeting_id: $meeting_id})
        RETURN n, r, m
        """
        nodes_map = {}
        links = []

        with driver.session() as session:
            result = session.run(query, meeting_id=meeting_id)
            for record in result:
                n = record["n"]
                if n and n.element_id not in nodes_map:
                    nodes_map[n.element_id] = {
                        "id": n.element_id,
                        "label": n.get("name"),
                        "group": n.get("type"),
                        "description": n.get("description")
                    }

                m = record["m"]
                r = record["r"]
                if m and r:
                    if m.element_id not in nodes_map:
                        nodes_map[m.element_id] = {
                            "id": m.element_id,
                            "label": m.get("name"),
                            "group": m.get("type"),
                            "description": m.get("description")
                        }
                    links.append({
                        "source": n.element_id,
                        "target": m.element_id,
                        "label": r.type,
                        "evidence": r.get("evidence"),
                        "confidence": r.get("confidence")
                    })

        driver.close()
        return {
            "nodes": list(nodes_map.values()),
            "links": links
        }
    except Exception as e:
        print(f"Neo4j connection failed ({e}). Falling back to MongoDB extractions...")
        import re

        extraction_doc = await database.get_extractions(meeting_id)
        if not extraction_doc:
            return {"nodes": [], "links": []}

        nodes_map = {}
        links = []
        for chunk in extraction_doc.get("extractions", []):
            for entity in chunk.get("entities", []):
                global_key = re.sub(r"\s+", " ", entity["name"].strip().lower())
                if global_key not in nodes_map:
                    nodes_map[global_key] = {
                        "id": global_key,
                        "label": entity["name"],
                        "group": entity["type"],
                        "description": entity["description"]
                    }
            for relation in chunk.get("relations", []):
                source_ent = next((e for e in chunk["entities"] if e["id"] == relation["source"]), None)
                target_ent = next((e for e in chunk["entities"] if e["id"] == relation["target"]), None)
                if source_ent and target_ent:
                    source_key = re.sub(r"\s+", " ", source_ent["name"].strip().lower())
                    target_key = re.sub(r"\s+", " ", target_ent["name"].strip().lower())
                    links.append({
                        "source": source_key,
                        "target": target_key,
                        "label": relation["relation"],
                        "evidence": relation.get("evidence"),
                        "confidence": relation.get("confidence")
                    })

        return {
            "nodes": list(nodes_map.values()),
            "links": links
        }


@app.delete("/api/meetings/{meeting_id}")
async def delete_meeting(meeting_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a meeting, its chat history, and its Cloudinary media."""
    meeting = await database.get_meeting(meeting_id, current_user["_id"])
    if not meeting:
        raise HTTPException(404, "Meeting not found")

    # Delete from Cloudinary
    audio_public_id = meeting.get("audio_public_id")
    if audio_public_id:
        cloudinary_utils.delete_audio(audio_public_id)

    # Delete from MongoDB
    await database.delete_meeting(meeting_id)
    await database.clear_chat_history(meeting_id, current_user["_id"])

    return {"status": "deleted"}


@app.post("/api/query", response_model=QueryResponse)
async def query_meeting(req: QueryRequest, current_user: dict = Depends(get_current_user)):
    """Ask a question about an ingested meeting."""
    user_id = current_user["_id"]
    meeting = await database.get_meeting(req.meeting_id, user_id)
    if not meeting:
        raise HTTPException(404, "Meeting not found")
    if meeting["status"] != "ready":
        raise HTTPException(400, f"Meeting is not ready for queries (status: {meeting['status']})")

    # Fetch recent chat history for context (last 6 messages = 3 turns)
    full_history = await database.get_chat_history(req.meeting_id, user_id)
    chat_history = []
    for msg in full_history[-6:]:
        chat_history.append({"role": msg["role"], "content": msg["content"]})

    # Save user message
    await database.add_chat_message(req.meeting_id, user_id, "user", req.question)

    # Run query pipeline
    try:
        pipeline = build_query_pipeline()
        result = pipeline.invoke({
            "question": req.question,
            "meeting_id": req.meeting_id,
            "chat_history": chat_history,
        })
        # Generate Answer returns a dict now
        ans_data = result["answer"]
        answer = ans_data["answer"]
        sources = ans_data.get("citations", [])
    except Exception as e:
        traceback.print_exc()
        answer = f"Sorry, I encountered an error while processing your question: {str(e)}"
        sources = []

    # Save assistant message
    await database.add_chat_message(req.meeting_id, user_id, "assistant", answer, sources=sources)

    return QueryResponse(answer=answer, meeting_id=req.meeting_id, question=req.question, sources=sources)


@app.get("/api/meetings/{meeting_id}/history")
async def get_history(meeting_id: str, current_user: dict = Depends(get_current_user)):
    """Get chat history for a meeting."""
    meeting = await database.get_meeting(meeting_id, current_user["_id"])
    if not meeting:
        raise HTTPException(404, "Meeting not found")
    return await database.get_chat_history(meeting_id, current_user["_id"])


@app.delete("/api/meetings/{meeting_id}/history")
async def clear_history(meeting_id: str, current_user: dict = Depends(get_current_user)):
    """Clear chat history for a meeting."""
    await database.clear_chat_history(meeting_id, current_user["_id"])
    return {"status": "cleared"}
