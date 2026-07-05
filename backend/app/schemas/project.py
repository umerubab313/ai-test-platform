"""Pydantic request/response schemas for the projects endpoints."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.project import Framework


class ProjectCreate(BaseModel):
    """Request body for POST /projects."""

    name: str = Field(min_length=1, max_length=255)
    framework: Framework
    base_url: str = Field(min_length=1, max_length=500)


class ProjectResponse(BaseModel):
    """Response body returned for a single project."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    framework: Framework
    base_url: str
    created_at: datetime
    updated_at: datetime