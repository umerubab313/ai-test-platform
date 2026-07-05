"""SQLAlchemy ORM model for the bug_reports table."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import ARRAY, CheckConstraint, ForeignKey, Index, String, Text, text
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Severity(str, enum.Enum):
    """Bug report severity levels, per SDD FR-07."""

    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class BugReport(Base):
    """An AI-generated defect report for a single failed test case."""

    __tablename__ = "bug_reports"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("test_runs.id", ondelete="CASCADE"),
        nullable=False,
    )
    test_case_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("test_cases.id"),
        nullable=True,
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    steps_to_reproduce: Mapped[list[str]] = mapped_column(
        ARRAY(Text),
        nullable=False,
        server_default=text("'{}'"),
    )
    expected_result: Mapped[str] = mapped_column(Text, nullable=False)
    actual_result: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
    )

    test_run: Mapped["TestRun"] = relationship(back_populates="bug_reports")
    test_case: Mapped["TestCase | None"] = relationship(back_populates="bug_reports")

    __table_args__ = (
        CheckConstraint(
            "severity IN ('critical','high','medium','low')",
            name="ck_bug_reports_severity",
        ),
        Index("idx_bug_reports_run_id", "run_id"),
        Index("idx_bug_reports_severity", "severity"),
    )