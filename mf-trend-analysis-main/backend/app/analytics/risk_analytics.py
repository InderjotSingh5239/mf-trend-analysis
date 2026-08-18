"""
Relative risk analytics: Beta, Alpha, and Treynor ratio computed
against a real benchmark index series (NIFTY 50 by default), now
that Phase 3 provides real market_data. Previously (Phase 2) these
were documented as deferred because no benchmark series existed.
"""

import uuid
from datetime import date, timedelta

import pandas as pd
from sqlalchemy.orm import Session

from app.ml.data_loader import load_nav_series
from app.ml.features import build_nav_frame, compute_relative_risk_metrics, compute_risk_metrics
from app.repositories.market_data_repository import MarketDataRepository

DEFAULT_BENCHMARK_SYMBOL = "^NSEI"  # NIFTY 50
RISK_FREE_RATE_ANNUAL = 0.065  # approx. India 10Y G-Sec-adjusted rate; tune as needed


class InsufficientBenchmarkDataError(Exception):
    pass


def compute_fund_risk_profile(
    db: Session,
    fund_id: uuid.UUID,
    benchmark_symbol: str = DEFAULT_BENCHMARK_SYMBOL,
    lookback_days: int = 365,
) -> dict:
    """
    Returns Sharpe/Sortino/max-drawdown (fund-only) plus Beta/Alpha
    (fund vs benchmark) computed over the trailing `lookback_days`.
    """
    nav_history = load_nav_series(db, fund_id)
    if len(nav_history) < 60:
        raise InsufficientBenchmarkDataError("Not enough NAV history to compute risk metrics")

    fund_df = build_nav_frame(nav_history)
    fund_returns = fund_df["nav"].pct_change()

    start = date.today() - timedelta(days=lookback_days)
    market_repo = MarketDataRepository(db)
    benchmark_rows = market_repo.get_series(benchmark_symbol, start=start)

    own_metrics = compute_risk_metrics(fund_returns, RISK_FREE_RATE_ANNUAL)

    relative_metrics: dict = {}
    if benchmark_rows:
        benchmark_series = pd.Series(
            {row.data_date: float(row.close_value) for row in benchmark_rows}
        ).sort_index()
        benchmark_series.index = pd.to_datetime(benchmark_series.index)
        benchmark_returns = benchmark_series.pct_change()

        relative_metrics = compute_relative_risk_metrics(fund_returns, benchmark_returns)
        if relative_metrics and own_metrics.get("sharpe_ratio") is not None:
            beta = relative_metrics.get("beta")
            if beta and beta != 0:
                ann_return = own_metrics.get("annualized_return", 0.0)
                treynor = (ann_return - RISK_FREE_RATE_ANNUAL) / beta
                relative_metrics["treynor_ratio"] = float(treynor)

    return {
        "benchmark_symbol": benchmark_symbol,
        "benchmark_data_available": bool(benchmark_rows),
        **own_metrics,
        **relative_metrics,
    }
