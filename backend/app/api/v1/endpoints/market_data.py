"""
Market data endpoints: browse tracked indices/commodities/forex,
trigger Yahoo Finance + FRED syncs (admin), and read a fund's
relative risk profile (Beta/Alpha/Treynor vs a benchmark index).
"""

import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.analytics.risk_analytics import InsufficientBenchmarkDataError, compute_fund_risk_profile
from app.api.deps import require_admin
from app.database.session import get_db
from app.etl.fred_etl import FredNotConfiguredError
from app.etl.yahoo_finance_etl import TRACKED_SYMBOLS
from app.repositories.market_data_repository import MarketDataRepository
from app.schemas.market import (
    FredSyncResponse,
    FundRiskProfile,
    MarketDataPoint,
    MarketDataSeriesResponse,
    MarketSyncResponse,
)
from app.services.market_service import MarketDataService

router = APIRouter()


@router.get("", response_model=list[MarketDataPoint], tags=["Market Data"])
def list_latest_market_data(db: Session = Depends(get_db)) -> list[MarketDataPoint]:
    """Latest value for every tracked index/commodity/forex symbol."""
    repo = MarketDataRepository(db)
    return repo.get_latest_per_symbol()  # type: ignore[return-value]


@router.get("/{symbol}", response_model=MarketDataSeriesResponse, tags=["Market Data"])
def get_market_series(
    symbol: str,
    start: date | None = Query(default=None),
    db: Session = Depends(get_db),
) -> MarketDataSeriesResponse:
    if symbol not in TRACKED_SYMBOLS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Symbol '{symbol}' is not tracked. Available: {list(TRACKED_SYMBOLS.keys())}",
        )
    repo = MarketDataRepository(db)
    points = repo.get_series(symbol, start=start)
    return MarketDataSeriesResponse(symbol=symbol, points=points)  # type: ignore[arg-type]


@router.post(
    "/sync/yahoo",
    response_model=MarketSyncResponse,
    tags=["Market Data", "Admin"],
    dependencies=[Depends(require_admin)],
)
def trigger_yahoo_sync(db: Session = Depends(get_db)) -> MarketSyncResponse:
    result = MarketDataService(db).sync_yahoo_finance()
    return MarketSyncResponse(**result)


@router.post(
    "/sync/fred",
    response_model=FredSyncResponse,
    tags=["Market Data", "Admin"],
    dependencies=[Depends(require_admin)],
)
def trigger_fred_sync(db: Session = Depends(get_db)) -> FredSyncResponse:
    try:
        result = MarketDataService(db).sync_fred()
    except FredNotConfiguredError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    return FredSyncResponse(**result)


@router.get("/funds/{fund_id}/risk-profile", response_model=FundRiskProfile, tags=["Market Data", "Funds"])
def get_fund_risk_profile(fund_id: uuid.UUID, db: Session = Depends(get_db)) -> FundRiskProfile:
    try:
        profile = compute_fund_risk_profile(db, fund_id)
    except InsufficientBenchmarkDataError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    return FundRiskProfile(**profile)
