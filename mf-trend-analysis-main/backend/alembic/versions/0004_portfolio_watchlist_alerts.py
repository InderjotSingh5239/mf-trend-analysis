"""portfolio, watchlist, and alerts (Phase 4)

Revision ID: 0004
Revises: 0003
Create Date: 2026-07-25

"""
import uuid
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

transaction_type_enum = postgresql.ENUM(
    "BUY", "SELL", "SIP", "DIVIDEND_REINVEST", "SWITCH_IN", "SWITCH_OUT", name="transactiontype"
)
alert_type_enum = postgresql.ENUM(
    "NAV_ABOVE",
    "NAV_BELOW",
    "RETURN_ABOVE",
    "RETURN_BELOW",
    "RISK_SCORE_ABOVE",
    "PORTFOLIO_DRAWDOWN",
    name="alerttype",
)
alert_status_enum = postgresql.ENUM("ACTIVE", "TRIGGERED", "DISABLED", name="alertstatus")


def upgrade() -> None:
    bind = op.get_bind()
    transaction_type_enum.create(bind, checkfirst=True)
    alert_type_enum.create(bind, checkfirst=True)
    alert_status_enum.create(bind, checkfirst=True)

    # --- portfolios ---
    op.create_table(
        "portfolios",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(120), nullable=False, server_default="My Portfolio"),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("base_currency", sa.String(3), nullable=False, server_default="INR"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "name", name="uq_portfolio_user_name"),
    )
    op.create_index("ix_portfolios_user_id", "portfolios", ["user_id"])

    # --- holdings ---
    op.create_table(
        "holdings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column(
            "portfolio_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("portfolios.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "fund_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("mutual_funds.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("fund_name", sa.String(255), nullable=False),
        sa.Column("sector", sa.String(120), nullable=True),
        sa.Column("category", sa.String(120), nullable=True),
        sa.Column("units", sa.Float(), nullable=False, server_default="0"),
        sa.Column("avg_nav", sa.Float(), nullable=False, server_default="0"),
        sa.Column("invested_amount", sa.Float(), nullable=False, server_default="0"),
        sa.Column("current_nav", sa.Float(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("portfolio_id", "fund_id", name="uq_holding_portfolio_fund"),
    )
    op.create_index("ix_holdings_portfolio_id", "holdings", ["portfolio_id"])
    op.create_index("ix_holdings_fund_id", "holdings", ["fund_id"])

    # --- transactions ---
    op.create_table(
        "transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column(
            "portfolio_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("portfolios.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "fund_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("mutual_funds.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("fund_name", sa.String(255), nullable=False),
        sa.Column(
            "transaction_type",
            postgresql.ENUM(
                "BUY",
                "SELL",
                "SIP",
                "DIVIDEND_REINVEST",
                "SWITCH_IN",
                "SWITCH_OUT",
                name="transactiontype",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("units", sa.Float(), nullable=False),
        sa.Column("nav", sa.Float(), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("transaction_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_transactions_portfolio_id", "transactions", ["portfolio_id"])
    op.create_index("ix_transactions_fund_id", "transactions", ["fund_id"])

    # --- watchlists ---
    op.create_table(
        "watchlists",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(120), nullable=False, server_default="My Watchlist"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "name", name="uq_watchlist_user_name"),
    )
    op.create_index("ix_watchlists_user_id", "watchlists", ["user_id"])

    # --- watchlist_items ---
    op.create_table(
        "watchlist_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column(
            "watchlist_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("watchlists.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "fund_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("mutual_funds.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("fund_name", sa.String(255), nullable=False),
        sa.Column("notes", sa.String(500), nullable=True),
        sa.Column("added_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("watchlist_id", "fund_id", name="uq_watchlist_fund"),
    )
    op.create_index("ix_watchlist_items_watchlist_id", "watchlist_items", ["watchlist_id"])
    op.create_index("ix_watchlist_items_fund_id", "watchlist_items", ["fund_id"])

    # --- alerts ---
    op.create_table(
        "alerts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "fund_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("mutual_funds.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "portfolio_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("portfolios.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "alert_type",
            postgresql.ENUM(
                "NAV_ABOVE",
                "NAV_BELOW",
                "RETURN_ABOVE",
                "RETURN_BELOW",
                "RISK_SCORE_ABOVE",
                "PORTFOLIO_DRAWDOWN",
                name="alerttype",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("threshold_value", sa.Float(), nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM("ACTIVE", "TRIGGERED", "DISABLED", name="alertstatus", create_type=False),
            nullable=False,
            server_default="ACTIVE",
        ),
        sa.Column("is_recurring", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("triggered_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_alerts_user_id", "alerts", ["user_id"])
    op.create_index("ix_alerts_fund_id", "alerts", ["fund_id"])

    # --- notifications ---
    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column(
            "alert_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("alerts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("message", sa.String(500), nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_notifications_alert_id", "notifications", ["alert_id"])
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])


def downgrade() -> None:
    op.drop_table("notifications")
    op.drop_table("alerts")
    op.drop_table("watchlist_items")
    op.drop_table("watchlists")
    op.drop_table("transactions")
    op.drop_table("holdings")
    op.drop_table("portfolios")
    alert_status_enum.drop(op.get_bind(), checkfirst=True)
    alert_type_enum.drop(op.get_bind(), checkfirst=True)
    transaction_type_enum.drop(op.get_bind(), checkfirst=True)
