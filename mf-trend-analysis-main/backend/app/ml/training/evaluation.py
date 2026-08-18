"""
Model evaluation metrics used to build the leaderboard and rank
models: MAE, MSE, RMSE, MAPE, R^2, adjusted R^2, plus residual-based
confidence scoring used by the prediction engine.
"""

import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


def compute_regression_metrics(y_true: np.ndarray, y_pred: np.ndarray, n_features: int = 1) -> dict:
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)

    mae = mean_absolute_error(y_true, y_pred)
    mse = mean_squared_error(y_true, y_pred)
    rmse = float(np.sqrt(mse))

    nonzero_mask = y_true != 0
    mape = (
        float(np.mean(np.abs((y_true[nonzero_mask] - y_pred[nonzero_mask]) / y_true[nonzero_mask])) * 100)
        if nonzero_mask.any()
        else None
    )

    r2 = r2_score(y_true, y_pred) if len(y_true) > 1 else None

    n = len(y_true)
    adjusted_r2 = None
    if r2 is not None and n > n_features + 1:
        adjusted_r2 = 1 - (1 - r2) * (n - 1) / (n - n_features - 1)

    return {
        "mae": float(mae),
        "mse": float(mse),
        "rmse": rmse,
        "mape": mape,
        "r2": float(r2) if r2 is not None else None,
        "adjusted_r2": float(adjusted_r2) if adjusted_r2 is not None else None,
        "n_samples": n,
    }


def residual_std(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    residuals = np.asarray(y_true, dtype=float) - np.asarray(y_pred, dtype=float)
    return float(np.std(residuals))


def confidence_score_from_rmse(rmse: float, nav_scale: float) -> float:
    """
    Maps RMSE (relative to the NAV's typical magnitude) to a 0-1
    confidence score. Smaller relative error => higher confidence.
    """
    if nav_scale <= 0:
        return 0.0
    relative_error = rmse / nav_scale
    score = 1.0 / (1.0 + relative_error * 10)
    return float(max(0.0, min(1.0, score)))


def rank_leaderboard(results: list[dict]) -> list[dict]:
    """
    results: list of {"model_name": str, "metrics": {...}}
    Ranks ascending by RMSE (lower is better); entries missing RMSE go last.
    """

    def sort_key(entry: dict):
        rmse = entry.get("metrics", {}).get("rmse")
        return rmse if rmse is not None else float("inf")

    ranked = sorted(results, key=sort_key)
    for idx, entry in enumerate(ranked, start=1):
        entry["rank"] = idx
    return ranked
