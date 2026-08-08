"""
Modal deployment for the meeting-graphrag-agent pipeline.

Place this file at the PROJECT ROOT (same level as config.py, main.py, src/),
so add_local_dir below can bundle your real agent code and config.py into
the Modal image -- no code duplication, no separate copy to maintain.

Deploy with:
  modal deploy modal_app.py

Creates two public HTTPS endpoints:
  POST /ingest  -- GPU function: audio -> chunks -> extraction -> graph
  POST /query   -- CPU-only function: query planner -> answer generator

Both scale to zero when idle -- you only pay while a request is running.
"""

import modal

app = modal.App("meeting-graphrag-agent")

# Bundle your actual project code into the image: config.py at the project
# root, plus everything under src/. remote_path="/root/app" puts them at a
# known location we add to sys.path inside each function.
PROJECT_LOCAL_DIR = "."
PROJECT_REMOTE_DIR = "/root/app"

gpu_image_base = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install(
        "whisperx",
        "torch",
        "openai",
        "neo4j",
        "tiktoken",
        "python-dotenv",
        "fastapi[standard]",
    )
)

cpu_image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install("openai", "neo4j", "python-dotenv", "fastapi[standard]")
    .add_local_dir(PROJECT_LOCAL_DIR, remote_path=PROJECT_REMOTE_DIR)
)

secrets = [modal.Secret.from_name("meeting-graph-secrets")]


from pydantic import BaseModel
import urllib.request

class TranscribeRequest(BaseModel):
    audio_url: str

def _add_project_to_path():
    """Run inside each Modal function before importing your agent code --
    puts the bundled project root AND src/agents on sys.path so both
    `import config` and `from audio_processing_agent import ...` resolve."""
    import sys
    sys.path.insert(0, PROJECT_REMOTE_DIR)
    sys.path.insert(0, f"{PROJECT_REMOTE_DIR}/src/agents")


def download_models():
    import os
    import whisperx
    
    hf_token = os.environ.get("HF_TOKEN")
    
    print("[Build] Downloading WhisperX large-v3...")
    whisperx.load_model("large-v3", device="cpu", compute_type="int8")
    
    if hf_token:
        print("[Build] Downloading Pyannote diarization models...")
        whisperx.diarize.DiarizationPipeline(token=hf_token, device="cpu")
    else:
        print("[Build] WARNING: HF_TOKEN not found. Diarization models will download at runtime.")
        
    print("[Build] Downloading EN alignment models...")
    whisperx.load_align_model(language_code="en", device="cpu")

gpu_image = (
    gpu_image_base
    .run_function(download_models, secrets=secrets)
    .add_local_dir(PROJECT_LOCAL_DIR, remote_path=PROJECT_REMOTE_DIR)
)

@app.cls(image=gpu_image, gpu="T4", secrets=secrets, timeout=1800)
class Transcriber:

    @modal.enter()
    def setup(self):
        _add_project_to_path()
        import whisperx
        import config
        
        self.device = "cuda"
        self.compute_type = "float16"
        self.hf_token = config.HF_TOKEN
        
        if not self.hf_token:
            raise RuntimeError("HF_TOKEN is not configured")
        
        print("[Setup] Loading WhisperX model into VRAM...")
        self.model = whisperx.load_model("large-v3", device=self.device, compute_type=self.compute_type)
        
        print("[Setup] Loading Diarization model into VRAM...")
        self.diarize_model = whisperx.diarize.DiarizationPipeline(token=self.hf_token, device=self.device)
        
        print("[Setup] Loading EN Alignment model into VRAM...")
        self.align_model, self.align_metadata = whisperx.load_align_model(language_code="en", device=self.device)

    @modal.fastapi_endpoint(method="POST")
    def transcribe(self, req: TranscribeRequest):
        import urllib.request
        import whisperx

        local_audio_path = "/tmp/audio.wav"
        print(f"[0/4] Downloading audio from {req.audio_url}...")
        urllib.request.urlretrieve(req.audio_url, local_audio_path)

        print("[1/4] Loading audio...")
        audio = whisperx.load_audio(local_audio_path)

        print("[2/4] Transcribing...")
        result = self.model.transcribe(audio, batch_size=16)
        language = result["language"]

        print("[3/4] Aligning...")
        if language == "en":
            a_model, a_metadata = self.align_model, self.align_metadata
        else:
            a_model, a_metadata = whisperx.load_align_model(language_code=language, device=self.device)

        result = whisperx.align(
            result["segments"],
            a_model,
            a_metadata,
            audio,
            self.device,
            return_char_alignments=False,
        )

        print("[4/4] Running diarization...")
        diarize_segments = self.diarize_model(audio)
        result = whisperx.assign_word_speakers(diarize_segments, result)

        segments = []
        for seg in result["segments"]:
            segments.append({
                "speaker": seg.get("speaker", "UNKNOWN"),
                "start": round(seg["start"], 2),
                "end": round(seg["end"], 2),
                "text": seg["text"].strip(),
            })

        return {"segments": segments}

@app.function(image=gpu_image, gpu="T4", secrets=secrets, timeout=1800)
@modal.fastapi_endpoint(method="POST")
def ingest(audio_url: str, meeting_id: str):

    _add_project_to_path()

    import os
    import json
    import urllib.request

    from audio_processing_agent import run_audio_processing
    from chunking_agent import chunk_transcript
    from extraction_agent import run_extraction
    from graph_builder_agent import GraphBuilder

    local_audio_path = "/tmp/meeting_audio"
    urllib.request.urlretrieve(audio_url, local_audio_path)

    segments = run_audio_processing(local_audio_path, device="cuda")
    chunks = chunk_transcript(segments)

    with open("/tmp/chunks.json", "w") as f:
        json.dump({"chunks": chunks}, f)

    run_extraction("/tmp/chunks.json", "/tmp/extractions.json")

    builder = GraphBuilder(
        os.environ["NEO4J_URI"], os.environ["NEO4J_USERNAME"], os.environ["NEO4J_PASSWORD"]
    )
    builder.build_graph("/tmp/extractions.json", meeting_id)
    builder.close()

    return {"status": "done", "meeting_id": meeting_id, "num_segments": len(segments)}


@app.function(image=cpu_image, secrets=secrets, timeout=120)
@modal.fastapi_endpoint(method="POST")
def query(question: str, meeting_id: str):
    _add_project_to_path()

    import os
    from query_planner_agent import query_graph
    from answer_generator_agent import generate_answer

    query_result = query_graph(
        question=question,
        meeting_id=meeting_id,
        uri=os.environ["NEO4J_URI"],
        username=os.environ["NEO4J_USERNAME"],
        password=os.environ["NEO4J_PASSWORD"],
    )
    answer = generate_answer(question, query_result)

    return {"question": question, "answer": answer}