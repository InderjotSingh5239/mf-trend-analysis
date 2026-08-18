"""
MutualFund model — core scheme-level metadata.
Additional attributes (holdings, sector allocation, dividend history)
are added in later phases as separate normalized tables.
"""

import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDPKMixin


class MutualFund(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "mutual_funds"

    scheme_code: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    scheme_name: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    isin_growth: Mapped[str | None] = mapped_column(String(20), nullable=True)
    isin_div_reinvestment: Mapped[str | None] = mapped_column(String(20), nullable=True)

    amc_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("amcs.id"), nullable=True, index=True
    )
    category: Mapped[str | None] = mapped_column(String(255), nullable=True)
    benchmark_index: Mapped[str | None] = mapped_column(String(255), nullable=True)
    fund_manager: Mapped[str | None] = mapped_column(String(255), nullable=True)
    expense_ratio: Mapped[float | None] = mapped_column(Numeric(6, 3), nullable=True)
    aum_crore: Mapped[float | None] = mapped_column(Numeric(18, 2), nullable=True)
    exit_load: Mapped[str | None] = mapped_column(String(255), nullable=True)
    min_investment: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    launch_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    risk_category: Mapped[str | None] = mapped_column(String(50), nullable=True)

    amc: Mapped["AMC"] = relationship(back_populates="funds")  # noqa: F821
    nav_history: Mapped[list["NAVHistory"]] = relationship(  # noqa: F821
        back_populates="fund", cascade="all, delete-orphan"
    )

    @property
    def amc_name(self) -> str | None:
        """Convenience accessor for API schemas — avoids every caller needing
        to know to join through `.amc.name`. Requires `amc` to be loaded
        (see FundRepository, which eager-loads it via selectinload)."""
        return self.amc.name if self.amc is not None else None
