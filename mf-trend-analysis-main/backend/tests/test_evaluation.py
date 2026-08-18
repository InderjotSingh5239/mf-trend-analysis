import numpy as np

from app.ml.training.evaluation import (
    compute_regression_metrics,
    confidence_score_from_rmse,
    rank_leaderboard,
    residual_std,
)


def test_compute_regression_metrics_perfect_prediction():
    y_true = np.array([100.0, 101.0, 102.0, 103.0])
    y_pred = y_true.copy()
    metrics = compute_regression_metrics(y_true, y_pred, n_features=2)

    assert metrics["mae"] == 0.0
    assert metrics["rmse"] == 0.0
    assert metrics["r2"] == 1.0


def test_compute_regression_metrics_with_error():
    y_true = np.array([100.0, 110.0, 120.0])
    y_pred = np.array([102.0, 108.0, 121.0])
    metrics = compute_regression_metrics(y_true, y_pred, n_features=1)

    assert metrics["mae"] > 0
    assert metrics["rmse"] > 0
    assert metrics["mape"] is not None


def test_residual_std_zero_for_perfect_fit():
    y_true = np.array([1.0, 2.0, 3.0])
    assert residual_std(y_true, y_true) == 0.0


def test_confidence_score_higher_for_lower_relative_error():
    high_conf = confidence_score_from_rmse(rmse=0.5, nav_scale=100.0)
    low_conf = confidence_score_from_rmse(rmse=20.0, nav_scale=100.0)
    assert high_conf > low_conf
    assert 0.0 <= low_conf <= 1.0
    assert 0.0 <= high_conf <= 1.0


def test_rank_leaderboard_orders_by_rmse_ascending():
    results = [
        {"model_name": "model_a", "metrics": {"rmse": 5.0}},
        {"model_name": "model_b", "metrics": {"rmse": 1.2}},
        {"model_name": "model_c", "metrics": {"rmse": 3.4}},
    ]
    leaderboard = rank_leaderboard(results)

    assert [e["model_name"] for e in leaderboard] == ["model_b", "model_c", "model_a"]
    assert [e["rank"] for e in leaderboard] == [1, 2, 3]


def test_rank_leaderboard_puts_missing_rmse_last():
    results = [
        {"model_name": "model_a", "metrics": {"rmse": 2.0}},
        {"model_name": "model_b", "metrics": {}},
    ]
    leaderboard = rank_leaderboard(results)
    assert leaderboard[-1]["model_name"] == "model_b"
