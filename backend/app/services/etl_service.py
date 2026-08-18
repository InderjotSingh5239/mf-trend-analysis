"""
ETL service layer — orchestrates data pipelines. Currently wraps the
AMFI NAV sync; additional sources (Yahoo Finance, RBI, FRED, NewsAPI)
are added here in later phases.
"""

from sqlalchemy.orm import Session

from app.etl.amfi_etl import run_amfi_sync


class ETLService:
    def __init__(self, db: Session):
        self.db = db

    def sync_amfi_nav(self) -> dict:
        return run_amfi_sync(self.db)
