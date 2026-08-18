"""
Pydantic v2 schemas for prediction endpoints.
"""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class PredictionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    horizon_days: int
    prediction_date: date
    target_date: date
    predicted_nav: float
    expected_return_pct: float
    confidence_score: float
    risk_score: float
    lower_bound: float | None = None
    upper_bound: float | None = None
    recommendation: str
    explanation: str | None = None
    created_at: datetime

class HistoricalNAV(BaseModel):
    date: date
    nav: float

class PredictionListResponse(BaseModel):
    fund_id: uuid.UUID
    historical_nav: list[HistoricalNAV]
    predictions: list[PredictionRead]
