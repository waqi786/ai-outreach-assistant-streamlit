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
        response = client.messages.create(
            model=self.model,
            max_tokens=1024,
            system=system_prompt,
            messages=[
                *[
                    {"role": message["role"], "content": message["content"]}
                    for message in history
                ],
                {"role": "user", "content": user_input},
            ],
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
