"""
Prediction endpoints.

Training remains admin-only. Inference only uses an already-trained
best model, so authenticated users may request generation.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.repositories.fund_repository import FundRepository
from app.schemas.prediction import (
    HistoricalNAV,
    PredictionListResponse,
)
from app.services.prediction_service import (
    NoTrainedModelError,
    PredictionGenerationError,
    generate_predictions_for_fund,
    get_latest_predictions,
)

router = APIRouter()


def _response(
    fund_id: uuid.UUID,
    predictions,
    nav_history,
) -> PredictionListResponse:
    return PredictionListResponse(
        fund_id=fund_id,
        historical_nav=[
            HistoricalNAV(date=point_date, nav=float(nav))
            for point_date, nav in nav_history
        ],
        predictions=predictions,
    )


@router.post(
    "/{fund_id}/generate",
    response_model=PredictionListResponse,
    tags=["Predictions"],
)
def generate_predictions(
    fund_id: uuid.UUID,
    _: object = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PredictionListResponse:
    repo = FundRepository(db)
    fund = repo.get_by_id(fund_id)

    if fund is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fund not found",
        )

    try:
        predictions = generate_predictions_for_fund(db, fund)
    except NoTrainedModelError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except PredictionGenerationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    nav_history = repo.get_nav_series(fund_id)

    return _response(
        fund_id,
        predictions,
        [(row.nav_date, row.nav_value) for row in nav_history],
    )


@router.get(
    "/{fund_id}",
    response_model=PredictionListResponse,
    tags=["Predictions"],
)
def read_predictions(
    fund_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> PredictionListResponse:
    repo = FundRepository(db)
    fund = repo.get_by_id(fund_id)

    if fund is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fund not found",
        )

    predictions = get_latest_predictions(db, fund_id)

    if not predictions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "No predictions found for this fund. "
                "Generate them first via POST /generate."
            ),
        )

    nav_history = repo.get_nav_series(fund_id)

    return _response(
        fund_id,
        predictions,
        [(row.nav_date, row.nav_value) for row in nav_history],
    )
