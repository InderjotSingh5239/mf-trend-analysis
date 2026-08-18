"""
Prediction endpoints: trigger multi-horizon forecast generation
(admin) and fetch the latest predictions for a fund.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.database.session import get_db
from app.repositories.fund_repository import FundRepository
from app.schemas.prediction import PredictionListResponse
from app.services.prediction_service import (
    NoTrainedModelError,
    generate_predictions_for_fund,
    get_latest_predictions,
)

router = APIRouter()


@router.post(
    "/{fund_id}/generate",
    response_model=PredictionListResponse,
    tags=["Predictions"],
)
def generate_predictions(fund_id: uuid.UUID, db: Session = Depends(get_db)) -> PredictionListResponse:
    fund = FundRepository(db).get_by_id(fund_id)
    if fund is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fund not found")

    try:
        predictions = generate_predictions_for_fund(db, fund)
    except NoTrainedModelError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    return PredictionListResponse(fund_id=fund_id, predictions=predictions)  # type: ignore[arg-type]


@router.get("/{fund_id}", response_model=PredictionListResponse, tags=["Predictions"])
def read_predictions(fund_id: uuid.UUID, db: Session = Depends(get_db)) -> PredictionListResponse:
    predictions = get_latest_predictions(db, fund_id)
    if not predictions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No predictions found for this fund. Generate them first via POST /generate.",
        )
    return PredictionListResponse(fund_id=fund_id, predictions=predictions)  # type: ignore[arg-type]
