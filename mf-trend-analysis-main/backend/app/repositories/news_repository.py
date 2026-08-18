"""
Repository layer for News.
"""

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.models.news import News


class NewsRepository:
    def __init__(self, db: Session):
        self.db = db

    def bulk_upsert(self, rows: list[dict]) -> int:
        """
        rows: [{"title", "url", "source", "published_at", "summary",
                "category", "sentiment_label", "sentiment_score",
                "impact_score", "related_symbols"}, ...]
        Deduplicates on URL — the same article fetched twice (e.g. by
        two overlapping queries) is upserted, not duplicated.
        """
        if not rows:
            return 0
        stmt = pg_insert(News).values(rows)
        stmt = stmt.on_conflict_do_update(
            index_elements=["url"],
            set_={
                "sentiment_label": stmt.excluded.sentiment_label,
                "sentiment_score": stmt.excluded.sentiment_score,
                "impact_score": stmt.excluded.impact_score,
            },
        )
        result = self.db.execute(stmt)
        self.db.commit()
        return result.rowcount or 0

    def list_recent(self, limit: int = 50, category: str | None = None) -> list[News]:
        stmt = select(News).order_by(News.published_at.desc()).limit(limit)
        if category:
            stmt = stmt.where(News.category == category)
        return list(self.db.execute(stmt).scalars().all())

    def list_by_sentiment(self, sentiment_label: str, limit: int = 50) -> list[News]:
        stmt = (
            select(News)
            .where(News.sentiment_label == sentiment_label)
            .order_by(News.published_at.desc())
            .limit(limit)
        )
        return list(self.db.execute(stmt).scalars().all())
