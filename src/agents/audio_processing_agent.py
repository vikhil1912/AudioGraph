"""
Audio Processing Agent

This agent NEVER performs transcription locally.

Flow:
Local App
    ↓
Modal WhisperX GPU
    ↓
Returns speaker-aware transcript
"""

import os
import json
import requests

import config


def run_audio_processing(
    audio_url: str,
    output_path: str = "transcript.json",
):
    modal_url = (
        getattr(config, "MODAL_TRANSCRIBE_URL", None)
        or os.environ.get("MODAL_TRANSCRIBE_URL")
    )

    if not modal_url:
        raise RuntimeError(
            "MODAL_TRANSCRIBE_URL is not configured."
        )

    print(f"[Audio Agent] Sending audio URL to Modal WhisperX endpoint...")

    response = requests.post(
        modal_url,
        json={"audio_url": audio_url},
        timeout=1800,
    )

    response.raise_for_status()

    data = response.json()

    segments = data["segments"]

    with open(output_path, "w") as f:
        json.dump(
            {
                "language": "en",
                "segments": segments,
            },
            f,
            indent=2,
        )

    print(f"Done. {len(segments)} segments written to {output_path}")

    return segments