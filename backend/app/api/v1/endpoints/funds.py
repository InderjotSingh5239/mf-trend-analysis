"""
Mutual fund endpoints: list/search, detail with NAV history, and an
admin-only trigger to run the AMFI NAV sync on demand (in addition
to the scheduled Celery beat task).
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.database.session import get_db
from app.repositories.fund_repository import FundRepository
from app.schemas.fund import (
    MutualFundDetail,
    MutualFundListResponse,
    MutualFundRead,
    MutualFundSyncResponse,
    TrendingFundsResponse,
)
from app.services.etl_service import ETLService

router = APIRouter()


@router.get("/trending", response_model=TrendingFundsResponse, tags=["Funds"])
def get_trending_funds(
    limit: int = Query(6, ge=1, le=50),
    db: Session = Depends(get_db),
) -> TrendingFundsResponse:
    """
    Funds ranked by real trailing 3-year CAGR, computed from stored NAV
    history (see FundRepository.get_trailing_cagr_map). This is
    distinct from "top movers" (single-day NAV change) — see
    /funds?sort_by=nav_change_percent for that.

    Funds without ~3 years of NAV history are not included: the metric
    is never fabricated from a shorter window.
    """
    repo = FundRepository(db)
    cagr_map = repo.get_trailing_cagr_map(years=3.0)

    if not cagr_map:
        return TrendingFundsResponse(items=[])

    top_ids = sorted(cagr_map, key=lambda fid: cagr_map[fid], reverse=True)[:limit]
    funds = [repo.get_by_id(fid) for fid in top_ids]
    funds = [f for f in funds if f is not None]

    nav_map = repo.get_latest_nav_map([f.id for f in funds])
    items = []
    for fund in funds:
        base = _with_nav_change(fund, nav_map)
        items.append(base.model_copy(update={"cagr_3y": cagr_map.get(fund.id)}))

    return TrendingFundsResponse(items=items)


@router.get("", response_model=MutualFundListResponse, tags=["Funds"])
def list_funds(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(default=None, description="Search by scheme name"),
    category: str | None = Query(default=None),
    amc: str | None = Query(default=None),
    risk_level: str | None = Query(default=None),
    max_expense_ratio: float | None = Query(default=None, ge=0),
    sort_by: str = Query(default="scheme_name"),
    sort_order: str = Query(default="asc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
) -> MutualFundListResponse:
    repo = FundRepository(db)
    skip = (page - 1) * page_size
    items, total = repo.list_funds(
        skip=skip,
        limit=page_size,
        search=search,
        category=category,
        amc=amc,
        risk_level=risk_level,
        max_expense_ratio=max_expense_ratio,
        sort_by=sort_by,
        sort_order=sort_order,
    )

    nav_map = repo.get_latest_nav_map([fund.id for fund in items])
    enriched = [_with_nav_change(fund, nav_map) for fund in items]

    return MutualFundListResponse(total=total, page=page, page_size=page_size, items=enriched)


@router.get("/{fund_id}", response_model=MutualFundDetail, tags=["Funds"])
def get_fund(fund_id: uuid.UUID, db: Session = Depends(get_db)) -> MutualFundDetail:
    repo = FundRepository(db)
    fund = repo.get_by_id(fund_id)
    if fund is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fund not found")

    nav_map = repo.get_latest_nav_map([fund.id])
    base = _with_nav_change(fund, nav_map)
    return MutualFundDetail(**base.model_dump(), nav_history=fund.nav_history)  # type: ignore[arg-type]


def _with_nav_change(fund, nav_map: dict[uuid.UUID, tuple[float, float | None]]) -> MutualFundRead:
    base = MutualFundRead.model_validate(fund)
    latest, previous = nav_map.get(fund.id, (None, None))
    change_percent = None
    if latest is not None and previous:
        change_percent = round((latest - previous) / previous * 100, 4)
    return base.model_copy(update={"latest_nav": latest, "nav_change_percent": change_percent})


@router.post(
    "/sync/amfi",
    response_model=MutualFundSyncResponse,
    tags=["Funds"],
)
def trigger_amfi_sync(
    db: Session = Depends(get_db),
    _: object = Depends(require_admin),
) -> MutualFundSyncResponse:
    """
    Manually trigger the AMFI NAV ETL pipeline.

    This endpoint is restricted to administrators.
    """
    result = ETLService(db).sync_amfi_nav()
    return MutualFundSyncResponse(**result)
