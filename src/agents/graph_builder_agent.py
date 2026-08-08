"""
Graph Builder Agent
--------------------
Step 4 (within-meeting resolution) + Step 6 (graph construction).

Input:  extractions.json from the Extraction Agent
Output: entities + relations written into Neo4j AuraDB.
"""

import json
import re
from neo4j import GraphDatabase


class GraphBuilder:

    def __init__(self, uri, username, password):
        try:
            self.driver = GraphDatabase.driver(uri, auth=(username, password))
            self.driver.verify_connectivity()
        except Exception as e:
            alt_uri = uri.replace("neo4j+s://", "neo4j+ssc://").replace("bolt+s://", "bolt+ssc://")
            if alt_uri != uri:
                print(f"[GraphBuilder] SSL verification failed for {uri}. Retrying with {alt_uri}...")
                self.driver = GraphDatabase.driver(alt_uri, auth=(username, password))
            else:
                raise e


    def close(self):
        self.driver.close()

    def sanitize_label(self, label):
        """Neo4j labels: only letters/numbers/_ , cannot start with number."""
        label = re.sub(r'[^A-Za-z0-9_]', '_', label)
        if not label:
            label = "Entity"
        if label[0].isdigit():
            label = "_" + label
        return label

    def sanitize_relation(self, relation):
        """Neo4j relationship names."""
        relation = relation.upper()
        relation = re.sub(r'[^A-Z0-9]', '_', relation)
        relation = re.sub(r'_+', '_', relation)
        relation = relation.strip("_")
        if relation == "":
            relation = "RELATED_TO"
        return relation

    def build_graph(self, extraction_file, meeting_id):
        import config
        from openai import OpenAI
        client = OpenAI(api_key=config.OPENAI_API_KEY)
        
        with open(extraction_file) as f:
            data = json.load(f)
        extractions = data["extractions"]
        with self.driver.session() as session:
            for chunk_idx, chunk in enumerate(extractions):
                entity_map = {}  # local entity id -> resolved global key (name-based)
                for entity in chunk["entities"]:
                    # resolve by normalized name, NOT by chunk-scoped id
                    global_key = re.sub(r"\s+", " ", entity["name"].strip().lower())
                    entity_map[entity["id"]] = global_key
                    # Identity is driven ONLY by name_key + meeting_id, via a generic
                    # label. If the label used in MERGE varied with the (possibly
                    # noisy, per-mention) extracted type, the same real-world entity
                    # could get split into separate nodes whenever its type was
                    # extracted differently across chunks (e.g. "Person" vs
                    # "Speaker"). The semantic type is still tracked -- as a property
                    # (which SET can freely update on type drift) and as a secondary,
                    # sanitized label for convenient querying -- but neither affects
                    # node identity.
                    type_label = self.sanitize_label(entity["type"])
                    query = f"""
                    MERGE (n:Entity {{name_key:$name_key, meeting_id:$meeting_id}})
                    ON CREATE SET n.name=$name
                    SET n.description=$description, n.type=$type
                    SET n:{type_label}
                    """
                    session.run(
                        query,
                        name_key=global_key,
                        meeting_id=meeting_id,
                        name=entity["name"],
                        type=entity["type"],
                        description=entity["description"],
                    )

                for relation in chunk["relations"]:
                    if relation["source"] not in entity_map or relation["target"] not in entity_map:
                        continue
                    rel = self.sanitize_relation(relation["relation"])
                    query = f"""
                    MATCH (a:Entity {{name_key:$source, meeting_id:$meeting_id}})
                    MATCH (b:Entity {{name_key:$target, meeting_id:$meeting_id}})
                    MERGE (a)-[r:{rel}]->(b)
                    SET r.evidence=$evidence, r.confidence=$confidence
                    """
                    session.run(
                        query,
                        source=entity_map[relation["source"]],
                        target=entity_map[relation["target"]],
                        meeting_id=meeting_id,
                        evidence=relation["evidence"],
                        confidence=relation["confidence"],
                    )

                # Vector Embedding for Hybrid RAG
                chunk_text = chunk.get("chunk_text")
                if chunk_text:
                    try:
                        emb_res = client.embeddings.create(input=chunk_text, model="text-embedding-3-small")
                        embedding = emb_res.data[0].embedding
                        chunk_id = f"{meeting_id}_chunk_{chunk_idx}"
                        
                        query = """
                        MERGE (c:Chunk {id: $chunk_id})
                        SET c.meeting_id = $meeting_id,
                            c.text = $text,
                            c.speaker = $speaker,
                            c.start_time = $start,
                            c.end_time = $end,
                            c.embedding = $embedding
                        """
                        session.run(
                            query,
                            chunk_id=chunk_id,
                            meeting_id=meeting_id,
                            text=chunk_text,
                            speaker=chunk.get("chunk_speaker", ""),
                            start=chunk.get("chunk_start", 0),
                            end=chunk.get("chunk_end", 0),
                            embedding=embedding
                        )
                        
                        # Link entities to the chunk
                        for entity_id, global_key in entity_map.items():
                            session.run(
                                """
                                MATCH (e:Entity {name_key: $global_key, meeting_id: $meeting_id})
                                MATCH (c:Chunk {id: $chunk_id})
                                MERGE (e)-[:MENTIONED_IN]->(c)
                                """,
                                global_key=global_key,
                                meeting_id=meeting_id,
                                chunk_id=chunk_id
                            )
                    except Exception as e:
                        print(f"Failed to embed chunk {chunk_idx}: {e}")

            # Create Vector Index
            try:
                session.run(
                    """
                    CREATE VECTOR INDEX chunk_embeddings IF NOT EXISTS
                    FOR (c:Chunk)
                    ON (c.embedding)
                    OPTIONS {indexConfig: {
                        `vector.dimensions`: 1536,
                        `vector.similarity_function`: 'cosine'
                    }}
                    """
                )
            except Exception as e:
                print(f"Vector index creation notice: {e}")

        print("Knowledge Graph created successfully!")