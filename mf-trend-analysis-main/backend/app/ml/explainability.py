"""
SHAP explainability for tree-based tabular models (RandomForest,
GradientBoosting, XGBoost, LightGBM). Linear, Prophet, and LSTM
models are explained via their own native mechanisms (coefficients,
component decomposition, and omitted respectively) rather than SHAP,
since SHAP's TreeExplainer doesn't apply to them.
"""

import numpy as np
import pandas as pd


def compute_shap_feature_importance(model, X_sample: pd.DataFrame, max_rows: int = 200) -> dict:
    """
    Returns {feature_name: mean_abs_shap_value}, sorted descending.
    Falls back to an empty dict if shap isn't installed or the model
    type isn't tree-based (caller should handle gracefully).
    """
    try:
        import shap
    except ImportError:
        return {}

    sample = X_sample.tail(max_rows)

    try:
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(sample)
    except Exception:
        return {}

    mean_abs = np.abs(shap_values).mean(axis=0)
    importance = dict(zip(sample.columns.tolist(), mean_abs.tolist()))
    return dict(sorted(importance.items(), key=lambda kv: kv[1], reverse=True))


def top_features_explanation(importance: dict, top_n: int = 5) -> str:
    """
    Turns a feature-importance dict into a human-readable explanation
    string used in the AI-generated recommendation text.
    """
    if not importance:
        return "Explanation unavailable for this model type."

    top_items = list(importance.items())[:top_n]
    parts = [f"{name.replace('_', ' ')}" for name, _ in top_items]
    return "Key drivers of this prediction: " + ", ".join(parts) + "."
