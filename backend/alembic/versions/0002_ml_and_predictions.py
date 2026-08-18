"""ml registry, model metrics, predictions, prediction history

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-18

"""
import uuid
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

model_status_enum = postgresql.ENUM("training", "ready", "failed", "deprecated", name="model_status")
recommendation_enum = postgresql.ENUM("buy", "hold", "sell", name="recommendation")


def upgrade() -> None:
    bind = op.get_bind()
    model_status_enum.create(bind, checkfirst=True)
    recommendation_enum.create(bind, checkfirst=True)

    op.create_table(
        "ml_models",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "fund_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("mutual_funds.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("model_name", sa.String(100), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("artifact_path", sa.String(500), nullable=False),
        sa.Column("mlflow_run_id", sa.String(100), nullable=True),
        sa.Column("hyperparameters", postgresql.JSONB(), nullable=True),
        sa.Column(
            "status",
            postgresql.ENUM("training", "ready", "failed", "deprecated", name="model_status", create_type=False),
            nullable=False,
            server_default="ready",
        ),
        sa.Column("is_best", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index("ix_ml_models_fund_id", "ml_models", ["fund_id"])
    op.create_index("ix_ml_models_id", "ml_models", ["id"])

    op.create_table(
        "model_metrics",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "model_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("ml_models.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("mae", sa.Float(), nullable=True),
        sa.Column("mse", sa.Float(), nullable=True),
        sa.Column("rmse", sa.Float(), nullable=True),
        sa.Column("mape", sa.Float(), nullable=True),
        sa.Column("r2", sa.Float(), nullable=True),
        sa.Column("adjusted_r2", sa.Float(), nullable=True),
        sa.Column("rank", sa.Integer(), nullable=True),
    )
    op.create_index("ix_model_metrics_model_id", "model_metrics", ["model_id"])
    op.create_index("ix_model_metrics_id", "model_metrics", ["id"])

    for table_name in ("predictions", "prediction_history"):
        columns = [
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column(
                "fund_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("mutual_funds.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "model_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("ml_models.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("horizon_days", sa.Integer(), nullable=False),
            sa.Column("prediction_date", sa.Date(), nullable=False),
            sa.Column("target_date", sa.Date(), nullable=False),
            sa.Column("predicted_nav", sa.Float(), nullable=False),
            sa.Column("expected_return_pct", sa.Float(), nullable=False),
            sa.Column("confidence_score", sa.Float(), nullable=False),
            sa.Column("risk_score", sa.Float(), nullable=False),
            sa.Column("lower_bound", sa.Float(), nullable=True),
            sa.Column("upper_bound", sa.Float(), nullable=True),
            sa.Column(
                "recommendation",
                postgresql.ENUM("buy", "hold", "sell", name="recommendation", create_type=False),
                nullable=False,
            ),
            sa.Column("explanation", sa.Text(), nullable=True),
        ]
        if table_name == "prediction_history":
            columns.append(sa.Column("actual_nav", sa.Float(), nullable=True))
            columns.append(sa.Column("error_pct", sa.Float(), nullable=True))

        op.create_table(table_name, *columns)
        op.create_index(f"ix_{table_name}_fund_id", table_name, ["fund_id"])
        op.create_index(f"ix_{table_name}_id", table_name, ["id"])


def downgrade() -> None:
    op.drop_table("prediction_history")
    op.drop_table("predictions")
    op.drop_table("model_metrics")
    op.drop_table("ml_models")
    recommendation_enum.drop(op.get_bind(), checkfirst=True)
    model_status_enum.drop(op.get_bind(), checkfirst=True)
