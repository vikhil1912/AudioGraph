"""
Answer Generator
-----------------
Step 8 (final) of the meeting-graph pipeline.

Input:  the output of query_graph() from the Query Planner Agent
        (question, cypher, explanation, results)
Output: a natural-language answer grounded only in the retrieved results.

Requires:
  pip install openai
  OPENAI_API_KEY set in .env
"""

import json
from openai import OpenAI
from pydantic import BaseModel, Field

import config

client = OpenAI(api_key=config.OPENAI_API_KEY)

class Citation(BaseModel):
    speaker: str = Field(description="The name of the speaker")
    timestamp: float = Field(description="The start time of the quote in seconds")
    label: str = Field(description="A short 2-3 word label for what they said")

class AnswerResponse(BaseModel):
    answer: str = Field(description="The detailed markdown answer to the user's question.")
    citations: list[Citation] = Field(description="A list of source citations used to generate the answer.", default_factory=list)

SYSTEM_PROMPT = """You answer a question about a meeting using ONLY the
graph query results provided. Do not use outside knowledge or make anything up.

You will be provided with quotes from the meeting transcript, labeled with the speaker and the timestamp. When you write your answer, you MUST return a structured JSON response containing your 'answer' and an array of 'citations'. For every major claim in your answer, add a citation object with the speaker, the timestamp, and a short label.

Rules:
- Base your answer strictly on the given results -- if they don't fully
  answer the question, say what's missing rather than guessing.
- Provide a detailed and comprehensive answer if the question asks for a summary, explanation, or overview. Use bullet points or paragraphs to structure your answer for readability.
- If recent chat history is provided, use it to understand the context of the user's question and answer conversationally (e.g., acknowledging follow-ups).
- If results is empty, say the graph didn't contain enough information to
  answer this, rather than fabricating an answer.
- Don't mention Cypher, queries, or that this came from a database --
  answer as if you just know this about the meeting.
"""


def generate_answer(
    question: str, 
    query_result: dict, 
    model: str = "gpt-4o-mini",
    chat_history: list[dict] | None = None
) -> dict:
    graph_results = query_result.get("results", [])
    vector_results = query_result.get("vector_results", [])

    if not graph_results and not vector_results:
        return {"answer": "I couldn't find anything in the meeting's transcript or graph that answers this question.", "citations": []}

    user_content = ""
    if chat_history:
        user_content += "Recent Chat History (for context):\n"
        for msg in chat_history:
            user_content += f"{msg['role'].upper()}: {msg['content']}\n"
        user_content += "\n"

    user_content += f"Current Question: {question}\n\n"
    
    if graph_results:
        # Prevent context length explosion: max 50 records
        limited_results = graph_results[:50]
        graph_json = json.dumps(limited_results, indent=2, default=str)
        # Hard truncate string to 60k characters just in case nodes are massive
        if len(graph_json) > 60000:
            graph_json = graph_json[:60000] + "\n...[TRUNCATED DUE TO SIZE]..."

        user_content += (
            f"--- Graph Data (Relationships & Entities) ---\n"
            f"{graph_json}\n\n"
        )
        
    if vector_results:
        user_content += "--- Raw Transcript Quotes (Semantic Match) ---\n"
        for res in vector_results:
            user_content += f"[Speaker: {res.get('speaker', 'Unknown')}, Time: {res.get('start_time', 0.0):.2f}s]: {res.get('text', '')}\n"
        user_content += "\n"

    response = client.beta.chat.completions.parse(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        response_format=AnswerResponse,
    )
    ans = response.choices[0].message.parsed
    return {"answer": ans.answer, "citations": [c.model_dump() for c in ans.citations]}


def ask(question: str, meeting_id: str, uri: str, username: str, password: str, model: str = "gpt-4o-mini"):
    """Convenience wrapper: query_graph() + generate_answer() in one call."""
    from src.agents.query_planner_agent import query_graph  # local import to avoid a hard dependency at module load

    query_result = query_graph(
        question=question, meeting_id=meeting_id, uri=uri, username=username, password=password, model=model
    )
    answer_data = generate_answer(question, query_result, model=model)

    return {
        "question": question,
        "answer": answer_data["answer"],
        "sources": answer_data["citations"],
        "cypher": query_result["cypher"],
        "raw_results": query_result["results"],
    }
