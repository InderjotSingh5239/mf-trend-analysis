"""
Aggregates all v1 endpoint routers under a single APIRouter.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    alerts,
    auth,
    calculators,
    funds,
    health,
    market_data,
    ml,
    news,
    portfolio,
    portfolio_analytics,
    predictions,
    users,
    watchlist,
)

api_router = APIRouter()

# --- Phase 1: Core Platform ---
api_router.include_router(health.router)
api_router.include_router(auth.router, prefix="/auth")
api_router.include_router(users.router, prefix="/users")
api_router.include_router(funds.router, prefix="/funds")

# --- Phase 2: Machine Learning ---
api_router.include_router(ml.router, prefix="/ml")
api_router.include_router(predictions.router, prefix="/predictions")

# --- Phase 3: Market Data + News Intelligence ---
api_router.include_router(market_data.router, prefix="/market-data")
api_router.include_router(news.router, prefix="/news")

# --- Phase 4: Portfolio, Watchlist, Alerts, Calculators, Analytics ---
# (these routers already declare their own prefixes, e.g. "/portfolios")
api_router.include_router(portfolio.router)
api_router.include_router(watchlist.router)
api_router.include_router(alerts.router)
api_router.include_router(calculators.router)
api_router.include_router(portfolio_analytics.router)
