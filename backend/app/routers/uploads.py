"""API routes for uploading a codebase (ZIP file or GitHub URL)."""

import io
import uuid
import zipfile
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from app.tasks.parse_task import parse_codebase_task


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
    project_id: uuid.UUID,
    file: UploadFile | str | None = File(None, description="ZIP file containing the codebase"),
    github_url: str | None = Form(None, description="GitHub repo URL, alternative to file"),
    db: Session = Depends(get_db),
) -> UploadResponse:
    """Accept a ZIP file or a GitHub URL for codebase parsing.

    PLACEHOLDER: safely stores/extracts the upload now, but does not yet
    parse it into API endpoints — that's built per-framework in a later
    phase and dispatched as a real Celery task in Phase 6.
    """
    _get_project_or_404(project_id, db)

    if isinstance(file, str) and file == "":
        file = None
    if github_url == "":
        github_url = None

    if file is None and github_url is None:
        raise HTTPException(400, detail={"error": "MISSING_INPUT", "message": "Provide a file or a github_url"})
    if file is not None and github_url is not None:
        raise HTTPException(400, detail={"error": "AMBIGUOUS_INPUT", "message": "Provide only one of file or github_url"})

    upload_id = uuid.uuid4()

    if file is not None:
        content = await file.read()
        if len(content) > MAX_UPLOAD_BYTES:
            raise HTTPException(400, detail={"error": "FILE_TOO_LARGE", "message": "ZIP files must be under 50MB"})
        dest_dir = Path(f"/tmp/projects/{upload_id}")
        dest_dir.mkdir(parents=True, exist_ok=True)
        _safe_extract_zip(content, dest_dir)
    else:
        GithubUploadRequest.model_validate({"github_url": github_url})

    task = parse_codebase_task.delay(str(upload_id), str(project_id))
    return UploadResponse(upload_id=upload_id, task_id=task.id, status="processing")

@router.get("/uploads/{task_id}/result")
def get_upload_result(task_id: str) -> dict:
    """Poll for whether a codebase upload finished parsing.

    The parsed endpoint_map itself is now stored on the project row —
    this just reports whether that update succeeded.
    """
    result = AsyncResult(task_id, app=celery_app)
    if not result.ready():
        return {"status": "processing"}
    return result.result