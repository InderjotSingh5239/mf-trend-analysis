"""
Daily NAV history — the core time series table driving the ETL
pipeline and, later, feature engineering / ML training.
"""

import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDPKMixin


class NAVHistory(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "nav_history"
    __table_args__ = (UniqueConstraint("fund_id", "nav_date", name="uq_fund_navdate"),)

    fund_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("mutual_funds.id", ondelete="CASCADE"), nullable=False, index=True
    )
    nav_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    nav_value: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False)

    fund: Mapped["MutualFund"] = relationship(back_populates="nav_history")  # noqa: F821
