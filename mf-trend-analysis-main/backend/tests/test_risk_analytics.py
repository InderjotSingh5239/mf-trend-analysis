import random
from datetime import date, timedelta

import pandas as pd

from app.ml.features import compute_relative_risk_metrics, compute_risk_metrics


def _synthetic_returns(n: int, mean: float, std: float, seed: int) -> pd.Series:
    rng = random.Random(seed)
    start = date(2025, 1, 1)
    values = {start + timedelta(days=i): rng.gauss(mean, std) for i in range(n)}
    series = pd.Series(values).sort_index()
    series.index = pd.to_datetime(series.index)
    return series


def test_beta_near_one_for_series_that_tracks_benchmark_closely():
    rng = random.Random(3)
    benchmark_returns = _synthetic_returns(300, 0.0004, 0.01, seed=3)
    # Fund returns = benchmark + small independent noise -> beta should be close to 1
    fund_returns = benchmark_returns + pd.Series(
        [rng.gauss(0, 0.001) for _ in range(len(benchmark_returns))],
        index=benchmark_returns.index,
    )

    metrics = compute_relative_risk_metrics(fund_returns, benchmark_returns)
    assert "beta" in metrics
    assert 0.7 < metrics["beta"] < 1.3


def test_relative_metrics_empty_when_no_overlap():
    a = _synthetic_returns(50, 0.0004, 0.01, seed=1)
    b = _synthetic_returns(50, 0.0004, 0.01, seed=2)
    b.index = b.index + pd.Timedelta(days=10_000)  # no overlapping dates
    assert compute_relative_risk_metrics(a, b) == {}


def test_own_risk_metrics_present_alongside_relative():
    fund_returns = _synthetic_returns(300, 0.0005, 0.012, seed=5)
    own = compute_risk_metrics(fund_returns)
    assert own["sharpe_ratio"] is not None
    assert own["max_drawdown"] <= 0
