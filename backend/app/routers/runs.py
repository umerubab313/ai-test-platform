"""API routes for triggering and checking test execution runs."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.test_case import TestCase
from app.models.test_run import TestRun
from app.models.ticket import Ticket
from app.schemas.run import RunCreateResponse, RunResponse

router = APIRouter(tags=["runs"])


def _get_ticket_or_404(ticket_id: uuid.UUID, db: Session) -> Ticket:
    """Fetch a ticket by ID or raise 404."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return ticket


def _get_run_or_404(run_id: uuid.UUID, db: Session) -> TestRun:
    """Fetch a test run by ID or raise 404."""
    run = db.query(TestRun).filter(TestRun.id == run_id).first()
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test run not found")
    return run


@router.post(
    "/tickets/{ticket_id}/run",
    response_model=RunCreateResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def trigger_run(ticket_id: uuid.UUID, db: Session = Depends(get_db)) -> RunCreateResponse:
    """Create a test run for a ticket's approved test cases.

    PLACEHOLDER: creates a real TestRun row with status 'pending', but
    does not actually execute anything yet — that's Newman in Phase 7,
    dispatched via Celery in Phase 6. The response's 'running' status
    matches the SDD's documented contract for the frontend to build
    against today; the stored DB status stays 'pending' until real
    execution exists, so we don't record a run as running when nothing
    has started.
    """
    _get_ticket_or_404(ticket_id, db)
    approved_count = (
        db.query(TestCase)
        .filter(TestCase.ticket_id == ticket_id, TestCase.approved.is_(True))
        .count()
    )
    if approved_count == 0:
        raise HTTPException(
            status_code=400,
            detail={"error": "NO_APPROVED_TEST_CASES", "message": "Approve at least one test case first"},
        )
    run = TestRun(ticket_id=ticket_id)
    db.add(run)
    db.commit()
    db.refresh(run)
    return RunCreateResponse(run_id=run.id, status="running")


@router.get("/runs/{run_id}", response_model=RunResponse)
def get_run(run_id: uuid.UUID, db: Session = Depends(get_db)) -> TestRun:
    """Get the current status of a test run."""
    return _get_run_or_404(run_id, db)