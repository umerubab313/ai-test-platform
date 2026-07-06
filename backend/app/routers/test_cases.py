"""API routes for AI test case generation, review, editing, and approval."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.test_case import TestCase
from app.models.ticket import Ticket
from app.schemas.test_case import (
    GenerateResponse,
    TestCaseApproveResponse,
    TestCaseListResponse,
    TestCaseRead,
    TestCaseUpdate,
)

router = APIRouter(tags=["test_cases"])


def _get_ticket_or_404(ticket_id: uuid.UUID, db: Session) -> Ticket:
    """Fetch a ticket by ID or raise 404."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return ticket


def _get_test_case_or_404(test_case_id: uuid.UUID, db: Session) -> TestCase:
    """Fetch a test case by ID or raise 404."""
    test_case = db.query(TestCase).filter(TestCase.id == test_case_id).first()
    if test_case is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test case not found")
    return test_case


def _to_read_schema(test_case: TestCase) -> TestCaseRead:
    """Build the API-shaped TestCaseRead from an ORM TestCase row."""
    return TestCaseRead(
        id=test_case.id,
        type=test_case.type,
        title=test_case.title,
        endpoint=test_case.endpoint,
        input_payload=test_case.input_payload_json,
        expected_status_code=test_case.expected_status_code,
        approved=test_case.approved,
    )


@router.post(
    "/tickets/{ticket_id}/generate",
    response_model=GenerateResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def generate_test_cases(ticket_id: uuid.UUID, db: Session = Depends(get_db)) -> GenerateResponse:
    """Trigger AI test case generation for a ticket.

    PLACEHOLDER: does not call the AI yet (that's Phase 5) and does not
    dispatch a real background job yet (that's Phase 6, Celery). For now
    this confirms the ticket exists and returns a fake task reference, so
    the frontend can build against the final contract today.
    """
    _get_ticket_or_404(ticket_id, db)
    return GenerateResponse(task_id=f"placeholder-{uuid.uuid4()}", status="generating")


@router.get("/tickets/{ticket_id}/test-cases", response_model=TestCaseListResponse)
def list_test_cases(ticket_id: uuid.UUID, db: Session = Depends(get_db)) -> TestCaseListResponse:
    """Poll for a ticket's generated test cases.

    Since generation isn't wired to Celery yet, this always reports
    'completed' and returns whatever test cases currently exist for this
    ticket (an empty list, until Phase 5/6 are built).
    """
    _get_ticket_or_404(ticket_id, db)
    rows = db.query(TestCase).filter(TestCase.ticket_id == ticket_id).all()
    return TestCaseListResponse(status="completed", test_cases=[_to_read_schema(r) for r in rows])


@router.patch("/test-cases/{test_case_id}", response_model=TestCaseRead)
def update_test_case(
    test_case_id: uuid.UUID, payload: TestCaseUpdate, db: Session = Depends(get_db)
) -> TestCaseRead:
    """Apply a partial edit to an AI-generated test case."""
    test_case = _get_test_case_or_404(test_case_id, db)
    updates = payload.model_dump(exclude_unset=True, mode="json")
    if "input_payload" in updates:
        test_case.input_payload_json = updates.pop("input_payload")
    if "headers" in updates:
        test_case.headers_json = updates.pop("headers")
    if "expected_response" in updates:
        test_case.expected_response_json = updates.pop("expected_response")
    for field, value in updates.items():
        setattr(test_case, field, value)
    db.commit()
    db.refresh(test_case)
    return _to_read_schema(test_case)


@router.post("/test-cases/{test_case_id}/approve", response_model=TestCaseApproveResponse)
def approve_test_case(
    test_case_id: uuid.UUID, db: Session = Depends(get_db)
) -> TestCaseApproveResponse:
    """Mark a test case as approved for execution."""
    test_case = _get_test_case_or_404(test_case_id, db)
    test_case.approved = True
    db.commit()
    return TestCaseApproveResponse(id=test_case.id, approved=True)