"""Pydantic schemas for the upload endpoint."""

import re
import uuid

from pydantic import BaseModel, field_validator

REPO_URL_PATTERN = re.compile(r"^https://(github\.com|bitbucket\.org)/[\w.-]+/[\w.-]+/?$")


class GithubUploadRequest(BaseModel):
    """Request body for uploading via a repo URL (GitHub or Bitbucket)."""

    github_url: str

    @field_validator("github_url")
    @classmethod
    def validate_repo_url(cls, value: str) -> str:
        """Reject anything that doesn't look like a real GitHub/Bitbucket repo URL."""
        if not REPO_URL_PATTERN.match(value):
            raise ValueError("github_url must match https://github.com/{owner}/{repo} or https://bitbucket.org/{owner}/{repo}")
        return value


class UploadResponse(BaseModel):
    """202 response body, matching SDD section 6.1 exactly."""

    upload_id: uuid.UUID
    task_id: str
    status: str