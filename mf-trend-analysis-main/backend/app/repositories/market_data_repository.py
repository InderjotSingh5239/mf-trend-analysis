"""
Repository layer for MarketData and EconomicIndicator.
"""

from datetime import date

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.models.market_data import EconomicIndicator, MarketData


class MarketDataRepository:
    def __init__(self, db: Session):
        self.db = db

    def bulk_upsert_market_data(self, rows: list[dict]) -> int:
        """rows: [{"symbol", "name", "category", "data_date", "close_value"}, ...]"""
        if not rows:
            return 0
        stmt = pg_insert(MarketData).values(rows)
        stmt = stmt.on_conflict_do_update(
            index_elements=["symbol", "data_date"],
            set_={"close_value": stmt.excluded.close_value, "name": stmt.excluded.name},
        )
        result = self.db.execute(stmt)
        self.db.commit()
        return result.rowcount or 0

    def get_series(self, symbol: str, start: date | None = None) -> list[MarketData]:
        stmt = select(MarketData).where(MarketData.symbol == symbol)
        if start:
            stmt = stmt.where(MarketData.data_date >= start)
        stmt = stmt.order_by(MarketData.data_date)
        return list(self.db.execute(stmt).scalars().all())

    def get_latest_per_symbol(self) -> list[MarketData]:
        subq = (
            select(MarketData.symbol, func.max(MarketData.data_date).label("max_date"))
            .group_by(MarketData.symbol)
            .subquery()
        )
        stmt = select(MarketData).join(
            subq,
            (MarketData.symbol == subq.c.symbol) & (MarketData.data_date == subq.c.max_date),
        )
        return list(self.db.execute(stmt).scalars().all())

    def bulk_upsert_indicators(self, rows: list[dict]) -> int:
        """rows: [{"indicator_code", "indicator_name", "data_date", "value", "unit", "source"}, ...]"""
        if not rows:
            return 0
        stmt = pg_insert(EconomicIndicator).values(rows)
        stmt = stmt.on_conflict_do_update(
            index_elements=["indicator_code", "data_date"],
            set_={"value": stmt.excluded.value},
        )
        result = self.db.execute(stmt)
        self.db.commit()
        return result.rowcount or 0

    def get_indicator_series(self, indicator_code: str, start: date | None = None) -> list[EconomicIndicator]:
        stmt = select(EconomicIndicator).where(EconomicIndicator.indicator_code == indicator_code)
        if start:
            stmt = stmt.where(EconomicIndicator.data_date >= start)
        stmt = stmt.order_by(EconomicIndicator.data_date)
        return list(self.db.execute(stmt).scalars().all())
