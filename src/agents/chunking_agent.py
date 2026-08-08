"""
Chunking Agent
--------------
Step 2 of the meeting-graph pipeline.

Input:  transcript.json from the Audio Processing Agent
        (list of {speaker, start, end, text} segments)
Output: list of chunks, each merging consecutive same-speaker segments
        up to a token budget, preserving speaker(s) + time range.

Requires:
  pip install tiktoken   # for accurate token counting; falls back to word count if unavailable
"""

import json

try:
    import tiktoken
    _ENC = tiktoken.get_encoding("cl100k_base")

    def count_tokens(text: str) -> int:
        return len(_ENC.encode(text))
except ImportError:
    def count_tokens(text: str) -> int:
        return int(len(text.split()) * 1.3)


def chunk_transcript(
    segments: list[dict],
    max_tokens: int = 700,
    min_tokens: int = 50,
):
    chunks = []
    current = None

    def flush(c):
        if c is not None:
            chunks.append(
                {
                    "speaker": c["speaker"],
                    "start": c["start"],
                    "end": c["end"],
                    "text": c["text"].strip(),
                }
            )

    for seg in segments:
        seg_tokens = count_tokens(seg["text"])

        if current is None:
            current = {
                "speaker": seg["speaker"],
                "start": seg["start"],
                "end": seg["end"],
                "text": seg["text"],
                "tokens": seg_tokens,
            }
            continue

        same_speaker = seg["speaker"] == current["speaker"]
        would_fit = current["tokens"] + seg_tokens <= max_tokens

        if same_speaker and would_fit:
            current["text"] += " " + seg["text"]
            current["end"] = seg["end"]
            current["tokens"] += seg_tokens
        elif not same_speaker and current["tokens"] < min_tokens:
            current["text"] += f"\n[{seg['speaker']}]: " + seg["text"]
            current["end"] = seg["end"]
            current["tokens"] += seg_tokens
            current["speaker"] = "MULTIPLE"
        else:
            flush(current)
            current = {
                "speaker": seg["speaker"],
                "start": seg["start"],
                "end": seg["end"],
                "text": seg["text"],
                "tokens": seg_tokens,
            }

    flush(current)
    return chunks


def run_chunking(input_path: str, output_path: str = "chunks.json", max_tokens: int = 700):
    with open(input_path) as f:
        data = json.load(f)

    segments = data["segments"] if "segments" in data else data
    chunks = chunk_transcript(segments, max_tokens=max_tokens)

    with open(output_path, "w") as f:
        json.dump({"chunks": chunks}, f, indent=2)

    print(f"{len(segments)} segments -> {len(chunks)} chunks written to {output_path}")
    return chunks
