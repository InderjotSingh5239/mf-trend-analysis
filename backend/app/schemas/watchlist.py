import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class WatchlistCreate(BaseModel):
    name: str = Field(default="My Watchlist", min_length=1, max_length=120)


class WatchlistItemCreate(BaseModel):
    fund_id: uuid.UUID
    fund_name: str = Field(..., max_length=255)
    notes: str | None = Field(None, max_length=500)


class WatchlistItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    fund_id: uuid.UUID
    fund_name: str
    notes: str | None = None
    added_at: datetime


class WatchlistRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    created_at: datetime
    items: list[WatchlistItemRead] = []
