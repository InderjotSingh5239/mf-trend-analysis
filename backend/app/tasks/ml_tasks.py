"""
Celery tasks for the ML pipeline: scheduled retraining of all active
funds' models (weekly) and scheduled prediction regeneration (daily,
after the AMFI NAV sync completes).
"""

from loguru import logger
from sqlalchemy import select

from app.database.session import SessionLocal
from app.ml.training.trainer import InsufficientDataError
from app.models.mutual_fund import MutualFund
from app.services.prediction_service import NoTrainedModelError, generate_predictions_for_fund
from app.services.training_service import TrainingService
from app.tasks.celery_app import celery_app


@celery_app.task(name="app.tasks.ml_tasks.train_fund_task", bind=True, max_retries=2)
def train_fund_task(self, fund_id: str) -> dict:
    db = SessionLocal()
    try:
        service = TrainingService(db)
        return service.train_fund(fund_id)
    except InsufficientDataError as exc:
        logger.warning("Skipping training for fund {}: {}", fund_id, exc)
        return {"skipped": True, "reason": str(exc)}
    except Exception as exc:  # noqa: BLE001
        logger.exception("Training failed for fund {}: {}", fund_id, exc)
        raise self.retry(exc=exc) from exc
    finally:
        db.close()


@celery_app.task(name="app.tasks.ml_tasks.generate_predictions_task", bind=True, max_retries=2)
def generate_predictions_task(self, fund_id: str) -> dict:
    db = SessionLocal()
    try:
        from app.repositories.fund_repository import FundRepository

        fund = FundRepository(db).get_by_id(fund_id)
        if fund is None:
            return {"skipped": True, "reason": "fund not found"}

        predictions = generate_predictions_for_fund(db, fund)
        return {"fund_id": str(fund_id), "predictions_generated": len(predictions)}
    except NoTrainedModelError as exc:
        logger.warning("Skipping prediction generation for fund {}: {}", fund_id, exc)
        return {"skipped": True, "reason": str(exc)}
    except Exception as exc:  # noqa: BLE001
        logger.exception("Prediction generation failed for fund {}: {}", fund_id, exc)
        raise self.retry(exc=exc) from exc
    finally:
        db.close()


@celery_app.task(name="app.tasks.ml_tasks.retrain_all_funds_task")
def retrain_all_funds_task() -> dict:
    """
    Fans out a train_fund_task for every fund that has enough NAV
    history. Intended to run on a weekly schedule (see celery_app
    beat_schedule) since retraining every fund daily would be
    wasteful — NAV data and fund fundamentals don't shift that fast.
    """
    db = SessionLocal()
    try:
        fund_ids = [str(row[0]) for row in db.execute(select(MutualFund.id)).all()]
    finally:
        db.close()

    for fund_id in fund_ids:
        train_fund_task.delay(fund_id)

    logger.info("Queued retraining for {} funds", len(fund_ids))
    return {"funds_queued": len(fund_ids)}
