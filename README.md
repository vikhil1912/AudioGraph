# Meeting Recording -> GraphRAG Agent

Takes a meeting recording, transcribes + diarizes it, extracts entities and
relations via LLM, builds a per-meeting Neo4j knowledge graph, and answers
natural-language questions against it (pure GraphRAG, no vector store).

## Folder structure

```
meeting-graphrag-agent/
├── .env.example          # copy to .env and fill in your keys
├── .gitignore
├── requirements.txt
├── config.py              # loads .env once; all other files import from here
├── main.py                # CLI entrypoint (ingest / query subcommands)
│
├── src/
│   ├── agents/             # one file per pipeline step -- PASTE YOUR CODE HERE
│   │   ├── audio_processing_agent.py    # WhisperX STT + diarization
│   │   ├── chunking_agent.py            # speaker-turn / token-budget chunking
│   │   ├── extraction_agent.py          # LLM entity + relation extraction
│   │   ├── graph_builder_agent.py       # dedup + write to Neo4j
│   │   ├── query_planner_agent.py       # NL question -> Cypher -> results
│   │   └── answer_generator_agent.py    # results -> natural-language answer
│   │
│   ├── pipelines/           # LangGraph StateGraphs wiring the agents together
│   │   ├── ingestion_pipeline.py   # audio -> chunk -> extract -> build graph
│   │   └── query_pipeline.py       # query planner -> answer generator
│   │
│   └── utils/                # shared helpers (empty for now)
│
├── data/
│   ├── raw_audio/         # put meeting recordings here (gitignored)
│   ├── transcripts/       # chunks.json output lands here (gitignored)
│   └── outputs/           # extractions.json, resolved graph snapshots (gitignored)
│
└── tests/                 # add tests here as you build them out
```

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env
# fill in HF_TOKEN, OPENAI_API_KEY, NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD in .env
```

Before running: accept the pyannote model licenses (required for diarization)
at huggingface.co/pyannote/speaker-diarization-community-1 and
huggingface.co/pyannote/segmentation-3.0, logged in with the account tied to
your HF_TOKEN.

## Usage

```bash
# Process a meeting recording into the graph (run once per meeting)
python main.py ingest --audio data/raw_audio/meeting.mp3 --meeting-id meeting_001

# Ask a question about it (run as many times as you want, afterward)
python main.py query --meeting-id meeting_001 --question "Who are the speakers?"
```

## Design notes

- **Per-meeting graph**: every node/relationship carries a `meeting_id`
  property, logically isolating meetings within one shared Neo4j database.
- **Open-vocabulary schema**: entity types and relation labels are inferred
  by the LLM per meeting rather than hardcoded, so the graph shape adapts to
  what's actually discussed instead of assuming a fixed business-meeting schema.
- **Pure GraphRAG**: no vector store. The query planner reads the graph's
  actual schema (labels + relationship patterns) before generating Cypher, so
  it never guesses at label names that don't exist.
