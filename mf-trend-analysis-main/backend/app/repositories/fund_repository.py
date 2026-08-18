"""
Repository layer for MutualFund / NAVHistory / AMC.
"""

import uuid
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session, selectinload

from app.models.amc import AMC
from app.models.mutual_fund import MutualFund
from app.models.nav_history import NAVHistory


class FundRepository:
    def __init__(self, db: Session):
        self.db = db

    # ============================================================
    # AMC
    # ============================================================

    def get_or_create_amc(self, name: str) -> AMC:
        stmt = select(AMC).where(AMC.name == name)
        amc = self.db.execute(stmt).scalar_one_or_none()

        if amc is None:
            amc = AMC(name=name)
            self.db.add(amc)
            self.db.flush()

        return amc

    # ============================================================
    # MUTUAL FUND
    # ============================================================

    def get_by_scheme_code(self, scheme_code: str) -> MutualFund | None:
        stmt = select(MutualFund).where(
            MutualFund.scheme_code == scheme_code
        )

        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_id(self, fund_id: uuid.UUID) -> MutualFund | None:
        stmt = (
            select(MutualFund)
            .options(
                selectinload(MutualFund.nav_history),
                selectinload(MutualFund.amc),
            )
            .where(MutualFund.id == fund_id)
        )

        return self.db.execute(stmt).scalar_one_or_none()

    def upsert_fund(
        self,
        scheme_code: str,
        scheme_name: str,
        amc_id: uuid.UUID | None,
    ) -> MutualFund:
        fund = self.get_by_scheme_code(scheme_code)

        if fund is None:
            fund = MutualFund(
                scheme_code=scheme_code,
                scheme_name=scheme_name,
                amc_id=amc_id,
            )

            self.db.add(fund)
            self.db.flush()

        else:
            changed = False

            if fund.scheme_name != scheme_name:
                fund.scheme_name = scheme_name
                changed = True

            if amc_id is not None and fund.amc_id != amc_id:
                fund.amc_id = amc_id
                changed = True

            if changed:
                self.db.add(fund)
                self.db.flush()

        return fund

    # ============================================================
    # LIST FUNDS
    # ============================================================

    def list_funds(
        self,
        skip: int = 0,
        limit: int = 50,
        search: str | None = None,
        category: str | None = None,
        amc: str | None = None,
        risk_level: str | None = None,
        max_expense_ratio: float | None = None,
        sort_by: str | None = None,
        sort_order: str = "desc",
    ) -> tuple[list[MutualFund], int]:

        stmt = (
            select(MutualFund)
            .options(selectinload(MutualFund.amc))
        )

        count_stmt = select(
            func.count()
        ).select_from(MutualFund)

        # --------------------------------------------------------
        # SEARCH
        # --------------------------------------------------------

        if search:
            like = f"%{search}%"

            condition = MutualFund.scheme_name.ilike(like)

            stmt = stmt.where(condition)
            count_stmt = count_stmt.where(condition)

        # --------------------------------------------------------
        # CATEGORY
        # --------------------------------------------------------

        if category:
            condition = MutualFund.category.ilike(category)

            stmt = stmt.where(condition)
            count_stmt = count_stmt.where(condition)

        # --------------------------------------------------------
        # AMC
        # --------------------------------------------------------

        if amc:
            condition = AMC.name.ilike(amc)

            stmt = stmt.join(
                MutualFund.amc,
                isouter=False,
            )

            count_stmt = count_stmt.join(
                MutualFund.amc,
                isouter=False,
            )

            stmt = stmt.where(condition)
            count_stmt = count_stmt.where(condition)

        # --------------------------------------------------------
        # RISK LEVEL
        # --------------------------------------------------------

        if risk_level:
            condition = MutualFund.risk_category.ilike(risk_level)

            stmt = stmt.where(condition)
            count_stmt = count_stmt.where(condition)

        # --------------------------------------------------------
        # MAX EXPENSE RATIO
        # --------------------------------------------------------

        if max_expense_ratio is not None:
            condition = (
                MutualFund.expense_ratio <= max_expense_ratio
            )

            stmt = stmt.where(condition)
            count_stmt = count_stmt.where(condition)

        # --------------------------------------------------------
        # TOTAL AFTER FILTERING
        # --------------------------------------------------------

        total = self.db.execute(
            count_stmt
        ).scalar_one()

        # --------------------------------------------------------
        # SORTING
        # --------------------------------------------------------

        sort_columns = {
            "nav": None,
            "aum": MutualFund.aum_crore,
            "expenseRatio": MutualFund.expense_ratio,
            "expense_ratio": MutualFund.expense_ratio,
            "rating": None,
            "cagr3y": None,
        }

        sort_column = sort_columns.get(sort_by)

        if sort_column is not None:
            if sort_order == "asc":
                stmt = stmt.order_by(
                    sort_column.asc().nullslast()
                )
            else:
                stmt = stmt.order_by(
                    sort_column.desc().nullslast()
                )
        else:
            stmt = stmt.order_by(
                MutualFund.scheme_name.asc()
            )

        # --------------------------------------------------------
        # PAGINATION
        # --------------------------------------------------------

        stmt = (
            stmt
            .offset(skip)
            .limit(limit)
        )

        items = list(
            self.db.execute(stmt)
            .scalars()
            .unique()
            .all()
        )

        return items, total

    # ============================================================
    # NAV HISTORY
    # ============================================================

    def get_latest_nav_map(
        self,
        fund_ids: list[uuid.UUID],
    ) -> dict[uuid.UUID, tuple[float, float | None]]:
        """
        Batch-fetch the latest NAV and previous NAV for each fund.

        Returns:
            {
                fund_id: (
                    latest_nav,
                    previous_nav_or_none
                )
            }
        """

        if not fund_ids:
            return {}

        row_number = (
            func.row_number()
            .over(
                partition_by=NAVHistory.fund_id,
                order_by=NAVHistory.nav_date.desc(),
            )
            .label("rn")
        )

        subquery = (
            select(
                NAVHistory.fund_id.label("fund_id"),
                NAVHistory.nav_value.label("nav_value"),
                row_number,
            )
            .where(
                NAVHistory.fund_id.in_(fund_ids)
            )
            .subquery()
        )

        stmt = (
            select(
                subquery.c.fund_id,
                subquery.c.nav_value,
                subquery.c.rn,
            )
            .where(subquery.c.rn <= 2)
            .order_by(
                subquery.c.fund_id,
                subquery.c.rn,
            )
        )

        rows = self.db.execute(stmt).all()

        per_fund: dict[
            uuid.UUID,
            list[float],
        ] = {}

        for fund_id, nav_value, _rn in rows:
            per_fund.setdefault(
                fund_id,
                [],
            ).append(float(nav_value))

        return {
            fund_id: (
                values[0],
                values[1] if len(values) > 1 else None,
            )
            for fund_id, values in per_fund.items()
        }

    # ============================================================
    # BULK NAV UPSERT
    # ============================================================

    def bulk_upsert_nav(
        self,
        rows: list[dict],
    ) -> int:
        """
        Insert or update NAV history records.

        Expected row format:

        {
            "fund_id": UUID,
            "nav_date": date,
            "nav_value": float,
        }
        """

        if not rows:
            return 0

        stmt = pg_insert(
            NAVHistory
        ).values(rows)

        stmt = stmt.on_conflict_do_update(
            index_elements=[
                "fund_id",
                "nav_date",
            ],
            set_={
                "nav_value": stmt.excluded.nav_value,
            },
        )

        result = self.db.execute(stmt)

        self.db.commit()

        return result.rowcount or 0

    # ============================================================
    # NAV SERIES
    # ============================================================

    def get_nav_series(
        self,
        fund_id: uuid.UUID,
        start: date | None = None,
    ) -> list[NAVHistory]:

        stmt = select(NAVHistory).where(
            NAVHistory.fund_id == fund_id
        )

        if start:
            stmt = stmt.where(
                NAVHistory.nav_date >= start
            )

        stmt = stmt.order_by(
            NAVHistory.nav_date
        )

        return list(
            self.db.execute(stmt)
            .scalars()
            .all()
        )
