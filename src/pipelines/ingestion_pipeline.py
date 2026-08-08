"""
Ingestion Pipeline (LangGraph)
-------------------------------
audio -> chunking -> extraction -> graph builder. Run once per meeting recording.
"""

import os
import json

from typing import TypedDict
from langgraph.graph import StateGraph, END

from src.agents.audio_processing_agent import run_audio_processing
from src.agents.chunking_agent import chunk_transcript
from src.agents.extraction_agent import run_extraction
from src.agents.graph_builder_agent import GraphBuilder

import config


class IngestionState(TypedDict, total=False):
    audio_url: str
    meeting_id: str
    chunks_path: str
    extractions_path: str

    segments: list[dict]
    chunks: list[dict]
    extractions: list[dict]
    graph_built: bool


def audio_processing_node(state: IngestionState) -> IngestionState:
    print("[Node] Audio Processing Agent")
    # run_audio_processing now sends the file to the Modal WhisperX endpoint --
    # it no longer runs whisperx locally, so it only takes audio_path/output_path,
    # not model_size/device (those became meaningless once transcription moved to Modal).
    segments = run_audio_processing(audio_url=state["audio_url"])
    return {"segments": segments}


def chunking_node(state: IngestionState) -> IngestionState:
    print("[Node] Chunking Agent")
    chunks = chunk_transcript(state["segments"], max_tokens=config.CHUNK_MAX_TOKENS)
    chunks_path = state.get("chunks_path")
    if chunks_path:
        os.makedirs(os.path.dirname(chunks_path), exist_ok=True)
        with open(chunks_path, "w") as f:
            json.dump({"chunks": chunks}, f, indent=2)
    return {"chunks": chunks}


def extraction_node(state: IngestionState) -> IngestionState:
    print("[Node] Entity + Relation Extraction Agent")
    extractions = run_extraction(
        input_path=state.get("chunks") or state.get("chunks_path"),
        output_path=state.get("extractions_path"),
        model=config.EXTRACTION_MODEL,
    )
    return {"extractions": extractions}


def graph_builder_node(state: IngestionState) -> IngestionState:
    print("[Node] Graph Builder Agent")
    builder = GraphBuilder(config.NEO4J_URI, config.NEO4J_USERNAME, config.NEO4J_PASSWORD)
    builder.build_graph(
        extraction_file=state.get("extractions_path"),
        meeting_id=state["meeting_id"],
    )
    builder.close()
    return {"graph_built": True}


def build_ingestion_pipeline():
    graph = StateGraph(IngestionState)

    graph.add_node("audio_processing", audio_processing_node)
    graph.add_node("chunking", chunking_node)
    graph.add_node("extraction", extraction_node)
    graph.add_node("graph_builder", graph_builder_node)

    graph.set_entry_point("audio_processing")
    graph.add_edge("audio_processing", "chunking")
    graph.add_edge("chunking", "extraction")
    graph.add_edge("extraction", "graph_builder")
    graph.add_edge("graph_builder", END)

    return graph.compile()