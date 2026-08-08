"""
Query Planner Agent
--------------------
Step 7 of the meeting-graph pipeline.

Since the graph schema is open-vocabulary (LLM-derived per meeting, no
fixed labels), this agent first reads back the ACTUAL labels/relationship
types/properties present for a given meeting_id, then has the LLM write
Cypher against that real schema -- it never guesses at label names.

Safety: the LLM only ever gets to propose a query. Before running it:
  1. It's rejected if it contains any write/admin keyword (CREATE, MERGE,
     DELETE, SET, REMOVE, DROP, CALL {apoc/db admin procs}, LOAD CSV, etc.)
  2. It's executed in a Neo4j READ-mode session as defense in depth, so
     even a write query that slipped past the keyword check would be
     rejected by the driver/server itself.

Requires:
  pip install neo4j openai
  NEO4J_URI / NEO4J_USERNAME / NEO4J_PASSWORD / OPENAI_API_KEY set in .env
"""

import re
import json
from neo4j import GraphDatabase, READ_ACCESS
from openai import OpenAI

import config

client = OpenAI(api_key=config.OPENAI_API_KEY)

FORBIDDEN_PATTERN = re.compile(
    r"\b(CREATE|MERGE|DELETE|SET|REMOVE|DROP|DETACH|LOAD\s+CSV|CALL\s+apoc\.|CALL\s+db\.\w*\.(create|drop))\b",
    re.IGNORECASE,
)

CYPHER_SCHEMA = {
    "type": "object",
    "properties": {
        "cypher": {"type": "string", "description": "A single read-only Cypher query"},
        "explanation": {"type": "string", "description": "One sentence on what this query retrieves"},
    },
    "required": ["cypher", "explanation"],
    "additionalProperties": False,
}

SYSTEM_PROMPT = """You translate a natural-language question into a single
READ-ONLY Cypher query against a Neo4j graph built from one meeting's
transcript.

You will be given the ACTUAL node labels, relationship types, and node
properties that exist for this meeting -- only use labels/types from that
list, never invent one.

If recent chat history is provided, use it to resolve pronouns (e.g., 'he', 'it', 'that feature') or implied context in the current question before formulating the query.

Rules:
- Always filter on meeting_id (given to you) on every node pattern, e.g.
  (n:SomeLabel {meeting_id: $meeting_id})
- Only write MATCH / WHERE / RETURN / ORDER BY / LIMIT clauses. Never write,
  create, delete, or modify anything.
- If the question doesn't map to a specific entity, use a broad MATCH
  (e.g. return all nodes/relationships for this meeting) rather than
  guessing at a name.
- Use $meeting_id as a query parameter (already bound), not a literal string.
- Prefer including node names, types(descriptions), and relationship types
  in the RETURN clause so there's enough info to answer the question.
- Add a reasonable LIMIT (e.g. 50) to avoid huge result sets.
"""


def get_meeting_schema(driver, meeting_id: str) -> dict:
    with driver.session(default_access_mode=READ_ACCESS) as session:
        labels = session.run(
            "MATCH (n {meeting_id: $meeting_id}) RETURN DISTINCT labels(n) AS labels",
            meeting_id=meeting_id,
        ).value("labels")
        patterns = session.run(
            """
            MATCH (a {meeting_id: $meeting_id})-[r]->(b {meeting_id: $meeting_id})
            RETURN DISTINCT labels(a) AS src_labels, type(r) AS rel, labels(b) AS tgt_labels
            LIMIT 200
            """,
            meeting_id=meeting_id,
        )
        rel_patterns = [
            f"({':'.join(rec['src_labels'])})-[:{rec['rel']}]->({':'.join(rec['tgt_labels'])})"
            for rec in patterns
        ]
        props = session.run(
            "MATCH (n {meeting_id: $meeting_id}) UNWIND keys(n) AS k RETURN DISTINCT k",
            meeting_id=meeting_id,
        ).value("k")

    flat_labels = sorted({l for group in labels for l in group})
    return {
        "labels": flat_labels,
        "relationship_patterns": sorted(set(rel_patterns)),
        "node_properties": sorted(set(props)),
    }


def generate_cypher(
    question: str,
    schema: dict,
    meeting_id: str,
    model: str = "gpt-4o-mini",
    previous_attempts: list[dict] | None = None,
    chat_history: list[dict] | None = None,
) -> dict:
    schema_note = (
        f"Available node labels: {schema['labels']}\n"
        f"Available (label)-[REL]->(label) patterns actually present in the graph "
        f"(use these to get direction/pairing right):\n"
        + "\n".join(f"  {p}" for p in schema["relationship_patterns"])
        + f"\nAvailable node properties: {schema['node_properties']}\n"
        f"meeting_id to filter on: {meeting_id!r}\n\n"
    )

    if chat_history:
        schema_note += "Recent Chat History (for context):\n"
        for msg in chat_history:
            schema_note += f"{msg['role'].upper()}: {msg['content']}\n"
        schema_note += "\n"

    schema_note += f"Current Question: {question}"

    if previous_attempts:
        retry_note = "\n\nPrevious attempt(s) returned ZERO results -- try a different relation/direction/label combo from the patterns above, don't repeat the same query:\n"
        for att in previous_attempts:
            retry_note += f"  - Query: {att['cypher']}\n    Returned: 0 rows\n"
        schema_note += retry_note

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": schema_note},
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {"name": "cypher_query", "schema": CYPHER_SCHEMA, "strict": True},
        },
    )
    return json.loads(response.choices[0].message.content)


def validate_cypher(cypher: str):
    if FORBIDDEN_PATTERN.search(cypher):
        raise ValueError(f"Rejected: query contains a write/admin keyword.\nQuery was:\n{cypher}")
    if not re.search(r"\bRETURN\b", cypher, re.IGNORECASE):
        raise ValueError(f"Rejected: query has no RETURN clause.\nQuery was:\n{cypher}")


def run_cypher(driver, cypher: str, meeting_id: str, **kwargs) -> list[dict]:
    with driver.session(default_access_mode=READ_ACCESS) as session:
        result = session.run(cypher, meeting_id=meeting_id, **kwargs)
        return [dict(record) for record in result]


def query_graph(
    question: str,
    meeting_id: str,
    uri: str,
    username: str,
    password: str,
    model: str = "gpt-4o-mini",
    max_retries: int = 3,
    chat_history: list[dict] | None = None,
):
    try:
        driver = GraphDatabase.driver(uri, auth=(username, password))
        driver.verify_connectivity()
    except Exception as e:
        alt_uri = uri.replace("neo4j+s://", "neo4j+ssc://").replace("bolt+s://", "bolt+ssc://")
        if alt_uri != uri:
            print(f"[query_graph] SSL verification failed for {uri}. Retrying with {alt_uri}...")
            driver = GraphDatabase.driver(alt_uri, auth=(username, password))
        else:
            raise e

    try:
        schema = get_meeting_schema(driver, meeting_id)
        if not schema["labels"]:
            raise ValueError(f"No graph data found for meeting_id={meeting_id!r}. Check the id is correct.")

        attempts = []
        cypher = ""
        generated = {"explanation": ""}
        graph_results = []
        attempt_num = 0

        for attempt_num in range(1, max_retries + 1):
            generated = generate_cypher(
                question, schema, meeting_id, model=model, previous_attempts=attempts, chat_history=chat_history
            )
            cypher = generated["cypher"]
            print(f"[Attempt {attempt_num}] Generated Cypher:\n{cypher}\n")

            validate_cypher(cypher)
            graph_results = run_cypher(driver, cypher, meeting_id)

            if graph_results:
                break

            print(f"[Attempt {attempt_num}] Returned 0 rows, retrying...\n")
            attempts.append({"cypher": cypher})

        # --- Vector Search (Hybrid RAG) ---
        print("[QueryPlanner] Running semantic vector search...")
        try:
            emb_res = client.embeddings.create(input=question, model="text-embedding-3-small")
            question_embedding = emb_res.data[0].embedding
            
            vector_query = """
            MATCH (c:Chunk {meeting_id: $meeting_id})
            WITH c, vector.similarity.cosine(c.embedding, $embedding) AS score
            WHERE score > 0.3
            ORDER BY score DESC
            LIMIT 5
            RETURN c.text AS text, c.speaker AS speaker, c.start_time AS start_time, score
            """
            vector_results = run_cypher(driver, vector_query, meeting_id, embedding=question_embedding)
        except Exception as e:
            print(f"[QueryPlanner] Vector search failed: {e}")
            vector_results = []

        return {
            "cypher": cypher,
            "explanation": generated.get("explanation", ""),
            "results": graph_results,
            "vector_results": vector_results,
            "attempts": attempt_num,
        }
    finally:
        driver.close()
