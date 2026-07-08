"""Parses a Spring Boot codebase into an endpoint map.

Regex-based extraction of Spring MVC annotations. Combines a class-level
@RequestMapping (base path) with method-level @GetMapping/@PostMapping/etc.
"""

import re
from pathlib import Path

from app.parsers.base import BaseParser

_CLASS_BASE_PATH = re.compile(r'@RequestMapping\(\s*["\']([^"\']+)["\']')
_METHOD_MAPPING = re.compile(
    r'@(GetMapping|PostMapping|PutMapping|PatchMapping|DeleteMapping)'
    r'\(\s*(?:value\s*=\s*)?["\']?([^"\'\)]*)["\']?\)'
)
_VERB_BY_ANNOTATION = {
    "GetMapping": "GET",
    "PostMapping": "POST",
    "PutMapping": "PUT",
    "PatchMapping": "PATCH",
    "DeleteMapping": "DELETE",
}


class SpringBootParser(BaseParser):
    """Extracts endpoints from @RequestMapping/@GetMapping-style annotations."""

    def parse(self, source_dir: Path) -> list[dict]:
        endpoints: list[dict] = []
        for java_file in source_dir.rglob("*.java"):
            endpoints.extend(self._parse_file(java_file, source_dir))
        return endpoints

    def _parse_file(self, java_file: Path, source_dir: Path) -> list[dict]:
        text = java_file.read_text(encoding="utf-8", errors="ignore")
        base_match = _CLASS_BASE_PATH.search(text)
        base_path = base_match.group(1) if base_match else ""
        relative_path = str(java_file.relative_to(source_dir))
        return [
            {
                "method": _VERB_BY_ANNOTATION[annotation],
                "path": f"{base_path}{path}" if path else base_path,
                "auth_required": "@PreAuthorize" in text or "@Secured" in text,
                "source_file": relative_path,
            }
            for annotation, path in _METHOD_MAPPING.findall(text)
        ]