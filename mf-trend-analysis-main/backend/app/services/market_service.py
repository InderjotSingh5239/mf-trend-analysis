"""
Market data service layer — orchestrates Yahoo Finance (indices,
commodities, forex) and FRED (macro indicators) ETL pipelines.
"""

from sqlalchemy.orm import Session

from app.etl.fred_etl import run_fred_sync
from app.etl.yahoo_finance_etl import run_yahoo_finance_sync


class MarketDataService:
    def __init__(self, db: Session):
        self.db = db

    def sync_yahoo_finance(self, lookback_days: int = 400) -> dict:
        return run_yahoo_finance_sync(self.db, lookback_days=lookback_days)

    def sync_fred(self, lookback_days: int = 730) -> dict:
        return run_fred_sync(self.db, lookback_days=lookback_days)
