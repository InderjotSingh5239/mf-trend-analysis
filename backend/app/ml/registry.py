"""
MLflow integration — experiment tracking and a lightweight local
model registry. Uses a file-based tracking URI (./mlruns) so it
works out of the box with no separate MLflow server; point
MLFLOW_TRACKING_URI at a real server in production if desired.

MLflow is an optional/heavy dependency (see PROJECT_AUDIT.md item G).
The import is deferred so the rest of the ML package — and the app
as a whole — still imports and starts cleanly when it isn't
installed. If it's unavailable, training still runs and model
artifacts/metrics are still persisted to the database via the
trainer; only the MLflow experiment-tracking side is skipped, and a
warning is logged so it's obvious tracking history isn't being kept.
"""

import os
import uuid
from contextlib import contextmanager
from pathlib import Path
from typing import Any

from loguru import logger

try:
    import mlflow

    MLRUNS_DIR = Path(os.getenv("MLFLOW_TRACKING_DIR", "mlruns")).resolve()
    MLRUNS_DIR.mkdir(exist_ok=True)
    mlflow.set_tracking_uri(f"file://{MLRUNS_DIR}")
    MLFLOW_AVAILABLE = True
except ImportError:
    mlflow = None
    MLFLOW_AVAILABLE = False
    logger.warning(
        "mlflow is not installed; training runs will not be tracked in "
        "MLflow (model artifacts/metrics are still persisted to the "
        "database by the trainer). Install `mlflow` to enable tracking."
    )

EXPERIMENT_NAME = "mutual-fund-nav-forecasting"


def _ensure_experiment() -> str:
    experiment = mlflow.get_experiment_by_name(EXPERIMENT_NAME)
    if experiment is None:
        return mlflow.create_experiment(EXPERIMENT_NAME)
    return experiment.experiment_id


@contextmanager
def mlflow_run(fund_scheme_code: str, model_name: str):
    experiment_id = _ensure_experiment()
    run_name = f"{fund_scheme_code}-{model_name}"
    with mlflow.start_run(experiment_id=experiment_id, run_name=run_name) as run:
        yield run


def log_training_result(
    fund_scheme_code: str,
    model_name: str,
    hyperparams: dict[str, Any],
    metrics: dict[str, Any],
    artifact_path: str | None = None,
) -> str:
    """
    Logs one model's training run to MLflow. Returns the MLflow run_id,
    or a locally-generated placeholder id if MLflow isn't installed
    (the training result itself is still recorded in Postgres by the
    caller regardless of MLflow availability).
    """
    if not MLFLOW_AVAILABLE:
        return f"no-mlflow-{uuid.uuid4()}"

    with mlflow_run(fund_scheme_code, model_name) as run:
        mlflow.log_params({k: v for k, v in hyperparams.items() if v is not None})
        mlflow.log_params({"fund_scheme_code": fund_scheme_code, "model_name": model_name})

        numeric_metrics = {k: v for k, v in metrics.items() if isinstance(v, (int, float))}
        mlflow.log_metrics(numeric_metrics)

        if artifact_path and Path(artifact_path).exists():
            mlflow.log_artifact(artifact_path)

        return run.info.run_id
