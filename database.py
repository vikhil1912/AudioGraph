"""
MongoDB persistence for users, meetings, chat history, transcripts, and extractions.
Uses motor for async operations and pymongo for sync operations (used in background threads).
"""

import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.environ.get("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.environ.get("MONGODB_DB_NAME", "meeting_graphrag")

# Async client (for FastAPI endpoints)
_async_client = None
_async_db = None

# Sync client (for background thread operations like ingestion pipeline)
_sync_client = None
_sync_db = None


def get_async_db():
    global _async_client, _async_db
    if _async_db is None:
        _async_client = AsyncIOMotorClient(MONGODB_URI)
        _async_db = _async_client[DB_NAME]
    return _async_db


def get_sync_db():
    global _sync_client, _sync_db
    if _sync_db is None:
        _sync_client = MongoClient(MONGODB_URI)
        _sync_db = _sync_client[DB_NAME]
    return _sync_db


async def init_db():
    """Create indexes on startup."""
    db = get_async_db()
    await db.users.create_index("email", unique=True)
    await db.meetings.create_index([("user_id", 1), ("created_at", -1)])
    await db.chat_history.create_index([("meeting_id", 1), ("created_at", 1)])
    await db.transcripts.create_index("meeting_id", unique=True)
    await db.extractions.create_index("meeting_id", unique=True)
    await db.refresh_tokens.create_index("token", unique=True)
    await db.refresh_tokens.create_index("user_id")


async def close_db():
    global _async_client, _sync_client
    if _async_client:
        _async_client.close()
    if _sync_client:
        _sync_client.close()


# ── Users ────────────────────────────────────────────────────────────────────

async def create_user(email: str, password_hash: str) -> dict:
    db = get_async_db()
    doc = {
        "email": email,
        "password_hash": password_hash,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


async def get_user_by_email(email: str) -> dict | None:
    db = get_async_db()
    doc = await db.users.find_one({"email": email})
    if doc:
        doc["_id"] = str(doc["_id"])
    return doc


async def get_user_by_id(user_id: str) -> dict | None:
    from bson import ObjectId
    db = get_async_db()
    try:
        doc = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        return None
    if doc:
        doc["_id"] = str(doc["_id"])
    return doc


async def count_users() -> int:
    db = get_async_db()
    return await db.users.count_documents({})


# ── Refresh Tokens ──────────────────────────────────────────────────────────

async def store_refresh_token(user_id: str, token: str, expires_at: str):
    db = get_async_db()
    await db.refresh_tokens.insert_one({
        "user_id": user_id,
        "token": token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


async def get_refresh_token(token: str) -> dict | None:
    db = get_async_db()
    return await db.refresh_tokens.find_one({"token": token})


async def delete_refresh_token(token: str):
    db = get_async_db()
    await db.refresh_tokens.delete_one({"token": token})


async def delete_user_refresh_tokens(user_id: str):
    db = get_async_db()
    await db.refresh_tokens.delete_many({"user_id": user_id})


# ── Meetings (Async — for FastAPI endpoints) ─────────────────────────────────

async def create_meeting(meeting_id: str, user_id: str, original_name: str, audio_url: str, audio_public_id: str) -> dict:
    db = get_async_db()
    doc = {
        "meeting_id": meeting_id,
        "user_id": user_id,
        "original_name": original_name,
        "audio_url": audio_url,
        "audio_public_id": audio_public_id,
        "status": "uploading",
        "error_message": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.meetings.insert_one(doc)
    doc.pop("_id", None)
    return doc


async def get_meeting(meeting_id: str, user_id: str = None) -> dict | None:
    db = get_async_db()
    query = {"meeting_id": meeting_id}
    if user_id:
        query["user_id"] = user_id
    doc = await db.meetings.find_one(query)
    if doc:
        doc.pop("_id", None)
    return doc


async def list_meetings(user_id: str) -> list[dict]:
    db = get_async_db()
    cursor = db.meetings.find({"user_id": user_id}).sort("created_at", -1)
    results = []
    async for doc in cursor:
        doc.pop("_id", None)
        results.append(doc)
    return results


async def update_meeting_status(meeting_id: str, status: str, error_message: str | None = None):
    db = get_async_db()
    update = {"$set": {"status": status, "error_message": error_message}}
    await db.meetings.update_one({"meeting_id": meeting_id}, update)


async def delete_meeting(meeting_id: str):
    db = get_async_db()
    await db.meetings.delete_one({"meeting_id": meeting_id})


# ── Meetings (Sync — for background ingestion thread) ───────────────────────

def sync_update_meeting_status(meeting_id: str, status: str, error_message: str | None = None):
    db = get_sync_db()
    db.meetings.update_one(
        {"meeting_id": meeting_id},
        {"$set": {"status": status, "error_message": error_message}}
    )


def sync_get_meeting(meeting_id: str) -> dict | None:
    db = get_sync_db()
    doc = db.meetings.find_one({"meeting_id": meeting_id})
    if doc:
        doc.pop("_id", None)
    return doc

def sync_get_user_email_by_meeting(meeting_id: str) -> str | None:
    db = get_sync_db()
    meeting = db.meetings.find_one({"meeting_id": meeting_id})
    if not meeting:
        return None
    user_id = meeting.get("user_id")
    if not user_id:
        return None
    from bson import ObjectId
    try:
        user = db.users.find_one({"_id": ObjectId(user_id)})
        if user:
            return user.get("email")
    except Exception:
        pass
    return None


# ── Chat History ─────────────────────────────────────────────────────────────

async def add_chat_message(meeting_id: str, user_id: str, role: str, content: str, sources: list = None) -> dict:
    import uuid
    db = get_async_db()
    doc = {
        "msg_id": uuid.uuid4().hex,
        "meeting_id": meeting_id,
        "user_id": user_id,
        "role": role,
        "content": content,
        "sources": sources or [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.chat_history.insert_one(doc)
    doc.pop("_id", None)
    return doc


async def get_chat_history(meeting_id: str, user_id: str = None) -> list[dict]:
    db = get_async_db()
    query = {"meeting_id": meeting_id}
    # We do not filter by user_id here because legacy chats might not have it,
    # and meeting ownership is already verified at the API route level.
    cursor = db.chat_history.find(query).sort("created_at", 1)
    results = []
    async for doc in cursor:
        doc.pop("_id", None)
        results.append(doc)
    return results


async def clear_chat_history(meeting_id: str, user_id: str = None):
    db = get_async_db()
    query = {"meeting_id": meeting_id}
    await db.chat_history.delete_many(query)


# ── Transcripts ──────────────────────────────────────────────────────────────

def sync_save_transcript(meeting_id: str, chunks: list[dict]):
    db = get_sync_db()
    db.transcripts.update_one(
        {"meeting_id": meeting_id},
        {"$set": {"meeting_id": meeting_id, "chunks": chunks}},
        upsert=True,
    )


async def get_transcript(meeting_id: str) -> dict | None:
    db = get_async_db()
    doc = await db.transcripts.find_one({"meeting_id": meeting_id})
    if doc:
        doc.pop("_id", None)
    return doc


# ── Extractions ──────────────────────────────────────────────────────────────

def sync_save_extractions(meeting_id: str, extractions: list[dict]):
    db = get_sync_db()
    db.extractions.update_one(
        {"meeting_id": meeting_id},
        {"$set": {"meeting_id": meeting_id, "extractions": extractions}},
        upsert=True,
    )


async def get_extractions(meeting_id: str) -> dict | None:
    db = get_async_db()
    doc = await db.extractions.find_one({"meeting_id": meeting_id})
    if doc:
        doc.pop("_id", None)
    return doc
