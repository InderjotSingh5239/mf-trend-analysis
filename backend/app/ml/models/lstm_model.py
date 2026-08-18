"""
TensorFlow-based sequence models (LSTM, GRU) for NAV forecasting.

Uses a sliding-window supervised framing: the last `window` NAV
values predict the next value. Multi-step forecasts are produced by
recursively feeding predictions back in as input (standard approach
for autoregressive NN forecasters).

TensorFlow is a heavy dependency; the import is deferred to
`fit()`/`predict()` so the rest of the ML package (and the app as a
whole) still imports cleanly in environments where it isn't
installed — the trainer catches ImportError and simply excludes
this model from the leaderboard.
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler

from app.ml.models.base import BaseForecastModel

DEFAULT_WINDOW = 30


def _make_windows(values: np.ndarray, window: int) -> tuple[np.ndarray, np.ndarray]:
    X, y = [], []
    for i in range(window, len(values)):
        X.append(values[i - window : i])
        y.append(values[i])
    return np.array(X), np.array(y)


class _RecurrentModelBase(BaseForecastModel):
    data_mode = "sequence"
    cell_type = "LSTM"

    def __init__(self, window: int = DEFAULT_WINDOW, epochs: int = 30, batch_size: int = 32, **hyperparams):
        super().__init__(**hyperparams)
        self.window = window
        self.epochs = epochs
        self.batch_size = batch_size
        self.scaler = MinMaxScaler()
        self._last_window: np.ndarray | None = None

    def _build_model(self, input_shape: tuple[int, int]):
        try:
            from tensorflow.keras.layers import GRU, LSTM, Dense
            from tensorflow.keras.models import Sequential
        except ImportError as exc:
            raise ImportError(
                "tensorflow is not installed. Install it to enable LSTM/GRU forecasting."
            ) from exc

        RecurrentLayer = LSTM if self.cell_type == "LSTM" else GRU

        model = Sequential(
            [
                RecurrentLayer(64, activation="tanh", input_shape=input_shape, return_sequences=True),
                RecurrentLayer(32, activation="tanh"),
                Dense(16, activation="relu"),
                Dense(1),
            ]
        )
        model.compile(optimizer="adam", loss="mse", metrics=["mae"])
        return model

    def fit(self, series: pd.Series) -> "_RecurrentModelBase":
        values = series.to_numpy().reshape(-1, 1)
        scaled = self.scaler.fit_transform(values).flatten()

        X, y = _make_windows(scaled, self.window)
        if len(X) < 10:
            raise ValueError(
                f"Not enough history to train {self.cell_type} model "
                f"(need > {self.window + 10} points, got {len(series)})"
            )
        X = X.reshape((X.shape[0], X.shape[1], 1))

        self.model = self._build_model(input_shape=(self.window, 1))
        self.model.fit(X, y, epochs=self.epochs, batch_size=self.batch_size, verbose=0, shuffle=False)

        self._last_window = scaled[-self.window :]
        self.is_fitted = True
        return self

    def predict(self, steps: int) -> np.ndarray:
        if not self.is_fitted or self._last_window is None:
            raise RuntimeError("Model must be fit before predicting")

        window = self._last_window.copy()
        preds_scaled = []
        for _ in range(steps):
            x = window.reshape((1, self.window, 1))
            next_val = self.model.predict(x, verbose=0)[0, 0]
            preds_scaled.append(next_val)
            window = np.append(window[1:], next_val)

        preds_scaled = np.array(preds_scaled).reshape(-1, 1)
        return self.scaler.inverse_transform(preds_scaled).flatten()

    def save(self, path):
        # Keras models aren't reliably picklable with the base class's
        # generic pickle.dump; delegate to Keras' native save format
        # alongside a small pickled wrapper for the scaler/state.
        import pickle
        from pathlib import Path

        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        self.model.save(str(path) + ".keras")
        state = {
            "window": self.window,
            "scaler": self.scaler,
            "last_window": self._last_window,
            "cell_type": self.cell_type,
        }
        with open(str(path) + ".state.pkl", "wb") as fh:
            pickle.dump(state, fh)

    @classmethod
    def load(cls, path):
        import pickle

        from tensorflow.keras.models import load_model

        with open(str(path) + ".state.pkl", "rb") as fh:
            state = pickle.load(fh)

        instance = cls(window=state["window"])
        instance.model = load_model(str(path) + ".keras")
        instance.scaler = state["scaler"]
        instance._last_window = state["last_window"]
        instance.cell_type = state["cell_type"]
        instance.is_fitted = True
        return instance


class LSTMModel(_RecurrentModelBase):
    name = "lstm"
    cell_type = "LSTM"


class GRUModel(_RecurrentModelBase):
    name = "gru"
    cell_type = "GRU"
