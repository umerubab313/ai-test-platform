"""API routes for AI test case generation, review, editing, and approval."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.models.test_case import TestCase
# from app.schemas.test_case import GenerateRequest
from app.models.project import Project
from app.tasks.generate_task import generate_test_cases_task


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


from app.tasks.generate_task import generate_test_cases_task


@router.post(
    "/tickets/{ticket_id}/generate",
    response_model=GenerateResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def generate_test_cases(ticket_id: uuid.UUID, db: Session = Depends(get_db)) -> GenerateResponse:
    """Dispatch AI test case generation using the project's stored endpoint_map.

    No endpoint_map is ever provided by the client. If the project has
    none yet (no successful upload has completed), this fails immediately
    with a clear message and never dispatches a task or calls the AI.
    """
    ticket = _get_ticket_or_404(ticket_id, db)
    project = db.query(Project).filter(Project.id == ticket.project_id).first()
    if project is None or not project.endpoint_map:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "NO_CODEBASE_UPLOADED",
                "message": "Upload a ZIP file or GitHub URL for this project before generating test cases.",
            },
        )
    task = generate_test_cases_task.delay(str(ticket_id))
    return GenerateResponse(task_id=task.id, status="generating")


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