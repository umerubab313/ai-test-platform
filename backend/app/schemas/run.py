"""Pydantic schemas for test execution runs."""

import uuid

from pydantic import BaseModel


class RunCreateResponse(BaseModel):
    """202 response body for POST /tickets/{id}/run, per SDD section 6.4."""

    run_id: uuid.UUID
    status: str


class RunResponse(BaseModel):
    """Full run status — an extension beyond the SDD's documented example,
    used for polling a run's progress from the frontend."""

    id: uuid.UUID
    ticket_id: uuid.UUID
    status: str
    total_tests: int
    passed: int
    failed: int
    skipped: int