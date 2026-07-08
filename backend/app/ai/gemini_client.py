"""Wrapper around the Gemini API — the primary LLM (SDD section 8.1)."""

from google import genai
from google.genai import types

from app.config import get_settings

settings = get_settings()
client = genai.Client(api_key=settings.gemini_api_key)


async def call_gemini(system_prompt: str, user_prompt: str) -> str:
    """Call Gemini Flash and return the raw text response."""
    response = await client.aio.models.generate_content(
        model="gemini-2.5-flash",
        contents=user_prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            max_output_tokens=8192,
            thinking_config=types.ThinkingConfig(thinking_budget=0),
        ),
    )
    return response.text