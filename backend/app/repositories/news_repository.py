"""
Repository layer for News.
"""

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.models.news import News


class NewsRepository:
    def __init__(self, db: Session):
        self.db = db

    def bulk_upsert(self, rows: list[dict]) -> int:
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

    def list_recent(
        self,
        page: int = 1,
        page_size: int = 50,
        category: str | None = None,
        sentiment: str | None = None,
    ) -> tuple[list[News], int]:
        filters = []
        if category:
            filters.append(News.category == category)
        if sentiment:
            filters.append(News.sentiment_label == sentiment)

        count_stmt = select(func.count()).select_from(News)
        if filters:
            count_stmt = count_stmt.where(*filters)

        total = int(self.db.execute(count_stmt).scalar_one())

        stmt = (
            select(News)
            .where(*filters)
            .order_by(News.published_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return list(self.db.execute(stmt).scalars().all()), total
