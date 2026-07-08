"""Parses and validates raw LLM text output against a JSON schema."""

import json

from jsonschema import ValidationError as JsonSchemaValidationError
from jsonschema import validate

from app.ai.exceptions import SchemaValidationError


def parse_and_validate(raw_text: str, schema: dict) -> dict:
    """Parse raw LLM text as JSON and validate it against schema.

    Raises json.JSONDecodeError if the text isn't valid JSON, or
    SchemaValidationError if it's valid JSON but the wrong shape.
    """
    cleaned = raw_text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    data = json.loads(cleaned)
    try:
        validate(instance=data, schema=schema)
    except JsonSchemaValidationError as exc:
        raise SchemaValidationError(str(exc)) from exc
    return data