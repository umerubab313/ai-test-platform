"""Wrapper around the Claude API — primary LLM."""

from anthropic import AsyncAnthropic

from app.config import get_settings

settings = get_settings()


async def call_claude(system_prompt: str, user_prompt: str) -> str:
    """Call Claude and return the raw text response."""
    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    response = await client.messages.create(
        model="claude-sonnet-5",
        max_tokens=2048,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )
    return response.content[0].text