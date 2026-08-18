"""
Pydantic v2 schemas for Portfolio, Holding, Transaction.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.portfolio import TransactionType


class PortfolioCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    description: str | None = Field(None, max_length=500)
    base_currency: str = Field(default="INR", min_length=3, max_length=3)


class PortfolioUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=120)
    description: str | None = Field(None, max_length=500)


class HoldingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    fund_id: uuid.UUID
    fund_name: str
    sector: str | None = None
    category: str | None = None
    units: float
    avg_nav: float
    invested_amount: float
    current_nav: float
    current_value: float
    pnl: float
    pnl_percent: float


class PortfolioRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    description: str | None = None
    base_currency: str
    created_at: datetime
    updated_at: datetime
    holdings: list[HoldingRead] = []


class TransactionCreate(BaseModel):
    fund_id: uuid.UUID
    fund_name: str = Field(..., max_length=255)
    transaction_type: TransactionType
    units: float = Field(..., gt=0)
    nav: float = Field(..., gt=0)
    transaction_date: datetime
    sector: str | None = None
    category: str | None = None

    @property
    def amount(self) -> float:
        return round(self.units * self.nav, 4)


class TransactionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    portfolio_id: uuid.UUID
    fund_id: uuid.UUID
    fund_name: str
    transaction_type: TransactionType
    units: float
    nav: float
    amount: float
    transaction_date: datetime
    created_at: datetime


class PortfolioSummary(BaseModel):
    """Aggregated portfolio-level metrics for the dashboard."""

    portfolio_id: uuid.UUID
    total_invested: float
    current_value: float
    total_pnl: float
    total_pnl_percent: float
    xirr: float | None = None
    number_of_holdings: int
    diversification_score: float
    risk_score: float
    volatility: float
    sharpe_ratio: float | None = None
    sector_allocation: dict[str, float]
    category_allocation: dict[str, float]
    top_holdings: list[HoldingRead]
