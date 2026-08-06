"""API routes for ticket creation and retrieval."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.project import Project
from app.models.ticket import Ticket
from app.schemas.ticket import TicketCreate, TicketCreateResponse, TicketResponse

router = APIRouter(tags=["tickets"])


def _get_project_or_404(project_id: uuid.UUID, db: Session) -> Project:
    """Fetch a project by ID or raise 404."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


def _get_ticket_or_404(ticket_id: uuid.UUID, db: Session) -> Ticket:
    """Fetch a ticket by ID or raise 404."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return ticket


@router.post(
    "/projects/{project_id}/tickets",
    response_model=TicketCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_ticket(
    project_id: uuid.UUID, payload: TicketCreate, db: Session = Depends(get_db)
) -> TicketCreateResponse:
    """Submit a new ticket under a project."""
    _get_project_or_404(project_id, db)
    ticket = Ticket(
        project_id=project_id,
        title=payload.title,
        description=payload.description,
        acceptance_criteria=payload.acceptance_criteria,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return TicketCreateResponse(ticket_id=ticket.id, title=ticket.title)


@router.get("/projects/{project_id}/tickets", response_model=list[TicketResponse])
def list_tickets(project_id: uuid.UUID, db: Session = Depends(get_db)) -> list[Ticket]:
    """List all tickets under a project, most recent first."""
    _get_project_or_404(project_id, db)
    return (
        db.query(Ticket)
        .filter(Ticket.project_id == project_id)
        .order_by(Ticket.created_at.desc())
        .all()
    )


@router.get("/tickets/{ticket_id}", response_model=TicketResponse)
def get_ticket(ticket_id: uuid.UUID, db: Session = Depends(get_db)) -> Ticket:
    """Get a single ticket by ID."""
    return _get_ticket_or_404(ticket_id, db)