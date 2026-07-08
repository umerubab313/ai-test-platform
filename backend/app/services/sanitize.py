"""Lightweight sanitization utilities."""

import re

_HTML_TAG_PATTERN = re.compile(r"<[^>]+>")


def strip_html(text: str) -> str:
    """Remove HTML tags before ticket content is passed to the LLM (SDD 9.2)."""
    return _HTML_TAG_PATTERN.sub("", text)