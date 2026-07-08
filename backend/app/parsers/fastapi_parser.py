"""Parses a FastAPI codebase into an endpoint map.

Prefers a real openapi.json if the upload includes one (most reliable —
it's the actual schema the app serves). Falls back to a regex scan of
route decorators when no schema file is present.
"""

import json
import re
from pathlib import Path

from app.parsers.base import BaseParser

_DECORATOR_PATTERN = re.compile(
    r"@(?:app|router)\.(get|post|put|patch|delete)\(\s*['\"]([^'\"]+)['\"]"
)


class FastAPIParser(BaseParser):
    """Extracts endpoints from openapi.json, or decorators as a fallback."""

    def parse(self, source_dir: Path) -> list[dict]:
        schema_files = list(source_dir.rglob("openapi.json"))
        if schema_files:
            return self._parse_openapi_schema(schema_files[0])
        return self._parse_decorators(source_dir)

    def _parse_openapi_schema(self, schema_file: Path) -> list[dict]:
        schema = json.loads(schema_file.read_text(encoding="utf-8"))
        return [
            {
                "method": method.upper(),
                "path": path,
                "auth_required": bool(details.get("security")),
                "source_file": schema_file.name,
            }
            for path, methods in schema.get("paths", {}).items()
            for method, details in methods.items()
        ]

    def _parse_decorators(self, source_dir: Path) -> list[dict]:
        endpoints = []
        for py_file in source_dir.rglob("*.py"):
            text = py_file.read_text(encoding="utf-8", errors="ignore")
            relative_path = str(py_file.relative_to(source_dir))
            for verb, path in _DECORATOR_PATTERN.findall(text):
                endpoints.append({
                    "method": verb.upper(),
                    "path": path,
                    "auth_required": "Depends" in text,
                    "source_file": relative_path,
                })
        return endpoints