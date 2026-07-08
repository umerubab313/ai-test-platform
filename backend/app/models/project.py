"""SQLAlchemy ORM model for the projects table."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, Index, String, text
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Framework(str, enum.Enum):
    """Supported backend frameworks. Selected manually by the user."""

    LARAVEL = "laravel"
    FASTAPI = "fastapi"
    SPRING_BOOT = "spring_boot"


class Project(Base):
    """A user's project: a backend codebase under test."""

    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    framework: Mapped[str] = mapped_column(String(50), nullable=False)
    base_url: Mapped[str] = mapped_column(String(500), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
    )
    endpoint_map: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    endpoint_map_updated_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )

    __table_args__ = (
        CheckConstraint(
            "framework IN ('laravel','fastapi','spring_boot')",
            name="ck_projects_framework",
        ),
        Index("idx_projects_framework", "framework"),
        Index("idx_projects_created_at", "created_at"),
    )