import os
import json
from openai import OpenAI

import config

client = OpenAI(api_key=config.OPENAI_API_KEY)

SYSTEM_PROMPT = """
You are an expert executive assistant. 
You will be provided with a transcript of a meeting (divided into chunks).
Your task is to generate professional Meeting Minutes in HTML format.

The HTML should be clean, modern, and use inline CSS for styling so it renders beautifully in email clients (like Gmail).
Use a professional font (e.g. Arial, Helvetica, sans-serif), a clean layout, and clear headings.

Structure the email with the following sections:
1. Executive Summary (a brief 1-2 paragraph overview of the meeting)
2. Key Decisions (a bulleted list of major decisions made)
3. Action Items (a checklist or table of tasks, clearly stating who is assigned to what)

DO NOT include ```html markdown tags. Return raw HTML starting with a <div> or <body> tag.
"""

def generate_meeting_minutes(chunks_path_or_list: str | list[dict], model: str = "gpt-4o") -> str:
    if isinstance(chunks_path_or_list, list):
        chunks = chunks_path_or_list
    elif isinstance(chunks_path_or_list, str):
        with open(chunks_path_or_list, "r") as f:
            data = json.load(f)
        chunks = data.get("chunks", data)
    else:
        raise ValueError("Invalid chunks input")
        
    full_transcript = ""
    for c in chunks:
        full_transcript += f"[{c['speaker']}]: {c['text']}\n"
        
    user_content = f"Here is the meeting transcript:\n\n{full_transcript}"
    
    print("[Summary Agent] Generating meeting minutes...")
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content}
        ],
        temperature=0.3
    )
    
    html_content = response.choices[0].message.content.strip()
    if html_content.startswith("```html"):
        html_content = html_content[7:]
    if html_content.endswith("```"):
        html_content = html_content[:-3]
        
    return html_content.strip()
