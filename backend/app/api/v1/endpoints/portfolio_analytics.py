import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id
from app.database.session import get_db
from app.repositories.portfolio_repository import PortfolioRepository
from app.services.portfolio_analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Analytics"])


class RiskMetricsRequest(BaseModel):
    daily_returns: list[float]
    risk_free_rate_annual: float | None = None


class RiskMetricsResponse(BaseModel):
    annualized_volatility_percent: float
    sharpe_ratio: float | None
    sortino_ratio: float | None


class BenchmarkComparisonRequest(BaseModel):
    portfolio_return_percent: float
    benchmark_return_percent: float


class DrawdownRequest(BaseModel):
    cumulative_values: list[float]


class DrawdownResponse(BaseModel):
    max_drawdown_percent: float


class BetaRequest(BaseModel):
    portfolio_returns: list[float]
    benchmark_returns: list[float]


class BetaResponse(BaseModel):
    beta: float | None


@router.get("/portfolio/{portfolio_id}/allocation")
def get_allocation(
    portfolio_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    repo = PortfolioRepository(db)
    portfolio = repo.get_portfolio(portfolio_id)
    if portfolio is None or portfolio.user_id != user_id:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    holdings = repo.list_holdings(portfolio_id)
    return {
        "sector_allocation": AnalyticsService.sector_allocation(holdings),
        "category_allocation": AnalyticsService.category_allocation(holdings),
        "diversification_score": AnalyticsService.diversification_score(holdings),
    }


@router.post("/risk-metrics", response_model=RiskMetricsResponse)
def get_risk_metrics(payload: RiskMetricsRequest):
    return RiskMetricsResponse(
        annualized_volatility_percent=AnalyticsService.annualized_volatility(payload.daily_returns),
        sharpe_ratio=AnalyticsService.sharpe_ratio(payload.daily_returns, payload.risk_free_rate_annual),
        sortino_ratio=AnalyticsService.sortino_ratio(payload.daily_returns, payload.risk_free_rate_annual),
    )


@router.post("/benchmark-comparison")
def benchmark_comparison(payload: BenchmarkComparisonRequest):
    return AnalyticsService.benchmark_comparison(
        payload.portfolio_return_percent, payload.benchmark_return_percent
    )


@router.post("/drawdown", response_model=DrawdownResponse)
def drawdown(payload: DrawdownRequest):
    return DrawdownResponse(max_drawdown_percent=AnalyticsService.max_drawdown(payload.cumulative_values))


@router.post("/beta", response_model=BetaResponse)
def beta(payload: BetaRequest):
    return BetaResponse(beta=AnalyticsService.beta(payload.portfolio_returns, payload.benchmark_returns))
