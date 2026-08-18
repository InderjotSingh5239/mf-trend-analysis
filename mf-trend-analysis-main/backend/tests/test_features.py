import random
from datetime import date, timedelta

from app.ml.features import build_feature_matrix, compute_risk_metrics


def _synthetic_nav_history(n_days: int = 400, seed: int = 42) -> list[tuple]:
    rng = random.Random(seed)
    start = date(2025, 1, 1)
    nav = 100.0
    history = []
    for i in range(n_days):
        nav *= 1 + rng.gauss(0.0003, 0.01)
        history.append((start + timedelta(days=i), nav))
    return history


def test_build_feature_matrix_produces_expected_columns():
    history = _synthetic_nav_history()
    df = build_feature_matrix(history)

    expected_columns = {
        "nav",
        "daily_return",
        "weekly_return",
        "monthly_return",
        "sma_20",
        "sma_50",
        "sma_200",
        "macd",
        "rsi_14",
        "bb_upper",
        "bb_lower",
        "drawdown",
        "lag_1",
        "lag_30",
    }
    assert expected_columns.issubset(set(df.columns))
    assert len(df) == len(history)


def test_feature_matrix_has_usable_rows_after_dropna():
    # sma_200 is the longest warmup window, so use enough history
    # that a meaningful trailing slice survives dropna().
    history = _synthetic_nav_history(n_days=600)
    df = build_feature_matrix(history)
    usable = df.dropna()
    assert len(usable) > 100


def test_rsi_bounded_between_0_and_100():
    history = _synthetic_nav_history()
    df = build_feature_matrix(history)
    rsi = df["rsi_14"].dropna()
    assert (rsi >= 0).all()
    assert (rsi <= 100).all()


def test_compute_risk_metrics_returns_expected_keys():
    history = _synthetic_nav_history()
    df = build_feature_matrix(history)
    metrics = compute_risk_metrics(df["daily_return"])

    assert "annualized_return" in metrics
    assert "annualized_volatility" in metrics
    assert "sharpe_ratio" in metrics
    assert "max_drawdown" in metrics
    assert metrics["max_drawdown"] <= 0


def test_compute_risk_metrics_handles_insufficient_data():
    short_series = build_feature_matrix(_synthetic_nav_history(n_days=10))["daily_return"]
    assert compute_risk_metrics(short_series) == {}
