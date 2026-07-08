"""Pydantic schemas for test case generation, review, and approval."""

import uuid

from pydantic import BaseModel

from app.models.test_case import TestCaseType


class TestCaseRead(BaseModel):
    """A single test case, shaped to match SDD section 6.3's JSON keys."""

    id: uuid.UUID
    type: TestCaseType
    title: str
    endpoint: str
    input_payload: dict | None
    expected_status_code: int
    approved: bool


class TestCaseListResponse(BaseModel):
    """Response body for GET /tickets/{id}/test-cases."""

    status: str
    test_cases: list[TestCaseRead]


class GenerateResponse(BaseModel):
    """Response body for POST /tickets/{id}/generate."""

    task_id: str
    status: str


class TestCaseUpdate(BaseModel):
    """Partial update body for PATCH /test-cases/{id}. Every field optional."""

    type: TestCaseType | None = None
    title: str | None = None
    endpoint: str | None = None
    method: str | None = None
    input_payload: dict | None = None
    headers: dict | None = None
    expected_status_code: int | None = None
    expected_response: dict | None = None
    assertion_notes: str | None = None


class TestCaseApproveResponse(BaseModel):
    """Response body for POST /test-cases/{id}/approve."""

    id: uuid.UUID
    approved: bool

# class GenerateRequest(BaseModel):
#     """Request body for POST /tickets/{id}/generate.

#     endpoint_map is optional and temporary: once codebase parsing (still
#     unbuilt) produces and stores real parsed endpoints, this will be read
#     from the database automatically instead of passed in manually.
#     """

#     endpoint_map: list[dict] = []