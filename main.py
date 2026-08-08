"""
CLI entrypoint.

Usage:
  python main.py ingest --audio data/raw_audio/meeting.mp3 --meeting-id meeting_001
  python main.py query --meeting-id meeting_001 --question "Who are the speakers?"
"""

import argparse
import os

import config
from src.pipelines.ingestion_pipeline import build_ingestion_pipeline
from src.pipelines.query_pipeline import build_query_pipeline


def cmd_ingest(args):
    config.require("HF_TOKEN", "OPENAI_API_KEY", "NEO4J_URI", "NEO4J_USERNAME", "NEO4J_PASSWORD")

    meeting_stem = os.path.splitext(os.path.basename(args.audio))[0]
    chunks_path = os.path.join(config.TRANSCRIPTS_DIR, f"{meeting_stem}_chunks.json")
    extractions_path = os.path.join(config.OUTPUTS_DIR, f"{meeting_stem}_extractions.json")

    pipeline = build_ingestion_pipeline()
    final_state = pipeline.invoke({
        "audio_path": args.audio,
        "meeting_id": args.meeting_id,
        "chunks_path": chunks_path,
        "extractions_path": extractions_path,
    })

    print(f"\nIngestion complete for meeting_id='{args.meeting_id}'.")
    print(f"  Chunks: {chunks_path}")
    print(f"  Extractions: {extractions_path}")
    print(f"  Graph built: {final_state.get('graph_built')}")


def cmd_query(args):
    config.require("OPENAI_API_KEY", "NEO4J_URI", "NEO4J_USERNAME", "NEO4J_PASSWORD")

    pipeline = build_query_pipeline()
    result = pipeline.invoke({
        "question": args.question,
        "meeting_id": args.meeting_id,
    })

    print(f"\nQ: {args.question}")
    print(f"A: {result['answer']}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Meeting -> GraphRAG pipeline")
    subparsers = parser.add_subparsers(dest="command", required=True)

    ingest_parser = subparsers.add_parser("ingest", help="Process a meeting recording into the graph")
    ingest_parser.add_argument("--audio", required=True, help="Path to the meeting recording")
    ingest_parser.add_argument("--meeting-id", required=True)
    ingest_parser.set_defaults(func=cmd_ingest)

    query_parser = subparsers.add_parser("query", help="Ask a question about an ingested meeting")
    query_parser.add_argument("--meeting-id", required=True)
    query_parser.add_argument("--question", required=True)
    query_parser.set_defaults(func=cmd_query)

    args = parser.parse_args()
    args.func(args)
