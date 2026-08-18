"""
Pydantic v2 schemas for the ML training/leaderboard endpoints.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ModelMetricRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    mae: float | None = None
    mse: float | None = None
    rmse: float | None = None
    mape: float | None = None
    r2: float | None = None
    adjusted_r2: float | None = None
    rank: int | None = None


class MLModelRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    id: uuid.UUID
    model_name: str
    version: int
    is_best: bool
    status: str
    created_at: datetime
    metrics: list[ModelMetricRead] = []


class LeaderboardEntry(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    model_name: str
    metrics: dict
    rank: int


class TrainingResponse(BaseModel):
    fund_id: str
    scheme_code: str
    leaderboard: list[LeaderboardEntry]
    best_model: str
    models_trained: int
