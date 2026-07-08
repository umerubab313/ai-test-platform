"""Celery task: extract (if needed), parse, and persist a codebase's endpoint map."""

import subprocess
from datetime import datetime, timezone
from pathlib import Path

from app.celery_app import celery_app
from app.database import SessionLocal
from app.models.project import Project
from app.parsers.fastapi_parser import FastAPIParser
from app.parsers.laravel import LaravelParser
from app.parsers.spring_boot import SpringBootParser

_PARSERS = {
    "laravel": LaravelParser(),
    "fastapi": FastAPIParser(),
    "spring_boot": SpringBootParser(),
}


@celery_app.task(name="parse_codebase_task")
def parse_codebase_task(upload_id: str, project_id: str, github_url: str | None = None) -> dict:
    """Extract/clone, parse, and store the endpoint_map on the project row.

    This becomes the project's single source of truth for its endpoints.
    Re-running this (a new upload) overwrites the previous result —
    tickets created afterward automatically see the latest version.
    """
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

        parser = _PARSERS.get(project.framework)
        if parser is None:
            return {"status": "failed", "error": f"No parser available for {project.framework}"}

        endpoint_map = parser.parse(dest_dir)
        project.endpoint_map = endpoint_map
        project.endpoint_map_updated_at = datetime.now(timezone.utc)
        db.commit()
        return {"status": "completed", "endpoint_count": len(endpoint_map)}
    finally:
        db.close()


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