"""
Pydantic v2 schemas for market data / economic indicator endpoints.
"""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class MarketDataPoint(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    symbol: str
    name: str
    category: str
    data_date: date
    close_value: float


class MarketDataSeriesResponse(BaseModel):
    symbol: str
    points: list[MarketDataPoint]


class EconomicIndicatorPoint(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    indicator_code: str
    indicator_name: str
    data_date: date
    value: float
    unit: str | None = None


class MarketSyncResponse(BaseModel):
    symbols_synced: int
    symbols_attempted: int
    rows_upserted: int
    started_at: datetime
    finished_at: datetime


class FredSyncResponse(BaseModel):
    indicators_synced: int
    indicators_attempted: int
    rows_upserted: int
    started_at: datetime
    finished_at: datetime


class FundRiskProfile(BaseModel):
    benchmark_symbol: str
    benchmark_data_available: bool
    annualized_return: float | None = None
    annualized_volatility: float | None = None
    sharpe_ratio: float | None = None
    sortino_ratio: float | None = None
    max_drawdown: float | None = None
    beta: float | None = None
    alpha: float | None = None
    treynor_ratio: float | None = None
