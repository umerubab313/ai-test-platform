"""Celery task: extract (if needed), parse, and persist a codebase's endpoint map."""

import subprocess
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError
from datetime import datetime, timezone
from pathlib import Path

from app.celery_app import celery_app
from app.config import get_settings
from app.database import SessionLocal
from app.models.project import Project
from app.parsers.fastapi_parser import FastAPIParser
from app.parsers.laravel import LaravelParser
from app.parsers.spring_boot import SpringBootParser
from app.services.codebase_limits import count_relevant_files

settings = get_settings()

_PARSERS = {
    "laravel": LaravelParser(),
    "fastapi": FastAPIParser(),
    "spring_boot": SpringBootParser(),
}


@celery_app.task(name="parse_codebase_task")
def parse_codebase_task(upload_id: str, project_id: str, github_url: str | None = None) -> dict:
    """Extract (if needed) and parse a codebase into an endpoint map."""
    db = SessionLocal()
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if project is None:
            return {"status": "failed", "error": "Project not found"}

        dest_dir = Path(f"/tmp/projects/{upload_id}")
        if github_url:
            clone_error = _clone_repo(github_url, dest_dir)
            if clone_error is not None:
                return clone_error
            size_error = _check_file_count(dest_dir)
            if size_error is not None:
                return size_error

        parser = _PARSERS.get(project.framework)
        if parser is None:
            return {"status": "failed", "error": f"No parser available for {project.framework}"}

        endpoint_map = _parse_with_timeout(parser, dest_dir)
        if endpoint_map is None:
            return {"status": "failed", "error": "PARSE_TIMEOUT", "message": f"Parsing exceeded {settings.parse_timeout_seconds}s"}

        project.endpoint_map = endpoint_map
        project.endpoint_map_updated_at = datetime.now(timezone.utc)
        db.commit()
        return {"status": "completed", "endpoint_count": len(endpoint_map)}
    finally:
        db.close()


def _check_file_count(dest_dir: Path) -> dict | None:
    """Return an error dict if the cloned repo exceeds the file-count limit."""
    file_count = count_relevant_files(dest_dir)
    if file_count > settings.max_file_count:
        return {
            "status": "failed",
            "error": "CODEBASE_TOO_LARGE",
            "message": f"Repo has {file_count} files, exceeding the {settings.max_file_count} limit",
        }
    return None


def _parse_with_timeout(parser, dest_dir: Path) -> list[dict] | None:
    """Run parser.parse in a worker thread, enforcing a hard time limit.

    Note: if the timeout fires, the parsing thread isn't forcibly killed
    (Python has no safe way to do that) — it just keeps running in the
    background and its result is discarded. This bounds how long the
    *task* waits, which is what protects the worker from hanging forever.
    """
    with ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(parser.parse, dest_dir)
        try:
            return future.result(timeout=settings.parse_timeout_seconds)
        except FutureTimeoutError:
            return None


def _clone_repo(github_url: str, dest_dir: Path) -> dict | None:
    """Shallow-clone a public GitHub repo. Returns an error dict on failure, else None."""
    dest_dir.mkdir(parents=True, exist_ok=True)
    try:
        subprocess.run(
            ["git", "clone", "--depth", "1", github_url, str(dest_dir)],
            check=True, timeout=60, capture_output=True,
        )
    except FileNotFoundError:
        return {"status": "failed", "error": "git is not installed on this machine"}
    except subprocess.CalledProcessError as exc:
        return {"status": "failed", "error": f"git clone failed: {exc.stderr.decode(errors='ignore')[:200]}"}
    except subprocess.TimeoutExpired:
        return {"status": "failed", "error": "git clone timed out after 60s"}
    return None