"""SQLAlchemy ORM model for the test_runs table."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, Float, ForeignKey, Index, Integer, String, text
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TestRunStatus(str, enum.Enum):
    """Lifecycle states of a single Newman execution run."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class TestRun(Base):
    """A single execution of a ticket's approved test cases via Newman."""

    __tablename__ = "test_runs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    ticket_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tickets.id", ondelete="CASCADE"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    newman_output_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    total_tests: Mapped[int] = mapped_column(Integer, default=0)
    passed: Mapped[int] = mapped_column(Integer, default=0)
    failed: Mapped[int] = mapped_column(Integer, default=0)
    skipped: Mapped[int] = mapped_column(Integer, default=0)
    avg_response_time_ms: Mapped[float] = mapped_column(Float, default=0)
    collection_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    executed_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
    )
    completed_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)

    ticket: Mapped["Ticket"] = relationship(back_populates="test_runs")
    bug_reports: Mapped[list["BugReport"]] = relationship(
        back_populates="test_run",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending','running','completed','failed')",
            name="ck_test_runs_status",
        ),
        Index("idx_test_runs_ticket_id", "ticket_id"),
        Index("idx_test_runs_status", "status"),
    )