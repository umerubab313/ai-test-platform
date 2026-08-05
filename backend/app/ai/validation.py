"""Parses and validates raw LLM text output against a JSON schema."""

import json
import re

from jsonschema import ValidationError as JsonSchemaValidationError
from jsonschema import validate

from app.ai.exceptions import SchemaValidationError

_REPEAT_PATTERN = re.compile(r'"(.)"\s*\.\s*repeat\s*\(\s*(\d+)\s*\)')


def parse_and_validate(raw_text: str, schema: dict) -> dict:
    """Parse raw LLM text as JSON and validate it against schema.

    Raises json.JSONDecodeError if the text isn't valid JSON, or
    SchemaValidationError if it's valid JSON but the wrong shape.
    """
    cleaned = raw_text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    cleaned = _fix_repeat_expressions(cleaned)
    data = json.loads(cleaned)
    _normalize_status_codes(data)
    try:
        validate(instance=data, schema=schema)
    except JsonSchemaValidationError as exc:
        raise SchemaValidationError(str(exc)) from exc
    return data


def _fix_repeat_expressions(text: str) -> str:
    """Replace JS-style "X".repeat(N) expressions with literal repeated JSON strings.

    LLMs occasionally write this as a shortcut for a long test string
    (e.g. testing a max-length field) instead of writing the actual
    characters out, which breaks JSON parsing since it isn't valid JSON.
    """
    def _replace(match: re.Match) -> str:
        char, count = match.group(1), int(match.group(2))
        return json.dumps(char * min(count, 5000))
    return _REPEAT_PATTERN.sub(_replace, text)


def _normalize_status_codes(data: dict) -> None:
    """Defensively fix expected_status_code if the model returned a list instead of an int."""
    for tc in data.get("test_cases", []):
        code = tc.get("expected_status_code")
        if isinstance(code, list) and code:
            tc["expected_status_code"] = code[0]