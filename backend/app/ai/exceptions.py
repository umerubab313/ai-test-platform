"""Custom exceptions for the AI generation pipeline."""


class SchemaValidationError(Exception):
    """Raised when AI output is valid JSON but doesn't match the expected schema."""


class AIGenerationError(Exception):
    """Raised when both Gemini and the Claude fallback have failed. Maps to
    the AI_GENERATION_FAILED error code (503) in SDD section 10.1."""