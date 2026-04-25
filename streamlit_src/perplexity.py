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
        
        # Filter history to ensure alternating roles (User -> Assistant -> User)
        # This prevents Error 400 when multiple messages from the same role occur
        combined_messages = history + [{"role": "user", "content": user_input}]
        clean_history = []
        last_role = None
        
        for msg in combined_messages:
            if msg["role"] != last_role:
                clean_history.append({"role": msg["role"], "content": msg["content"]})
                last_role = msg["role"]
            else:
                # Merge consecutive messages from the same role to satisfy API requirements
                clean_history[-1]["content"] = (clean_history[-1].get("content", "") + "\n\n" + msg["content"]).strip()

        if clean_history and clean_history[0]["role"] == "assistant":
            clean_history.pop(0)

        api_messages = [{"role": "system", "content": system_prompt}] + clean_history
        response = client.chat.completions.create(model=self.model, messages=api_messages)
        return response.choices[0].message.content