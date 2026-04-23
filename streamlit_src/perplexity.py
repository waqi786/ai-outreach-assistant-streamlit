from __future__ import annotations
from typing import Any

class PerplexityService:
    def __init__(self, model: str) -> None:
        self.model = model

    def generate_response(
        self, 
        api_key: str, 
        system_prompt: str, 
        history: list[dict[str, Any]], 
        user_input: str
    ) -> str:
        from openai import OpenAI
        
        client = OpenAI(api_key=api_key, base_url="https://api.perplexity.ai")
        
        messages = [{"role": "system", "content": system_prompt}]
        for msg in history:
            messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": user_input})

        response = client.chat.completions.create(model=self.model, messages=messages)
        return response.choices[0].message.content