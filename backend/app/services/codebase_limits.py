"""Shared limits and folder-skip rules for handling uploaded/cloned codebases."""

import tempfile

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


def get_project_temp_dir(upload_id: str) -> Path:
    """Return an unambiguous, fully-qualified temp directory for an upload.

    Uses tempfile.gettempdir() instead of a bare "/tmp/..." path — on
    Windows, a path with no drive letter can be interpreted differently
    by Python (via the current drive) vs. MSYS-based tools like Git for
    Windows (which may resolve it relative to Git's own install folder),
    causing the two to silently disagree about which folder is empty.
    tempfile.gettempdir() always returns a real, absolute, drive-lettered
    path on Windows, and the standard /tmp path on Linux/Docker.
    """
    return Path(tempfile.gettempdir()) / "ai-test-platform-uploads" / upload_id