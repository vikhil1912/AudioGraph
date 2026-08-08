"""
Lightweight SQLite persistence for meeting metadata and chat history.

Tables:
  meetings     — id, filename, original_name, status, created_at
  chat_history — id, meeting_id, role, content, created_at
"""

import sqlite3
import os
import uuid
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "app.db")


def _connect():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Create tables if they don't exist."""
    conn = _connect()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS meetings (
            id            TEXT PRIMARY KEY,
            filename      TEXT NOT NULL,
            original_name TEXT NOT NULL,
            status        TEXT NOT NULL DEFAULT 'uploading',
            error_message TEXT,
            created_at    TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS chat_history (
            id          TEXT PRIMARY KEY,
            meeting_id  TEXT NOT NULL,
            role        TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
            content     TEXT NOT NULL,
            created_at  TEXT NOT NULL,
            FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_chat_meeting ON chat_history(meeting_id, created_at);
    """)
    conn.close()


# ── Meetings ────────────────────────────────────────────────────────────────

def create_meeting(meeting_id: str, filename: str, original_name: str) -> dict:
    conn = _connect()
    now = datetime.now(timezone.utc).isoformat()
    conn.execute(
        "INSERT INTO meetings (id, filename, original_name, status, created_at) VALUES (?, ?, ?, 'uploading', ?)",
        (meeting_id, filename, original_name, now),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM meetings WHERE id = ?", (meeting_id,)).fetchone()
    conn.close()
    return dict(row)


def update_meeting_status(meeting_id: str, status: str, error_message: str | None = None):
    conn = _connect()
    conn.execute(
        "UPDATE meetings SET status = ?, error_message = ? WHERE id = ?",
        (status, error_message, meeting_id),
    )
    conn.commit()
    conn.close()


def get_meeting(meeting_id: str) -> dict | None:
    conn = _connect()
    row = conn.execute("SELECT * FROM meetings WHERE id = ?", (meeting_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def list_meetings() -> list[dict]:
    conn = _connect()
    rows = conn.execute("SELECT * FROM meetings ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def delete_meeting(meeting_id: str):
    conn = _connect()
    conn.execute("DELETE FROM meetings WHERE id = ?", (meeting_id,))
    conn.commit()
    conn.close()


# ── Chat History ────────────────────────────────────────────────────────────

def add_chat_message(meeting_id: str, role: str, content: str) -> dict:
    conn = _connect()
    msg_id = uuid.uuid4().hex
    now = datetime.now(timezone.utc).isoformat()
    conn.execute(
        "INSERT INTO chat_history (id, meeting_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
        (msg_id, meeting_id, role, content, now),
    )
    conn.commit()
    conn.close()
    return {"id": msg_id, "meeting_id": meeting_id, "role": role, "content": content, "created_at": now}


def get_chat_history(meeting_id: str) -> list[dict]:
    conn = _connect()
    rows = conn.execute(
        "SELECT * FROM chat_history WHERE meeting_id = ? ORDER BY created_at ASC",
        (meeting_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def clear_chat_history(meeting_id: str):
    conn = _connect()
    conn.execute("DELETE FROM chat_history WHERE meeting_id = ?", (meeting_id,))
    conn.commit()
    conn.close()
