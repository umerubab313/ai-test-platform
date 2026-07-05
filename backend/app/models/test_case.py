"""SQLAlchemy ORM model for the test_cases table."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Index, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TestCaseType(str, enum.Enum):
    """The five scenario categories AI must generate, per SDD FR-04."""

    HAPPY_PATH = "happy_path"
    NEGATIVE = "negative"
    VALIDATION = "validation"
    SECURITY = "security"
    EDGE_CASE = "edge_case"


class TestCase(Base):
    """A single AI-generated (or user-edited) API test case."""

    __tablename__ = "test_cases"

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
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    endpoint: Mapped[str] = mapped_column(String(255), nullable=False)
    method: Mapped[str] = mapped_column(String(10), nullable=False)
    input_payload_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    headers_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    expected_status_code: Mapped[int] = mapped_column(Integer, nullable=False)
    expected_response_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    assertion_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    approved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
    )

    ticket: Mapped["Ticket"] = relationship(back_populates="test_cases")
    bug_reports: Mapped[list["BugReport"]] = relationship(back_populates="test_case")

    __table_args__ = (
        CheckConstraint(
            "type IN ('happy_path','negative','validation','security','edge_case')",
            name="ck_test_cases_type",
        ),
        Index("idx_test_cases_ticket_id", "ticket_id"),
        Index("idx_test_cases_approved", "approved"),
        Index("idx_test_cases_type", "type"),
    )