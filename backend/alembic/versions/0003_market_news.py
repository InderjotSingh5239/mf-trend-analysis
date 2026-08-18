"""market data, economic indicators, news + sentiment

Revision ID: 0003
Revises: 0002
Create Date: 2026-07-21

"""
import uuid
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

market_category_enum = postgresql.ENUM("index", "commodity", "forex", name="market_category")
sentiment_label_enum = postgresql.ENUM("positive", "neutral", "negative", name="sentiment_label")


def upgrade() -> None:
    bind = op.get_bind()
    market_category_enum.create(bind, checkfirst=True)
    sentiment_label_enum.create(bind, checkfirst=True)

    op.create_table(
        "market_data",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("symbol", sa.String(30), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column(
            "category",
            postgresql.ENUM("index", "commodity", "forex", name="market_category", create_type=False),
            nullable=False,
        ),
        sa.Column("data_date", sa.Date(), nullable=False),
        sa.Column("close_value", sa.Float(), nullable=False),
        sa.UniqueConstraint("symbol", "data_date", name="uq_market_symbol_date"),
    )
    op.create_index("ix_market_data_symbol", "market_data", ["symbol"])
    op.create_index("ix_market_data_data_date", "market_data", ["data_date"])
    op.create_index("ix_market_data_id", "market_data", ["id"])

    op.create_table(
        "economic_indicators",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("indicator_code", sa.String(50), nullable=False),
        sa.Column("indicator_name", sa.String(255), nullable=False),
        sa.Column("data_date", sa.Date(), nullable=False),
        sa.Column("value", sa.Float(), nullable=False),
        sa.Column("unit", sa.String(50), nullable=True),
        sa.Column("source", sa.String(50), nullable=False, server_default="fred"),
        sa.UniqueConstraint("indicator_code", "data_date", name="uq_indicator_code_date"),
    )
    op.create_index("ix_economic_indicators_indicator_code", "economic_indicators", ["indicator_code"])
    op.create_index("ix_economic_indicators_data_date", "economic_indicators", ["data_date"])
    op.create_index("ix_economic_indicators_id", "economic_indicators", ["id"])

    op.create_table(
        "news",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("url", sa.String(1000), nullable=False),
        sa.Column("source", sa.String(255), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column(
            "sentiment_label",
            postgresql.ENUM("positive", "neutral", "negative", name="sentiment_label", create_type=False),
            nullable=True,
        ),
        sa.Column("sentiment_score", sa.Float(), nullable=True),
        sa.Column("impact_score", sa.Float(), nullable=True),
        sa.Column("related_symbols", postgresql.JSONB(), nullable=True),
        sa.UniqueConstraint("url", name="uq_news_url"),
    )
    op.create_index("ix_news_published_at", "news", ["published_at"])
    op.create_index("ix_news_id", "news", ["id"])


def downgrade() -> None:
    op.drop_table("news")
    op.drop_table("economic_indicators")
    op.drop_table("market_data")
    sentiment_label_enum.drop(op.get_bind(), checkfirst=True)
    market_category_enum.drop(op.get_bind(), checkfirst=True)
