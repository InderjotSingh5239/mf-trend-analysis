"""
Celery tasks for the market data pipelines (Yahoo Finance indices/
commodities/forex, FRED macro indicators).
"""

from loguru import logger

from app.database.session import SessionLocal
from app.etl.fred_etl import FredNotConfiguredError
from app.services.market_service import MarketDataService
from app.tasks.celery_app import celery_app


@celery_app.task(
    name="app.tasks.market_tasks.sync_yahoo_finance_task", bind=True, max_retries=3, default_retry_delay=300
)
def sync_yahoo_finance_task(self) -> dict:
    db = SessionLocal()
    try:
        return MarketDataService(db).sync_yahoo_finance()
    except Exception as exc:  # noqa: BLE001
        logger.exception("Yahoo Finance sync task failed: {}", exc)
        raise self.retry(exc=exc) from exc
    finally:
        db.close()


@celery_app.task(
    name="app.tasks.market_tasks.sync_fred_task", bind=True, max_retries=3, default_retry_delay=300
)
def sync_fred_task(self) -> dict:
    db = SessionLocal()
    try:
        return MarketDataService(db).sync_fred()
    except FredNotConfiguredError as exc:
        logger.warning("Skipping FRED sync: {}", exc)
        return {"skipped": True, "reason": str(exc)}
    except Exception as exc:  # noqa: BLE001
        logger.exception("FRED sync task failed: {}", exc)
        raise self.retry(exc=exc) from exc
    finally:
        db.close()
