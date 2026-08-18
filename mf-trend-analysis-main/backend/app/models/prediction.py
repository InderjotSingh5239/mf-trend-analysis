"""
Prediction — the latest multi-horizon forecast per fund.
PredictionHistory — append-only log of every prediction ever
generated, used for drift detection (comparing past predictions to
what actually happened).
"""

import enum
import uuid
from datetime import date

from sqlalchemy import Date, Enum, Float, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin, UUIDPKMixin


class Recommendation(str, enum.Enum):
    BUY = "buy"
    HOLD = "hold"
    SELL = "sell"


class PredictionBase:
    fund_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("mutual_funds.id", ondelete="CASCADE"), nullable=False, index=True
    )
    model_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ml_models.id", ondelete="SET NULL"), nullable=True
    )
    horizon_days: Mapped[int] = mapped_column(Integer, nullable=False)
    prediction_date: Mapped[date] = mapped_column(Date, nullable=False)
    target_date: Mapped[date] = mapped_column(Date, nullable=False)
    predicted_nav: Mapped[float] = mapped_column(Float, nullable=False)
    expected_return_pct: Mapped[float] = mapped_column(Float, nullable=False)
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False)
    risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    lower_bound: Mapped[float | None] = mapped_column(Float, nullable=True)
    upper_bound: Mapped[float | None] = mapped_column(Float, nullable=True)
    recommendation: Mapped[Recommendation] = mapped_column(
        Enum(Recommendation, name="recommendation"), nullable=False
    )
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)


class Prediction(Base, UUIDPKMixin, TimestampMixin, PredictionBase):
    __tablename__ = "predictions"


class PredictionHistory(Base, UUIDPKMixin, TimestampMixin, PredictionBase):
    __tablename__ = "prediction_history"

    actual_nav: Mapped[float | None] = mapped_column(Float, nullable=True)
    error_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
