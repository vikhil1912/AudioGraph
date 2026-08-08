"""
Central configuration. Loads .env once; every agent/pipeline imports from here
instead of calling os.environ directly, so there's one place to change defaults.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# --- API keys / tokens ---
HF_TOKEN = os.environ.get("HF_TOKEN")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
MODAL_TRANSCRIBE_URL = os.environ.get("MODAL_TRANSCRIBE_URL")


# --- Neo4j AuraDB ---
NEO4J_URI = os.environ.get("NEO4J_URI")
NEO4J_USERNAME = os.environ.get("NEO4J_USERNAME")
NEO4J_PASSWORD = os.environ.get("NEO4J_PASSWORD")

# --- MongoDB ---
MONGODB_URI = os.environ.get("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.environ.get("MONGODB_DB_NAME", "meeting_graphrag")

# --- JWT ---
JWT_SECRET = os.environ.get("JWT_SECRET", "change-me-in-production-please")

# --- Cloudinary ---
CLOUDINARY_CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY = os.environ.get("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.environ.get("CLOUDINARY_API_SECRET")

# --- Email / Gmail ---
GMAIL_USER = os.environ.get("GMAIL_USER")
GMAIL_APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD")

# --- Model defaults ---
WHISPER_MODEL_SIZE = "large-v3"
DEVICE = "cuda"  # falls back to "cpu" automatically in audio_processing_agent if unavailable
EXTRACTION_MODEL = "gpt-4o-mini"
CHUNK_MAX_TOKENS = 700

# --- Paths (kept for backward compat with ingestion pipeline temp files) ---
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
RAW_AUDIO_DIR = os.path.join(DATA_DIR, "raw_audio")
TRANSCRIPTS_DIR = os.path.join(DATA_DIR, "transcripts")
OUTPUTS_DIR = os.path.join(DATA_DIR, "outputs")


def require(*names):
    """Call at the start of a script to fail fast with a clear error if required config is missing."""
    missing = [n for n in names if not globals().get(n)]
    if missing:
        raise RuntimeError(f"Missing required config: {', '.join(missing)}. Check your .env file.")
