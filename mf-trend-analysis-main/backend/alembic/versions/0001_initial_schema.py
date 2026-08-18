"""initial schema — users, refresh_tokens, amcs, mutual_funds, nav_history

Revision ID: 0001
Revises:
Create Date: 2026-07-18

"""
import uuid
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

user_role_enum = postgresql.ENUM("admin", "analyst", "user", name="user_role")


def upgrade() -> None:
    bind = op.get_bind()
    user_role_enum.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column(
            "role",
            postgresql.ENUM("admin", "analyst", "user", name="user_role", create_type=False),
            nullable=False,
            server_default="user",
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_id", "users", ["id"])

    op.create_table(
        "refresh_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("token", sa.String(512), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.UniqueConstraint("token", name="uq_refresh_tokens_token"),
    )
    op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"])
    op.create_index("ix_refresh_tokens_token", "refresh_tokens", ["token"])
    op.create_index("ix_refresh_tokens_id", "refresh_tokens", ["id"])

    op.create_table(
        "amcs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("code", sa.String(50), nullable=True),
        sa.UniqueConstraint("name", name="uq_amcs_name"),
        sa.UniqueConstraint("code", name="uq_amcs_code"),
    )
    op.create_index("ix_amcs_name", "amcs", ["name"])
    op.create_index("ix_amcs_id", "amcs", ["id"])

    op.create_table(
        "mutual_funds",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("scheme_code", sa.String(20), nullable=False),
        sa.Column("scheme_name", sa.String(500), nullable=False),
        sa.Column("isin_growth", sa.String(20), nullable=True),
        sa.Column("isin_div_reinvestment", sa.String(20), nullable=True),
        sa.Column(
            "amc_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("amcs.id"), nullable=True
        ),
        sa.Column("category", sa.String(255), nullable=True),
        sa.Column("benchmark_index", sa.String(255), nullable=True),
        sa.Column("fund_manager", sa.String(255), nullable=True),
        sa.Column("expense_ratio", sa.Numeric(6, 3), nullable=True),
        sa.Column("aum_crore", sa.Numeric(18, 2), nullable=True),
        sa.Column("exit_load", sa.String(255), nullable=True),
        sa.Column("min_investment", sa.Numeric(12, 2), nullable=True),
        sa.Column("launch_date", sa.Date(), nullable=True),
        sa.Column("risk_category", sa.String(50), nullable=True),
        sa.UniqueConstraint("scheme_code", name="uq_mutual_funds_scheme_code"),
    )
    op.create_index("ix_mutual_funds_scheme_code", "mutual_funds", ["scheme_code"])
    op.create_index("ix_mutual_funds_scheme_name", "mutual_funds", ["scheme_name"])
    op.create_index("ix_mutual_funds_amc_id", "mutual_funds", ["amc_id"])
    op.create_index("ix_mutual_funds_id", "mutual_funds", ["id"])

    op.create_table(
        "nav_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "fund_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("mutual_funds.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("nav_date", sa.Date(), nullable=False),
        sa.Column("nav_value", sa.Numeric(14, 4), nullable=False),
        sa.UniqueConstraint("fund_id", "nav_date", name="uq_fund_navdate"),
    )
    op.create_index("ix_nav_history_fund_id", "nav_history", ["fund_id"])
    op.create_index("ix_nav_history_nav_date", "nav_history", ["nav_date"])
    op.create_index("ix_nav_history_id", "nav_history", ["id"])


def downgrade() -> None:
    op.drop_table("nav_history")
    op.drop_table("mutual_funds")
    op.drop_table("amcs")
    op.drop_table("refresh_tokens")
    op.drop_table("users")
    user_role_enum.drop(op.get_bind(), checkfirst=True)
