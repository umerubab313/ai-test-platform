"""Abstract base class for framework-specific endpoint parsers."""

from abc import ABC, abstractmethod
from pathlib import Path


class BaseParser(ABC):
    """Common interface every framework parser implements.

    Given the root of an extracted/cloned codebase, returns a list of
    endpoint dicts suitable for the AI's endpoint_map prompt input.
    """

    @abstractmethod
    def parse(self, source_dir: Path) -> list[dict]:
        """Return a list of {"method", "path", "auth_required", "source_file"} dicts."""
        raise NotImplementedError