"""
Training orchestrator: loads a fund's NAV history, builds features,
trains every registered model family, evaluates them on a held-out
time-ordered test split, logs to MLflow, persists model artifacts to
disk and metadata/metrics to the database, and marks the
best-performing model as the active one used for predictions.
"""

import uuid
from pathlib import Path

import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from app.ml.data_loader import load_nav_series
from app.ml.explainability import compute_shap_feature_importance
from app.ml.features import build_feature_matrix
from app.ml.models.lightgbm_model import LightGBMModel
from app.ml.models.lstm_model import GRUModel, LSTMModel
from app.ml.models.prophet_model import ProphetModel
from app.ml.models.sklearn_models import GradientBoostingModel, LinearRegressionModel, RandomForestModel
from app.ml.models.xgboost_model import XGBoostModel
from app.ml.registry import log_training_result
from app.ml.training.evaluation import compute_regression_metrics, rank_leaderboard
from app.models.ml import MLModel, ModelMetric, ModelStatus
from app.models.mutual_fund import MutualFund

MODEL_STORAGE_DIR = Path("model_storage")
TEST_FRACTION = 0.15
MIN_TRAINING_ROWS = 120

TABULAR_MODELS = [
    LinearRegressionModel,
    RandomForestModel,
    GradientBoostingModel,
    XGBoostModel,
    LightGBMModel,
]
SEQUENCE_MODELS = [ProphetModel, LSTMModel, GRUModel]

FEATURE_COLUMNS_EXCLUDE = {"nav"}


class InsufficientDataError(Exception):
    pass


def _prepare_tabular_dataset(feature_df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    df = feature_df.dropna()
    if len(df) < MIN_TRAINING_ROWS:
        raise InsufficientDataError(
            f"Only {len(df)} usable rows after feature engineering; need >= {MIN_TRAINING_ROWS}"
        )
    target = df["nav"].shift(-1).dropna()
    features = df.loc[target.index].drop(columns=[c for c in FEATURE_COLUMNS_EXCLUDE if c in df.columns])
    return features, target


def _time_split(X: pd.DataFrame, y: pd.Series, test_fraction: float = TEST_FRACTION):
    split_idx = int(len(X) * (1 - test_fraction))
    return X.iloc[:split_idx], X.iloc[split_idx:], y.iloc[:split_idx], y.iloc[split_idx:]


def _train_tabular_models(X_train, X_test, y_train, y_test, scheme_code: str) -> list[dict]:
    results = []
    for ModelCls in TABULAR_MODELS:
        try:
            model = ModelCls()
            model.fit(X_train, y_train)
            preds = model.predict(X_test)
            metrics = compute_regression_metrics(y_test.to_numpy(), preds, n_features=X_train.shape[1])

            importance = {}
            if hasattr(model, "feature_importances"):
                importance = model.feature_importances(X_train.columns.tolist())
            elif ModelCls in (XGBoostModel, RandomForestModel):
                importance = compute_shap_feature_importance(model.model, X_test)

            results.append(
                {
                    "model_name": model.name,
                    "model_obj": model,
                    "metrics": metrics,
                    "feature_importance": importance,
                    "hyperparams": model.hyperparams,
                }
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Tabular model {} failed for {}: {}", ModelCls.__name__, scheme_code, exc)
    return results


def _train_sequence_models(nav_series: pd.Series, test_fraction: float, scheme_code: str) -> list[dict]:
    results = []
    split_idx = int(len(nav_series) * (1 - test_fraction))
    train_series = nav_series.iloc[:split_idx]
    test_series = nav_series.iloc[split_idx:]
    steps = len(test_series)

    if steps < 5:
        return results

    for ModelCls in SEQUENCE_MODELS:
        try:
            model = ModelCls()
            model.fit(train_series)
            preds = model.predict(steps)
            metrics = compute_regression_metrics(test_series.to_numpy(), preds, n_features=1)
            results.append(
                {
                    "model_name": model.name,
                    "model_obj": model,
                    "metrics": metrics,
                    "feature_importance": {},
                    "hyperparams": model.hyperparams,
                }
            )
        except ImportError as exc:
            logger.info(
                "Skipping {} for {} (optional dependency missing): {}", ModelCls.__name__, scheme_code, exc
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Sequence model {} failed for {}: {}", ModelCls.__name__, scheme_code, exc)
    return results


def train_fund_models(db: Session, fund: MutualFund) -> dict:
    """
    Full training run for one fund: trains every available model,
    evaluates on a held-out time split, persists artifacts + DB
    records, and flags the best model as active.

    Returns a leaderboard summary dict.
    """
    nav_history = load_nav_series(db, fund.id)
    if len(nav_history) < MIN_TRAINING_ROWS:
        raise InsufficientDataError(
            f"Fund {fund.scheme_code} has only {len(nav_history)} NAV points; "
            f"need >= {MIN_TRAINING_ROWS} to train"
        )

    feature_df = build_feature_matrix(nav_history)
    nav_series = feature_df["nav"]

    X, y = _prepare_tabular_dataset(feature_df)
    X_train, X_test, y_train, y_test = _time_split(X, y)

    tabular_results = _train_tabular_models(X_train, X_test, y_train, y_test, fund.scheme_code)
    sequence_results = _train_sequence_models(nav_series, TEST_FRACTION, fund.scheme_code)

    all_results = tabular_results + sequence_results
    if not all_results:
        raise RuntimeError(f"All models failed to train for fund {fund.scheme_code}")

    leaderboard = rank_leaderboard(
        [{"model_name": r["model_name"], "metrics": r["metrics"]} for r in all_results]
    )
    rank_by_name = {entry["model_name"]: entry["rank"] for entry in leaderboard}

    fund_dir = MODEL_STORAGE_DIR / fund.scheme_code
    fund_dir.mkdir(parents=True, exist_ok=True)

    # Deactivate previously-best models for this fund before inserting new ones.
    db.query(MLModel).filter(MLModel.fund_id == fund.id, MLModel.is_best.is_(True)).update({"is_best": False})

    saved_models: list[MLModel] = []
    for result in all_results:
        model_obj = result["model_obj"]
        artifact_path = fund_dir / f"{result['model_name']}_{uuid.uuid4().hex[:8]}"
        model_obj.save(artifact_path)

        run_id = log_training_result(
            fund_scheme_code=fund.scheme_code,
            model_name=result["model_name"],
            hyperparams=result["hyperparams"],
            metrics=result["metrics"],
        )

        db_model = MLModel(
            fund_id=fund.id,
            model_name=result["model_name"],
            artifact_path=str(artifact_path),
            mlflow_run_id=run_id,
            hyperparameters=result["hyperparams"],
            status=ModelStatus.READY,
            is_best=False,
        )
        db.add(db_model)
        db.flush()

        db.add(
            ModelMetric(
                model_id=db_model.id,
                mae=result["metrics"].get("mae"),
                mse=result["metrics"].get("mse"),
                rmse=result["metrics"].get("rmse"),
                mape=result["metrics"].get("mape"),
                r2=result["metrics"].get("r2"),
                adjusted_r2=result["metrics"].get("adjusted_r2"),
                rank=rank_by_name.get(result["model_name"]),
            )
        )
        saved_models.append(db_model)

    best_entry = leaderboard[0]
    best_model = next(m for m in saved_models if m.model_name == best_entry["model_name"])
    best_model.is_best = True
    db.add(best_model)
    db.commit()

    logger.info(
        "Training complete for {}: best model = {} (RMSE={:.4f})",
        fund.scheme_code,
        best_entry["model_name"],
        best_entry["metrics"].get("rmse", float("nan")),
    )

    return {
        "fund_id": str(fund.id),
        "scheme_code": fund.scheme_code,
        "leaderboard": leaderboard,
        "best_model": best_entry["model_name"],
        "models_trained": len(all_results),
    }
