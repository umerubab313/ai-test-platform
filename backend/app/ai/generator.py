"""AI generation with retry + fallback, per SDD section 10.2.

Primary: Claude (company-paid account). Fallback: Gemini.
"""

import asyncio
import logging
import time

from app.ai.claude_client import call_claude
from app.ai.exceptions import AIGenerationError
from app.ai.gemini_client import call_gemini
from app.ai.validation import parse_and_validate

logger = logging.getLogger("ai_generation")

MAX_RETRIES = 3
RETRY_DELAYS = [1, 2, 4]


async def generate_with_retry(system_prompt: str, user_prompt: str, schema: dict) -> dict:
    """Call Claude with retries; fall back to Gemini if all retries fail."""
    for attempt, delay in enumerate(RETRY_DELAYS):
        started = time.monotonic()
        raw = None
        try:
            raw = await call_claude(system_prompt, user_prompt)
            return parse_and_validate(raw, schema)
        except Exception as exc:
            _log_failure("claude", attempt + 1, started, exc, raw)
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(delay)
            else:
                return await _fallback_to_gemini(system_prompt, user_prompt, schema)
    raise AIGenerationError("Unreachable: retry loop exhausted without returning")


# async def _fallback_to_gemini(system_prompt: str, user_prompt: str, schema: dict) -> dict:
#     """Try Gemini once. If it also fails for any reason, raise AI_GENERATION_FAILED."""
#     started = time.monotonic()
#     raw = None
#     try:
#         raw = await call_gemini(system_prompt, user_prompt)
#         return parse_and_validate(raw, schema)
#     except Exception as exc:
#         _log_failure("gemini_fallback", MAX_RETRIES, started, exc, raw)
#         raise AIGenerationError("Both Claude and Gemini fallback failed") from exc
FALLBACK_RETRIES = 2
FALLBACK_DELAY = 2


async def _fallback_to_gemini(system_prompt: str, user_prompt: str, schema: dict) -> dict:
    """Try Gemini up to FALLBACK_RETRIES times before giving up entirely."""
    for attempt in range(FALLBACK_RETRIES):
        started = time.monotonic()
        raw = None
        try:
            raw = await call_gemini(system_prompt, user_prompt)
            return parse_and_validate(raw, schema)
        except Exception as exc:
            _log_failure("gemini_fallback", attempt + 1, started, exc, raw)
            if attempt < FALLBACK_RETRIES - 1:
                await asyncio.sleep(FALLBACK_DELAY)
    raise AIGenerationError("Both Claude and Gemini fallback failed")

# def _log_failure(service: str, attempt: int, started: float, exc: Exception, raw: str | None) -> None:
#     """Log the real failure reason, including a snippet of the raw response if we got one."""
#     duration_ms = int((time.monotonic() - started) * 1000)
#     snippet = raw[:400] if raw else "<no response text — the API call itself failed>"
#     logger.error(
#         "AI generation attempt failed | service=%s attempt=%d duration_ms=%d "
#         "error=%s: %s | raw_snippet=%r",
#         service, attempt, duration_ms, type(exc).__name__, exc, snippet,
#     )
def _log_failure(service: str, attempt: int, started: float, exc: Exception, raw: str | None) -> None:
    """Log the real failure reason, centered on the actual error location."""
    duration_ms = int((time.monotonic() - started) * 1000)
    if raw:
        pos = getattr(exc, "pos", None)
        if pos is not None:
            start, end = max(0, pos - 150), min(len(raw), pos + 150)
            snippet = f"...{raw[start:end]}..."
            context = f"total_len={len(raw)} error_at={pos}"
        else:
            snippet = raw[:400]
            context = f"total_len={len(raw)}"
    else:
        snippet, context = "<no response text — the API call itself failed>", "n/a"
    logger.error(
        "AI generation attempt failed | service=%s attempt=%d duration_ms=%d error=%s: %s | %s | raw_snippet=%r",
        service, attempt, duration_ms, type(exc).__name__, exc, context, snippet,
    )