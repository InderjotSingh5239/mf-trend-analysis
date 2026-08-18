"""
News service layer — orchestrates the NewsAPI fetch + VADER
sentiment ETL pipeline.
"""

from sqlalchemy.orm import Session

from app.etl.news_etl import run_news_sync


class NewsService:
    def __init__(self, db: Session):
        self.db = db

    def sync_news(self, lookback_days: int = 3) -> dict:
        return run_news_sync(self.db, lookback_days=lookback_days)
