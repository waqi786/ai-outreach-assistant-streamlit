from __future__ import annotations

from typing import Any

from anthropic import Anthropic


class ClaudeService:
    def __init__(self, model: str) -> None:
        self.model = model

    def generate_response(
        self,
        *,
        api_key: str,
        system_prompt: str,
        history: list[dict[str, Any]],
        user_input: str,
    ) -> str:
        client = Anthropic(api_key=api_key)
        
        # Ensure strict alternation for Claude's API
        combined_messages = history + [{"role": "user", "content": user_input}]
        clean_history = []
        last_role = None
        
        for msg in combined_messages:
            if msg["role"] != last_role:
                clean_history.append({"role": msg["role"], "content": msg["content"]})
                last_role = msg["role"]
            else:
                clean_history[-1]["content"] = (clean_history[-1].get("content", "") + "\n\n" + msg["content"]).strip()

        if clean_history and clean_history[0]["role"] == "assistant":
            clean_history.pop(0)

        response = client.messages.create(
            model=self.model,
            max_tokens=1024,
            system=system_prompt,
            messages=clean_history,
        )

        text_parts = [
            block.text
            for block in response.content
            if getattr(block, "type", "") == "text"
        ]
        message = "\n".join(text_parts).strip()
        if not message:
            raise RuntimeError("Claude returned an empty response.")
        return message
