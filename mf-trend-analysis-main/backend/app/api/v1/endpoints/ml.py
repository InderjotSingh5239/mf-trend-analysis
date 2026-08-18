"""
ML endpoints: trigger training (admin) and view the model leaderboard
for a fund.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import require_admin
from app.database.session import get_db
from app.ml.training.trainer import InsufficientDataError
from app.models.ml import MLModel
from app.schemas.ml import MLModelRead, TrainingResponse
from app.services.training_service import FundNotFoundError, TrainingService

router = APIRouter()


@router.post(
    "/train/{fund_id}",
    response_model=TrainingResponse,
    tags=["ML"],
    dependencies=[Depends(require_admin)],
)
def train_fund(fund_id: uuid.UUID, db: Session = Depends(get_db)) -> TrainingResponse:
    """
    Synchronously trains every registered model family for a fund
    and stores the results. For large-scale/batch retraining, use
    the Celery task (app.tasks.ml_tasks.train_fund_task) instead.
    """
    service = TrainingService(db)
    try:
        result = service.train_fund(fund_id)
    except FundNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except InsufficientDataError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    return TrainingResponse(**result)


@router.get("/leaderboard/{fund_id}", response_model=list[MLModelRead], tags=["ML"])
def get_leaderboard(fund_id: uuid.UUID, db: Session = Depends(get_db)) -> list[MLModelRead]:
    stmt = (
        select(MLModel)
        .options(selectinload(MLModel.metrics))
        .where(MLModel.fund_id == fund_id)
        .order_by(MLModel.created_at.desc())
    )
    models = list(db.execute(stmt).scalars().all())
    return models  # type: ignore[return-value]
