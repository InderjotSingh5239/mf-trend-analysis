"""
Celery task for the News Intelligence pipeline. Runs more frequently
than the daily NAV/market syncs since news is time-sensitive.
"""

from loguru import logger

from app.database.session import SessionLocal
from app.etl.news_etl import NewsAPINotConfiguredError
from app.services.news_service import NewsService
from app.tasks.celery_app import celery_app


@celery_app.task(
    name="app.tasks.news_tasks.sync_news_task", bind=True, max_retries=3, default_retry_delay=180
)
def sync_news_task(self) -> dict:
    db = SessionLocal()
    try:
        return NewsService(db).sync_news()
    except NewsAPINotConfiguredError as exc:
        logger.warning("Skipping news sync: {}", exc)
        return {"skipped": True, "reason": str(exc)}
    except Exception as exc:  # noqa: BLE001
        logger.exception("News sync task failed: {}", exc)
        raise self.retry(exc=exc) from exc
    finally:
        db.close()
