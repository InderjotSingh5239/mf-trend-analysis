"""
Portfolio domain models: Portfolio, Holding, Transaction.

Foreign keys reference the core platform's `users.id` and `mutual_funds.id`
tables (see app.models.user, app.models.mutual_fund).
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class TransactionType(str, enum.Enum):
    BUY = "BUY"
    SELL = "SELL"
    SIP = "SIP"
    DIVIDEND_REINVEST = "DIVIDEND_REINVEST"
    SWITCH_IN = "SWITCH_IN"
    SWITCH_OUT = "SWITCH_OUT"


class Portfolio(Base):
    __tablename__ = "portfolios"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False, default="My Portfolio")
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    base_currency: Mapped[str] = mapped_column(String(3), default="INR")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    holdings: Mapped[list["Holding"]] = relationship(
        "Holding", back_populates="portfolio", cascade="all, delete-orphan"
    )
    transactions: Mapped[list["Transaction"]] = relationship(
        "Transaction", back_populates="portfolio", cascade="all, delete-orphan"
    )

    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_portfolio_user_name"),)


class Holding(Base):
    """Current aggregated position of a fund inside a portfolio (derived from transactions)."""

    __tablename__ = "holdings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    portfolio_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("portfolios.id", ondelete="CASCADE"), index=True
    )
    fund_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("mutual_funds.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    fund_name: Mapped[str] = mapped_column(String(255), nullable=False)
    sector: Mapped[str | None] = mapped_column(String(120), nullable=True)
    category: Mapped[str | None] = mapped_column(String(120), nullable=True)

    units: Mapped[float] = mapped_column(Float, default=0.0)
    avg_nav: Mapped[float] = mapped_column(Float, default=0.0)
    invested_amount: Mapped[float] = mapped_column(Float, default=0.0)
    current_nav: Mapped[float] = mapped_column(Float, default=0.0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    portfolio: Mapped["Portfolio"] = relationship("Portfolio", back_populates="holdings")

    __table_args__ = (UniqueConstraint("portfolio_id", "fund_id", name="uq_holding_portfolio_fund"),)

    @property
    def current_value(self) -> float:
        return round(self.units * self.current_nav, 4)

    @property
    def pnl(self) -> float:
        return round(self.current_value - self.invested_amount, 4)

    @property
    def pnl_percent(self) -> float:
        if self.invested_amount == 0:
            return 0.0
        return round((self.pnl / self.invested_amount) * 100, 4)


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    portfolio_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("portfolios.id", ondelete="CASCADE"), index=True
    )
    fund_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("mutual_funds.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    fund_name: Mapped[str] = mapped_column(String(255), nullable=False)

    transaction_type: Mapped[TransactionType] = mapped_column(Enum(TransactionType), nullable=False)
    units: Mapped[float] = mapped_column(Float, nullable=False)
    nav: Mapped[float] = mapped_column(Float, nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    transaction_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    portfolio: Mapped["Portfolio"] = relationship("Portfolio", back_populates="transactions")
