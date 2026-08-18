"""
Pydantic v2 schemas for news intelligence endpoints.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NewsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    url: str
    source: str | None = None
    published_at: datetime
    summary: str | None = None
    category: str | None = None
    sentiment_label: str | None = None
    sentiment_score: float | None = None
    impact_score: float | None = None


class NewsSyncResponse(BaseModel):
    articles_upserted: int
    queries_run: int
    started_at: datetime
    finished_at: datetime
