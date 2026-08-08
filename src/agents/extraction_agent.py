"""
Entity + Relation Extraction Agent
-----------------------------------
Step 3 of the meeting-graph pipeline.

Input:  chunks.json from the Chunking Agent
Output: per-chunk entities + relations, saved as JSON.
        One structured-output OpenAI call per chunk (entities + relations
        together, to avoid duplicating context across two calls).

Open-vocabulary: entity types and relation labels are inferred by the LLM
per meeting, not from a fixed schema.

Requires:
  pip install openai
  OPENAI_API_KEY set in .env
"""

import os
import json
from openai import OpenAI


import config

client = OpenAI(api_key=config.OPENAI_API_KEY)

SYSTEM_PROMPT = """
You are an expert Knowledge Graph Extraction Agent.

Your task is to convert a meeting transcript chunk into a semantic knowledge graph.

Your goal is NOT to extract every noun or every sentence.

Your goal is to preserve the knowledge contained in the conversation so that the graph can later answer natural language questions.

Think like a knowledge engineer rather than an information extractor.

----------------------------------------
ENTITY EXTRACTION
----------------------------------------

Extract ONLY entities that carry meaningful information.

Good examples include:

• Person
• Organization
• Team
• Project
• Product
• Technology
• Tool
• Library
• API
• Programming Language
• Framework
• Website
• Platform
• Service
• Database
• Model
• Document
• Meeting
• Decision
• Task
• Action Item
• Requirement
• Issue
• Risk
• Goal
• Concept
• Topic
• Expression
• Idiom
• Event
• Location
• Date
• Metric
• Resource

Do NOT extract generic nouns that have little standalone meaning.

Bad examples:

chair
table
room
thing
question
example
sentence
noun
person
someone
everything

----------------------------------------
ENTITY DESCRIPTION
----------------------------------------

For every entity provide a concise description based ONLY on the transcript.

Do not use outside knowledge.

----------------------------------------
RELATION EXTRACTION
----------------------------------------

Extract relationships that represent meaningful knowledge.

Avoid generic relations such as:

RELATED_TO
MENTIONS

Prefer semantic relations.

Examples include:

EXPLAINS
DEFINES
MEANS
USES
WORKS_WITH
IMPLEMENTS
DEPENDS_ON
CAUSES
BLOCKS
PRODUCES
CONSUMES
HOSTS
PART_OF
CONTAINS
FEATURES
AVAILABLE_AT
LOCATED_IN
ASSIGNED_TO
REQUESTED_BY
APPROVED_BY
CREATED_BY
OWNS
LEADS
INTRODUCES
RECOMMENDS
COMPARES_WITH
HAS_RESOURCE
HAS_EXAMPLE
EXAMPLE_OF
SUPPORTS
REQUIRES
DISCUSSES
REFERENCES

You may generate other relationship names if they better capture the meaning.

Relationship names should be concise.

----------------------------------------
DEFINITIONS
----------------------------------------

Whenever the speaker defines something,
capture it explicitly.

Example

Redis
IS_A
In-memory database

or

"keep yourself to yourself"
MEANS
"prefers not to socialize"

----------------------------------------
EXAMPLES
----------------------------------------

If a speaker gives an example of a concept,
connect it.

Example

Office neighbour

EXAMPLE_OF

keep yourself to yourself

----------------------------------------
SPEAKER INTERACTIONS
----------------------------------------

Capture meaningful interactions.

Examples:

ASKS

ANSWERS

EXPLAINS

CORRECTS

AGREES_WITH

DISAGREES_WITH

CLARIFIES

QUESTIONED_BY

----------------------------------------
HIERARCHIES
----------------------------------------

Capture hierarchical relationships.

Example

BBC Learning English

HAS_PROGRAM

The English We Speak

----------------------------------------
TASKS
----------------------------------------

If the meeting contains tasks, capture:

ASSIGNED_TO

DEPENDS_ON

DUE_ON

BLOCKED_BY

STATUS

----------------------------------------
DECISIONS
----------------------------------------

Capture decisions and approvals.

----------------------------------------
CAUSE AND EFFECT
----------------------------------------

Capture causal relationships whenever stated.

----------------------------------------
COREFERENCE
----------------------------------------

Resolve pronouns whenever obvious.

Example

"He"

↓

"John"

----------------------------------------
NORMALIZATION
----------------------------------------

Use the exact entity names from the transcript.

Do not invent names.

Do not merge different entities.

Do not use outside knowledge.

----------------------------------------
CONFIDENCE
----------------------------------------

Assign a confidence score between 0 and 1 for every relationship.

----------------------------------------
OUTPUT QUALITY
----------------------------------------

Return only facts supported by the transcript.

If uncertain, omit the entity or relationship.

It is better to miss a relation than to invent one.

The graph should maximize its usefulness for future question answering.

"""

EXTRACTION_SCHEMA = {
    "type": "object",
    "properties": {
        "entities": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "name": {"type": "string"},
                    "type": {
                        "type": "string",
                        "description": "Semantic type inferred from the transcript."
                    },
                    "description": {"type": "string"}
                },
                "required": ["id", "name", "type", "description"],
                "additionalProperties": False
            }
        },
        "relations": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "source": {"type": "string"},
                    "relation": {
                        "type": "string",
                        "description": "Semantic relationship inferred from the transcript."
                    },
                    "target": {"type": "string"},
                    "evidence": {"type": "string"},
                    "confidence": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 1
                    }
                },
                "required": ["source", "relation", "target", "evidence", "confidence"],
                "additionalProperties": False
            }
        }
    },
    "required": ["entities", "relations"],
    "additionalProperties": False
}




def extract_from_chunk(
    previous_chunk: dict | None,
    current_chunk: dict,
    next_chunk: dict | None,
    model: str = "gpt-4o-mini",
) -> dict:

    previous_text = ""
    previous_speaker = ""

    if previous_chunk:
        previous_text = previous_chunk["text"]
        previous_speaker = previous_chunk["speaker"]

    next_text = ""
    next_speaker = ""

    if next_chunk:
        next_text = next_chunk["text"]
        next_speaker = next_chunk["speaker"]

    user_content = f"""
You are given three consecutive transcript chunks.

The PREVIOUS and NEXT chunks are provided ONLY for context.

Use them to:
- resolve pronouns
- resolve references
- understand incomplete sentences
- understand explanations spanning chunk boundaries

DO NOT extract entities, facts, or relationships that are supported ONLY by the previous or next chunks.

Extract ONLY the knowledge that is explicitly stated or clearly supported by the CURRENT chunk.

If surrounding chunks help identify what "he", "she", "it", "they", "this", or "that" refers to, use that information.

------------------------
Previous Chunk
------------------------
Speaker: {previous_speaker}

{previous_text}

------------------------
Current Chunk
------------------------
Speaker: {current_chunk["speaker"]}

{current_chunk["text"]}

------------------------
Next Chunk
------------------------
Speaker: {next_speaker}

{next_text}
"""

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "entity_relation_extraction",
                "schema": EXTRACTION_SCHEMA,
                "strict": True,
            },
        },
    )

    result = json.loads(response.choices[0].message.content)

    result["chunk_speaker"] = current_chunk["speaker"]
    result["chunk_start"] = current_chunk["start"]
    result["chunk_end"] = current_chunk["end"]
    result["chunk_text"] = current_chunk["text"]

    return result


from concurrent.futures import ThreadPoolExecutor, as_completed

def _process_chunk_with_index(i: int, chunks: list[dict], model: str) -> tuple[int, dict]:
    """Helper to process a single chunk and return its original index for sorting."""
    print(
        f"[{i+1}/{len(chunks)}] Extracting from chunk "
        f"({chunks[i]['speaker']}, {chunks[i]['start']}-{chunks[i]['end']}s)..."
    )

    previous_chunk = chunks[i - 1] if i > 0 else None
    next_chunk = chunks[i + 1] if i < len(chunks) - 1 else None

    try:
        result = extract_from_chunk(
            previous_chunk,
            chunks[i],
            next_chunk,
            model=model,
        )
        return (i, result)
    except Exception as e:
        print(f"ERROR on chunk {i}: {e}")
        return (i, {
            "entities": [],
            "relations": [],
            "chunk_speaker": chunks[i]["speaker"],
            "chunk_start": chunks[i]["start"],
            "chunk_end": chunks[i]["end"],
            "chunk_text": chunks[i]["text"],
            "error": str(e),
        })

def run_extraction(
    input_path: str | list[dict],
    output_path: str = "extractions.json",
    model: str = "gpt-4o-mini",
    max_workers: int = 15,
):

    if isinstance(input_path, list):
        chunks = input_path
    elif isinstance(input_path, str):
        with open(input_path) as f:
            data = json.load(f)
        chunks = data["chunks"] if isinstance(data, dict) and "chunks" in data else data
    else:
        chunks = []

    # Process in parallel using a thread pool
    results_with_index = []
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [
            executor.submit(_process_chunk_with_index, i, chunks, model)
            for i in range(len(chunks))
        ]
        
        for future in as_completed(futures):
            results_with_index.append(future.result())

    # Sort results back into their original chronological order
    results_with_index.sort(key=lambda x: x[0])
    extractions = [res[1] for res in results_with_index]

    if output_path:
        directory = os.path.dirname(output_path)
        if directory:
            os.makedirs(directory, exist_ok=True)
        with open(output_path, "w") as f:
            json.dump({"extractions": extractions}, f, indent=2)

    total_entities = sum(len(e.get("entities", [])) for e in extractions)
    total_relations = sum(len(e.get("relations", [])) for e in extractions)

    print(
        f"Done. {total_entities} entities, "
        f"{total_relations} relations across "
        f"{len(chunks)} chunks -> {output_path}"
    )

    return extractions
