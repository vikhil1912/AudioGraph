"""
Query Pipeline (LangGraph)
----------------------------
query planner -> answer generator. Run once per question, after ingestion.
"""

from typing import TypedDict
from langgraph.graph import StateGraph, END

from src.agents.query_planner_agent import query_graph
from src.agents.answer_generator_agent import generate_answer

import config


class QueryState(TypedDict, total=False):
    question: str
    meeting_id: str
    chat_history: list[dict]

    query_result: dict
    answer: str


def query_planner_node(state: QueryState) -> QueryState:
    print("[Node] Query Planner Agent")
    query_result = query_graph(
        question=state["question"],
        meeting_id=state["meeting_id"],
        uri=config.NEO4J_URI,
        username=config.NEO4J_USERNAME,
        password=config.NEO4J_PASSWORD,
        model=config.EXTRACTION_MODEL,
        chat_history=state.get("chat_history", [])
    )
    return {"query_result": query_result}


def answer_generator_node(state: QueryState) -> QueryState:
    print("[Node] Answer Generator Agent")
    answer = generate_answer(
        question=state["question"],
        query_result=state["query_result"],
        model=config.EXTRACTION_MODEL,
        chat_history=state.get("chat_history", [])
    )
    return {"answer": answer}


def build_query_pipeline():
    graph = StateGraph(QueryState)

    graph.add_node("query_planner", query_planner_node)
    graph.add_node("answer_generator", answer_generator_node)

    graph.set_entry_point("query_planner")
    graph.add_edge("query_planner", "answer_generator")
    graph.add_edge("answer_generator", END)

    return graph.compile()
