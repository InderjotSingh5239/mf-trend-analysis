"""
Repository layer for MutualFund / NAVHistory / AMC.
"""

import uuid
from datetime import date, timedelta

from sqlalchemy import case, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session, selectinload

from app.models.amc import AMC
from app.models.mutual_fund import MutualFund
from app.models.nav_history import NAVHistory


class FundRepository:
    def __init__(self, db: Session):
        self.db = db

    # --- AMC ---
    def get_or_create_amc(self, name: str) -> AMC:
        stmt = select(AMC).where(AMC.name == name)
        amc = self.db.execute(stmt).scalar_one_or_none()
        if amc is None:
            amc = AMC(name=name)
            self.db.add(amc)
            self.db.flush()
        return amc

    # --- MutualFund ---
    def get_by_scheme_code(self, scheme_code: str) -> MutualFund | None:
        stmt = select(MutualFund).where(MutualFund.scheme_code == scheme_code)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_id(self, fund_id: uuid.UUID) -> MutualFund | None:
        stmt = (
            select(MutualFund)
            .options(selectinload(MutualFund.nav_history), selectinload(MutualFund.amc))
            .where(MutualFund.id == fund_id)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def upsert_fund(
        self,
        scheme_code: str,
        scheme_name: str,
        amc_id: uuid.UUID | None,
        isin_growth: str | None = None,
        isin_div_reinvestment: str | None = None,
        category: str | None = None,
        benchmark_index: str | None = None,
        fund_manager: str | None = None,
        expense_ratio: float | None = None,
        aum_crore: float | None = None,
        exit_load: str | None = None,
        min_investment: float | None = None,
        launch_date: date | None = None,
        risk_category: str | None = None,
    ) -> MutualFund:
        fund = self.get_by_scheme_code(scheme_code)

        # Create new fund
        if fund is None:
            fund = MutualFund(
                scheme_code=scheme_code,
                scheme_name=scheme_name,
                amc_id=amc_id,
                isin_growth=isin_growth,
                isin_div_reinvestment=isin_div_reinvestment,
                category=category,
                benchmark_index=benchmark_index,
                fund_manager=fund_manager,
                expense_ratio=expense_ratio,
                aum_crore=aum_crore,
                exit_load=exit_load,
                min_investment=min_investment,
                launch_date=launch_date,
                risk_category=risk_category,
            )

            self.db.add(fund)
            self.db.flush()
            return fund

        # Update existing fund
        changed = False

        if fund.scheme_name != scheme_name:
            fund.scheme_name = scheme_name
            changed = True

        if isin_growth is not None and fund.isin_growth != isin_growth:
            fund.isin_growth = isin_growth
            changed = True

        if (
            isin_div_reinvestment is not None
            and fund.isin_div_reinvestment != isin_div_reinvestment
        ):
            fund.isin_div_reinvestment = isin_div_reinvestment
            changed = True

        if amc_id is not None and fund.amc_id != amc_id:
            fund.amc_id = amc_id
            changed = True

        if category is not None and fund.category != category:
            fund.category = category
            changed = True

        if (
            benchmark_index is not None
            and fund.benchmark_index != benchmark_index
        ):
            fund.benchmark_index = benchmark_index
            changed = True

        if fund_manager is not None and fund.fund_manager != fund_manager:
            fund.fund_manager = fund_manager
            changed = True

        if (
            expense_ratio is not None
            and fund.expense_ratio != expense_ratio
        ):
            fund.expense_ratio = expense_ratio
            changed = True

        if aum_crore is not None and fund.aum_crore != aum_crore:
            fund.aum_crore = aum_crore
            changed = True

        if exit_load is not None and fund.exit_load != exit_load:
            fund.exit_load = exit_load
            changed = True

        if (
            min_investment is not None
            and fund.min_investment != min_investment
        ):
            fund.min_investment = min_investment
            changed = True

        if launch_date is not None and fund.launch_date != launch_date:
            fund.launch_date = launch_date
            changed = True

        if (
            risk_category is not None
            and fund.risk_category != risk_category
        ):
            fund.risk_category = risk_category
            changed = True

        if changed:
            self.db.flush()

        return fund

    def list_funds(
        self,
        skip: int = 0,
        limit: int = 50,
        search: str | None = None,
        category: str | None = None,
        amc: str | None = None,
        risk_level: str | None = None,
        max_expense_ratio: float | None = None,
        sort_by: str = "scheme_name",
        sort_order: str = "asc",
    ) -> tuple[list[MutualFund], int]:
        stmt = select(MutualFund).options(selectinload(MutualFund.amc))
        count_stmt = select(func.count()).select_from(MutualFund)

        filters = []
        if search:
            filters.append(
                MutualFund.scheme_name.ilike(f"%{search}%")
            )
        if category:
            filters.append(MutualFund.category == category)
        if risk_level:
            filters.append(MutualFund.risk_category == risk_level)
        if max_expense_ratio is not None:
            filters.append(
                MutualFund.expense_ratio <= max_expense_ratio
            )

        if amc:
            stmt = stmt.join(MutualFund.amc)
            count_stmt = count_stmt.join(MutualFund.amc)
            filters.append(AMC.name == amc)

        if filters:
            stmt = stmt.where(*filters)
            count_stmt = count_stmt.where(*filters)

        total = int(self.db.execute(count_stmt).scalar_one())

        sort_columns = {
            "scheme_name": MutualFund.scheme_name,
            "nav": NAVHistory.nav_value,
            "expense_ratio": MutualFund.expense_ratio,
            "aum": MutualFund.aum_crore,
        }

        sort_column = sort_columns.get(sort_by, MutualFund.scheme_name)

        if sort_by in {"nav", "nav_change_percent"}:
            latest_nav_subquery = (
                select(
                    NAVHistory.fund_id,
                    func.max(NAVHistory.nav_date).label("latest_date"),
                )
                .group_by(NAVHistory.fund_id)
                .subquery()
            )
            stmt = stmt.outerjoin(
                latest_nav_subquery,
                latest_nav_subquery.c.fund_id == MutualFund.id,
            )

            if sort_by == "nav":
                stmt = stmt.outerjoin(
                    NAVHistory,
                    (NAVHistory.fund_id == latest_nav_subquery.c.fund_id)
                    & (NAVHistory.nav_date == latest_nav_subquery.c.latest_date),
                )
                sort_column = NAVHistory.nav_value
            else:
                ranked_nav = (
                    select(
                        NAVHistory.fund_id.label("fund_id"),
                        NAVHistory.nav_value.label("nav_value"),
                        func.row_number()
                        .over(
                            partition_by=NAVHistory.fund_id,
                            order_by=NAVHistory.nav_date.desc(),
                        )
                        .label("rn"),
                    )
                    .subquery()
                )
                mover_values = (
                    select(
                        ranked_nav.c.fund_id,
                        func.max(
                            case(
                                (ranked_nav.c.rn == 1, ranked_nav.c.nav_value),
                                else_=None,
                            )
                        ).label("latest_nav"),
                        func.max(
                            case(
                                (ranked_nav.c.rn == 2, ranked_nav.c.nav_value),
                                else_=None,
                            )
                        ).label("previous_nav"),
                    )
                    .where(ranked_nav.c.rn <= 2)
                    .group_by(ranked_nav.c.fund_id)
                    .subquery()
                )
                stmt = stmt.outerjoin(
                    mover_values,
                    mover_values.c.fund_id == MutualFund.id,
                )
                previous = mover_values.c.previous_nav
                latest = mover_values.c.latest_nav
                sort_column = case(
                    (
                        previous.is_not(None) & (previous != 0),
                        (latest - previous) / previous * 100,
                    ),
                    else_=None,
                )

        order_clause = (
            sort_column.desc().nullslast()
            if sort_order == "desc"
            else sort_column.asc().nullslast()
        )

        stmt = stmt.order_by(order_clause).offset(skip).limit(limit)
        items = list(self.db.execute(stmt).scalars().unique().all())
        return items, total

    # --- NAV History ---
    def get_latest_nav_map(self, fund_ids: list[uuid.UUID]) -> dict[uuid.UUID, tuple[float, float | None]]:
        """
        Batch-fetch each fund's latest NAV and the one before it, in a single
        query using a window function — avoids an N+1 query per fund when
        rendering a paginated fund list with day-change figures.
        Returns {fund_id: (latest_nav, previous_nav_or_None)}.
        """
        if not fund_ids:
            return {}

        rn = (
            func.row_number()
            .over(partition_by=NAVHistory.fund_id, order_by=NAVHistory.nav_date.desc())
            .label("rn")
        )
        subq = (
            select(NAVHistory.fund_id.label("fund_id"), NAVHistory.nav_value.label("nav_value"), rn)
            .where(NAVHistory.fund_id.in_(fund_ids))
            .subquery()
        )
        stmt = (
            select(subq.c.fund_id, subq.c.nav_value, subq.c.rn)
            .where(subq.c.rn <= 2)
            .order_by(subq.c.fund_id, subq.c.rn)
        )
        rows = self.db.execute(stmt).all()

        per_fund: dict[uuid.UUID, list[float]] = {}
        for fund_id, nav_value, _rn in rows:
            per_fund.setdefault(fund_id, []).append(float(nav_value))

        return {
            fund_id: (values[0], values[1] if len(values) > 1 else None)
            for fund_id, values in per_fund.items()
        }

    def bulk_upsert_nav(self, rows: list[dict]) -> int:
        """
        rows: list of {"fund_id": UUID, "nav_date": date, "nav_value": float}
        Uses Postgres ON CONFLICT DO UPDATE for idempotent incremental loads.
        """
        if not rows:
            return 0

        stmt = pg_insert(NAVHistory).values(rows)
        stmt = stmt.on_conflict_do_update(
            index_elements=["fund_id", "nav_date"],
            set_={"nav_value": stmt.excluded.nav_value},
        )
        result = self.db.execute(stmt)
        self.db.commit()
        return result.rowcount or 0

    def get_nav_series(self, fund_id: uuid.UUID, start: date | None = None) -> list[NAVHistory]:
        stmt = select(NAVHistory).where(NAVHistory.fund_id == fund_id)
        if start:
            stmt = stmt.where(NAVHistory.nav_date >= start)
        stmt = stmt.order_by(NAVHistory.nav_date)
        return list(self.db.execute(stmt).scalars().all())

    def get_trailing_cagr_map(
        self,
        years: float = 3.0,
        min_coverage_ratio: float = 0.9,
    ) -> dict[uuid.UUID, float]:
        """
        Real trailing CAGR per fund, computed strictly from stored NAV
        history: (latest_nav / base_nav) ** (365.25 / actual_days) - 1,
        where base_nav is the most recent NAV on or before
        (latest_nav_date - `years`).

        A fund is EXCLUDED from the result (not defaulted to 0/None-as-zero)
        unless the actual span between base_nav and latest_nav covers at
        least `min_coverage_ratio` of the requested window — e.g. for
        years=3 and min_coverage_ratio=0.9, a fund needs data spanning at
        least ~2.7 years before a "3Y CAGR" is reported for it at all.
        This is the data-availability policy from PROJECT_AUDIT.md: don't
        fabricate a 3Y figure from 8 months of history.
        """
        latest_rn = (
            func.row_number()
            .over(partition_by=NAVHistory.fund_id, order_by=NAVHistory.nav_date.desc())
            .label("rn")
        )
        latest_subq = (
            select(
                NAVHistory.fund_id.label("fund_id"),
                NAVHistory.nav_date.label("nav_date"),
                NAVHistory.nav_value.label("nav_value"),
                latest_rn,
            ).subquery()
        )
        latest_rows = self.db.execute(
            select(latest_subq.c.fund_id, latest_subq.c.nav_date, latest_subq.c.nav_value).where(
                latest_subq.c.rn == 1
            )
        ).all()

        if not latest_rows:
            return {}

        target_days = int(years * 365.25)
        min_days = int(target_days * min_coverage_ratio)

        result: dict[uuid.UUID, float] = {}
        for fund_id, latest_date, latest_nav in latest_rows:
            cutoff = latest_date - timedelta(days=target_days)

            base_stmt = (
                select(NAVHistory.nav_date, NAVHistory.nav_value)
                .where(NAVHistory.fund_id == fund_id, NAVHistory.nav_date <= cutoff)
                .order_by(NAVHistory.nav_date.desc())
                .limit(1)
            )
            base_row = self.db.execute(base_stmt).first()
            if base_row is None:
                continue  # not enough history — excluded, not fabricated

            base_date, base_nav = base_row
            actual_days = (latest_date - base_date).days
            if actual_days < min_days or base_nav is None or float(base_nav) <= 0:
                continue

            years_actual = actual_days / 365.25
            try:
                cagr = (float(latest_nav) / float(base_nav)) ** (1 / years_actual) - 1
            except (ZeroDivisionError, ValueError, OverflowError):
                continue

            result[fund_id] = round(cagr * 100, 4)  # percent

        return result
