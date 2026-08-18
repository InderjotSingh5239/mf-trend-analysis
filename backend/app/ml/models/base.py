"""
Common interface every forecasting model implements, so the trainer
and prediction service can treat tabular regressors (sklearn/XGBoost/
LightGBM), Prophet, and the LSTM sequence model uniformly.
"""

from __future__ import annotations

import pickle
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any

import numpy as np


class BaseForecastModel(ABC):
    """
    Two supported data contracts, selected per-model via `data_mode`:

    - "tabular": fit(X: DataFrame of features, y: Series of target NAV/return)
                 predict(X: DataFrame) -> np.ndarray
    - "sequence": fit(series: pd.Series of NAV indexed by date)
                  predict(steps: int) -> np.ndarray of future values
    """

    name: str = "base"
    data_mode: str = "tabular"

    def __init__(self, **hyperparams: Any):
        self.hyperparams = hyperparams
        self.model: Any = None
        self.is_fitted: bool = False

    @abstractmethod
    def fit(self, *args, **kwargs) -> "BaseForecastModel": ...

    @abstractmethod
    def predict(self, *args, **kwargs) -> np.ndarray: ...

    def save(self, path: str | Path) -> None:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with open(path, "wb") as fh:
            pickle.dump(self, fh)

    @classmethod
    def load(cls, path: str | Path) -> "BaseForecastModel":
        with open(path, "rb") as fh:
            return pickle.load(fh)
