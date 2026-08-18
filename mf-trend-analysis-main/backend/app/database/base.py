"""
Declarative base class and shared mixins for all ORM models.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

# Portable JSON column: renders as native JSONB on Postgres (production),
# and falls back to generic JSON everywhere else (e.g. SQLite in tests).
# Using this instead of importing `postgresql.JSONB` directly in model
# files keeps the ORM layer dialect-agnostic and test-suite friendly.
PortableJSON = JSON().with_variant(JSONB(), "postgresql")


class Base(DeclarativeBase):
    pass


class UUIDPKMixin:
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
