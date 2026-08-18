"""
MLModel — registry of trained model artifacts per fund (versioned).
ModelMetric — evaluation metrics for each trained model run, used to
build the leaderboard.
"""

import enum
import uuid

from sqlalchemy import Boolean, Enum, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, PortableJSON, TimestampMixin, UUIDPKMixin


class ModelStatus(str, enum.Enum):
    TRAINING = "training"
    READY = "ready"
    FAILED = "failed"
    DEPRECATED = "deprecated"


class MLModel(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "ml_models"

    fund_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("mutual_funds.id", ondelete="CASCADE"), nullable=False, index=True
    )
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    artifact_path: Mapped[str] = mapped_column(String(500), nullable=False)
    mlflow_run_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    hyperparameters: Mapped[dict | None] = mapped_column(PortableJSON, nullable=True)
    status: Mapped[ModelStatus] = mapped_column(
        Enum(ModelStatus, name="model_status"), default=ModelStatus.READY, nullable=False
    )
    is_best: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    metrics: Mapped[list["ModelMetric"]] = relationship(back_populates="model", cascade="all, delete-orphan")


class ModelMetric(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "model_metrics"

    model_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ml_models.id", ondelete="CASCADE"), nullable=False, index=True
    )
    mae: Mapped[float | None] = mapped_column(Float, nullable=True)
    mse: Mapped[float | None] = mapped_column(Float, nullable=True)
    rmse: Mapped[float | None] = mapped_column(Float, nullable=True)
    mape: Mapped[float | None] = mapped_column(Float, nullable=True)
    r2: Mapped[float | None] = mapped_column(Float, nullable=True)
    adjusted_r2: Mapped[float | None] = mapped_column(Float, nullable=True)
    rank: Mapped[int | None] = mapped_column(Integer, nullable=True)

    model: Mapped["MLModel"] = relationship(back_populates="metrics")
