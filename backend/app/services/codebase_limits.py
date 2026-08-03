"""Shared limits and folder-skip rules for handling uploaded/cloned codebases."""

import os
from pathlib import Path
from typing import Iterator

SKIP_DIRS = {
    "node_modules", "vendor", ".git", "__pycache__", "dist", "build",
    "venv", ".venv", "target", "bin", "obj", ".idea", ".vscode",
    "coverage", ".next", "out", ".pytest_cache",
}


def count_relevant_files(root_dir: Path) -> int:
    """Count files under root_dir, skipping heavy/irrelevant folders."""
    total = 0
    for _, dirnames, filenames in os.walk(root_dir):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        total += len(filenames)
    return total


def iter_source_files(root_dir: Path, suffix: str, only_in_dir: str | None = None) -> Iterator[Path]:
    """Yield file paths ending in suffix, skipping heavy folders.

    If only_in_dir is set, only yield files whose immediate parent
    directory matches that name (e.g. 'routes' for Laravel route files).
    """
    for dirpath, dirnames, filenames in os.walk(root_dir):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        if only_in_dir and Path(dirpath).name != only_in_dir:
            continue
        for filename in filenames:
            if filename.endswith(suffix):
                yield Path(dirpath) / filename