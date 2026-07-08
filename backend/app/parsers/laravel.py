"""Parses Laravel route definitions into an endpoint map.

Heuristic, regex-based extraction — not a full PHP interpreter. Reads
routes/*.php for Route::{verb}(...) calls. This is static text analysis,
not execution of the uploaded code, which matters for security (SDD 9.1).
"""

import re
from pathlib import Path

from app.parsers.base import BaseParser

_ROUTE_PATTERN = re.compile(
    r"Route::(get|post|put|patch|delete)\(\s*['\"]([^'\"]+)['\"](.*?)(?=Route::|\Z)",
    re.DOTALL,
)


class LaravelParser(BaseParser):
    """Extracts routes from Laravel's routes/*.php files."""

    def parse(self, source_dir: Path) -> list[dict]:
        endpoints: list[dict] = []
        for route_file in source_dir.rglob("routes/*.php"):
            endpoints.extend(self._parse_file(route_file, source_dir))
        return endpoints

    def _parse_file(self, route_file: Path, source_dir: Path) -> list[dict]:
        text = route_file.read_text(encoding="utf-8", errors="ignore")
        relative_path = str(route_file.relative_to(source_dir))
        return [
            {
                "method": verb.upper(),
                "path": path,
                "auth_required": "auth" in trailer,
                "source_file": relative_path,
            }
            for verb, path, trailer in _ROUTE_PATTERN.findall(text)
        ]