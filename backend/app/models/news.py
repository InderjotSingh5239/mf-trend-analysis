"""
News — financial news headlines with NLP sentiment analysis
(VADER), an impact score heuristic, and any related fund/market
symbols mentioned. Sentiment is stored on the same row rather than a
separate `sentiment` table since it's a 1:1 derived annotation of a
single news item, not an independently-queried entity.
"""

import enum

from sqlalchemy import DateTime, Enum, Float, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, PortableJSON, TimestampMixin, UUIDPKMixin


class SentimentLabel(str, enum.Enum):
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"


class News(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "news"
    __table_args__ = (UniqueConstraint("url", name="uq_news_url"),)

    title: Mapped[str] = mapped_column(String(500), nullable=False)
    url: Mapped[str] = mapped_column(String(1000), nullable=False)
    source: Mapped[str | None] = mapped_column(String(255), nullable=True)
    published_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)

    sentiment_label: Mapped[SentimentLabel | None] = mapped_column(
        Enum(SentimentLabel, name="sentiment_label"), nullable=True
    )
    sentiment_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    impact_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    related_symbols: Mapped[list | None] = mapped_column(PortableJSON, nullable=True)
