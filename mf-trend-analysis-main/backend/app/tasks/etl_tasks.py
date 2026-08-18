"""
Celery tasks wrapping the ETL pipelines. Each task opens its own
short-lived DB session (Celery workers must not share sessions
across tasks/threads).
"""

from loguru import logger

from app.database.session import SessionLocal
from app.services.etl_service import ETLService
from app.tasks.celery_app import celery_app


@celery_app.task(
    name="app.tasks.etl_tasks.sync_amfi_nav_task",
    bind=True,
    max_retries=3,
    default_retry_delay=300,
)
def sync_amfi_nav_task(self) -> dict:
    db = SessionLocal()
    try:
        result = ETLService(db).sync_amfi_nav()
        return {
            "funds_processed": result["funds_processed"],
            "nav_rows_inserted": result["nav_rows_inserted"],
        }
    except Exception as exc:  # noqa: BLE001
        logger.exception("AMFI NAV sync task failed: {}", exc)
        raise self.retry(exc=exc) from exc
    finally:
        db.close()
