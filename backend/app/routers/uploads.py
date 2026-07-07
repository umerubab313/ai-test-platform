"""API routes for uploading a codebase (ZIP file or GitHub URL)."""

import uuid
import zipfile
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.project import Project
from app.schemas.upload import GithubUploadRequest, UploadResponse

router = APIRouter(tags=["uploads"])

MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50MB, per SDD section 9.1


def _get_project_or_404(project_id: uuid.UUID, db: Session) -> Project:
    """Fetch a project by ID or raise 404."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


def _safe_extract_zip(zip_bytes: bytes, dest_dir: Path) -> None:
    """Extract a ZIP into dest_dir, rejecting path traversal and symlinks."""
    import io

    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as archive:
        for member in archive.infolist():
            if ".." in member.filename or Path(member.filename).is_absolute():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"error": "UNSAFE_PATH", "message": "ZIP contains unsafe file paths"},
                )
            is_symlink = (member.external_attr >> 16) & 0o170000 == 0o120000
            if is_symlink:
                continue
            archive.extract(member, dest_dir)


@router.post(
    "/projects/{project_id}/upload",
    response_model=UploadResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def upload_codebase(
    project_id: uuid.UUID, request: Request, db: Session = Depends(get_db)
) -> UploadResponse:
    """Accept a ZIP file or a GitHub URL for codebase parsing.

    PLACEHOLDER: safely stores/extracts the upload now, but does not yet
    parse it into API endpoints — that's built per-framework in a later
    phase and dispatched as a real Celery task in Phase 6.
    """
    _get_project_or_404(project_id, db)
    content_type = request.headers.get("content-type", "")
    upload_id = uuid.uuid4()

    if content_type.startswith("multipart/form-data"):
        form = await request.form()
        upload_file = form.get("file")
        if upload_file is None:
            raise HTTPException(status_code=400, detail={"error": "FILE_MISSING", "message": "No file provided"})
        content = await upload_file.read()
        if len(content) > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=400,
                detail={"error": "FILE_TOO_LARGE", "message": "ZIP files must be under 50MB"},
            )
        dest_dir = Path(f"/tmp/projects/{upload_id}")
        dest_dir.mkdir(parents=True, exist_ok=True)
        _safe_extract_zip(content, dest_dir)
    elif content_type.startswith("application/json"):
        body = await request.json()
        GithubUploadRequest.model_validate(body)
    else:
        raise HTTPException(status_code=400, detail={"error": "UNSUPPORTED_CONTENT_TYPE"})

    return UploadResponse(upload_id=upload_id, task_id=f"placeholder-{uuid.uuid4()}", status="processing")