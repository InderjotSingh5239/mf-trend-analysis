"""
FRED (Federal Reserve Economic Data) ETL pipeline — real macro
indicators from the St. Louis Fed's free public API.

Requires a free API key (https://fred.stlouisfed.org/docs/api/api_key.html)
set as FRED_API_KEY. Indian-specific series (repo rate, RBI-published
CPI) aren't available via any free, no-auth public API today — those
require either the RBI's own portal (no stable public REST API) or a
paid data vendor, so they're intentionally left out here rather than
faked. The series below are real, globally-relevant macro indicators
that are freely available and meaningfully correlate with Indian
market conditions (US rates/inflation drive FII flows into India).
"""

from datetime import date, datetime, timedelta

from loguru import logger
from sqlalchemy.orm import Session
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.repositories.market_data_repository import MarketDataRepository

# indicator_code -> (display name, unit)
TRACKED_INDICATORS: dict[str, tuple[str, str]] = {
    "FEDFUNDS": ("US Federal Funds Rate", "percent"),
    "CPIAUCSL": ("US CPI (All Urban Consumers)", "index"),
    "GDP": ("US Gross Domestic Product", "billions_usd"),
    "DGS10": ("US 10-Year Treasury Yield", "percent"),
    "DTWEXBGS": ("Trade Weighted US Dollar Index", "index"),
}


class FredNotConfiguredError(Exception):
    pass


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=20))
def _fetch_series(fred_client, series_id: str, start: date):
    return fred_client.get_series(series_id, observation_start=start)


def run_fred_sync(db: Session, lookback_days: int = 730) -> dict:
    if not settings.FRED_API_KEY:
        raise FredNotConfiguredError(
            "FRED_API_KEY is not set. Get a free key at "
            "https://fred.stlouisfed.org/docs/api/api_key.html and set it in .env"
        )

    from fredapi import Fred

    fred_client = Fred(api_key=settings.FRED_API_KEY)
    started_at = datetime.utcnow()
    start_date = date.today() - timedelta(days=lookback_days)

    repo = MarketDataRepository(db)
    total_rows = 0
    indicators_synced = 0

    for code, (name, unit) in TRACKED_INDICATORS.items():
        try:
            series = _fetch_series(fred_client, code, start_date)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to fetch FRED series {}: {}", code, exc)
            continue

        rows = [
            {
                "indicator_code": code,
                "indicator_name": name,
                "data_date": idx.date() if hasattr(idx, "date") else idx,
                "value": float(val),
                "unit": unit,
                "source": "fred",
            }
            for idx, val in series.items()
            if val is not None
        ]
        if rows:
            total_rows += repo.bulk_upsert_indicators(rows)
            indicators_synced += 1

    finished_at = datetime.utcnow()
    logger.info(
        "FRED sync complete: {} indicators, {} rows in {:.2f}s",
        indicators_synced,
        total_rows,
        (finished_at - started_at).total_seconds(),
    )

    return {
        "indicators_synced": indicators_synced,
        "indicators_attempted": len(TRACKED_INDICATORS),
        "rows_upserted": total_rows,
        "started_at": started_at,
        "finished_at": finished_at,
    }
