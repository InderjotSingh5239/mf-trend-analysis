"""
MarketData — daily closing values for tracked indices, commodities,
and forex pairs (sourced from Yahoo Finance).
EconomicIndicator — macro indicators (sourced from FRED, or manual
entry for indicators without a free API, e.g. RBI repo rate).
"""

import enum

from sqlalchemy import Date, Enum, Float, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin, UUIDPKMixin


class MarketCategory(str, enum.Enum):
    INDEX = "index"
    COMMODITY = "commodity"
    FOREX = "forex"


class MarketData(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "market_data"
    __table_args__ = (UniqueConstraint("symbol", "data_date", name="uq_market_symbol_date"),)

    symbol: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[MarketCategory] = mapped_column(
        Enum(MarketCategory, name="market_category"), nullable=False
    )
    data_date: Mapped["Date"] = mapped_column(Date, nullable=False, index=True)
    close_value: Mapped[float] = mapped_column(Float, nullable=False)


class EconomicIndicator(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "economic_indicators"
    __table_args__ = (UniqueConstraint("indicator_code", "data_date", name="uq_indicator_code_date"),)

    indicator_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    indicator_name: Mapped[str] = mapped_column(String(255), nullable=False)
    data_date: Mapped["Date"] = mapped_column(Date, nullable=False, index=True)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str | None] = mapped_column(String(50), nullable=True)
    source: Mapped[str] = mapped_column(String(50), nullable=False, default="fred")
