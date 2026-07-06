"""Pydantic schemas for ticket endpoints."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TicketCreate(BaseModel):
    """Request body for POST /projects/{id}/tickets."""

    title: str = Field(min_length=1, max_length=500)
    description: str = Field(min_length=1)
    acceptance_criteria: str | None = None


class TicketCreateResponse(BaseModel):
    """201 response body, matching SDD section 6.2 exactly."""

    ticket_id: uuid.UUID
    title: str


class TicketResponse(BaseModel):
    """Full ticket representation, used for GET endpoints."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    description: str
    acceptance_criteria: str | None
    created_at: datetime