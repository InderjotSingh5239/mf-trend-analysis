"""
Pydantic v2 schemas for MutualFund and NAVHistory.
"""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class NAVHistoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    nav_date: date
    nav_value: float


class MutualFundRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    scheme_code: str
    scheme_name: str
    amc_name: str | None = None
    category: str | None = None
    benchmark_index: str | None = None
    fund_manager: str | None = None
    expense_ratio: float | None = None
    aum_crore: float | None = None
    risk_category: str | None = None
    launch_date: date | None = None
    isin_growth: str | None = None
    exit_load: str | None = None
    min_investment: float | None = None
    latest_nav: float | None = None
    nav_change_percent: float | None = None


class MutualFundDetail(MutualFundRead):
    nav_history: list[NAVHistoryRead] = []


class MutualFundListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[MutualFundRead]


class MutualFundSyncResponse(BaseModel):
    funds_processed: int
    nav_rows_inserted: int
    started_at: datetime
    finished_at: datetime
