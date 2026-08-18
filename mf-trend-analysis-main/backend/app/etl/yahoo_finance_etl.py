"""
Yahoo Finance ETL pipeline — fetches real, free, no-key-required
daily close prices for the market indices, commodities, and forex
pairs relevant to Indian mutual fund analysis (used later as
benchmark series for Beta/Alpha computation and as ML features).
"""

from datetime import date, datetime, timedelta

import pandas as pd
import yfinance as yf
from loguru import logger
from sqlalchemy.orm import Session
from tenacity import retry, stop_after_attempt, wait_exponential

from app.models.market_data import MarketCategory
from app.repositories.market_data_repository import MarketDataRepository

# symbol -> (display name, category)
TRACKED_SYMBOLS: dict[str, tuple[str, MarketCategory]] = {
    "^NSEI": ("NIFTY 50", MarketCategory.INDEX),
    "^BSESN": ("SENSEX", MarketCategory.INDEX),
    "^NSEBANK": ("NIFTY BANK", MarketCategory.INDEX),
    "^INDIAVIX": ("INDIA VIX", MarketCategory.INDEX),
    "GC=F": ("GOLD", MarketCategory.COMMODITY),
    "SI=F": ("SILVER", MarketCategory.COMMODITY),
    "CL=F": ("CRUDE OIL (WTI)", MarketCategory.COMMODITY),
    "USDINR=X": ("USD/INR", MarketCategory.FOREX),
    "EURINR=X": ("EUR/INR", MarketCategory.FOREX),
}


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=20))
def _fetch_symbol_history(symbol: str, start: date, end: date) -> pd.DataFrame:
    logger.info("Fetching Yahoo Finance data for {} ({} to {})", symbol, start, end)
    df = yf.download(symbol, start=start, end=end, progress=False, auto_adjust=True)
    if df.empty:
        logger.warning("No data returned for {}", symbol)
    return df


def fetch_all_symbols(start: date, end: date | None = None) -> dict[str, pd.DataFrame]:
    end = end or (date.today() + timedelta(days=1))
    results = {}
    for symbol in TRACKED_SYMBOLS:
        try:
            results[symbol] = _fetch_symbol_history(symbol, start, end)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to fetch {} after retries: {}", symbol, exc)
    return results


def _rows_from_dataframe(symbol: str, df: pd.DataFrame) -> list[dict]:
    if df.empty or "Close" not in df.columns:
        return []

    name, category = TRACKED_SYMBOLS[symbol]
    rows = []
    for row_date, row in df.iterrows():
        close_value = row["Close"]
        if pd.isna(close_value):
            continue
        rows.append(
            {
                "symbol": symbol,
                "name": name,
                "category": category.value,
                "data_date": row_date.date() if hasattr(row_date, "date") else row_date,
                "close_value": float(close_value),
            }
        )
    return rows


def run_yahoo_finance_sync(db: Session, lookback_days: int = 400) -> dict:
    """
    Full ETL run: fetch -> validate -> load for every tracked symbol.
    `lookback_days` controls how far back to (re-)fetch on each run;
    the upsert is idempotent so re-fetching overlapping ranges is safe
    and keeps historical values correct if Yahoo restates any data.
    """
    started_at = datetime.utcnow()
    start_date = date.today() - timedelta(days=lookback_days)

    raw = fetch_all_symbols(start_date)
    repo = MarketDataRepository(db)

    total_rows = 0
    symbols_synced = 0
    for symbol, df in raw.items():
        rows = _rows_from_dataframe(symbol, df)
        if rows:
            total_rows += repo.bulk_upsert_market_data(rows)
            symbols_synced += 1

    finished_at = datetime.utcnow()
    logger.info(
        "Yahoo Finance sync complete: {} symbols, {} rows in {:.2f}s",
        symbols_synced,
        total_rows,
        (finished_at - started_at).total_seconds(),
    )

    return {
        "symbols_synced": symbols_synced,
        "symbols_attempted": len(TRACKED_SYMBOLS),
        "rows_upserted": total_rows,
        "started_at": started_at,
        "finished_at": finished_at,
    }
