"""
Import every model here so that `Base.metadata` is fully populated
for Alembic autogenerate and for `Base.metadata.create_all()`.
"""

from app.models.alerts import Alert, AlertStatus, AlertType, Notification  # noqa: F401
from app.models.amc import AMC  # noqa: F401
from app.models.market_data import EconomicIndicator, MarketCategory, MarketData  # noqa: F401
from app.models.ml import MLModel, ModelMetric, ModelStatus  # noqa: F401
from app.models.mutual_fund import MutualFund  # noqa: F401
from app.models.nav_history import NAVHistory  # noqa: F401
from app.models.news import News, SentimentLabel  # noqa: F401
from app.models.portfolio import Holding, Portfolio, Transaction, TransactionType  # noqa: F401
from app.models.prediction import Prediction, PredictionHistory, Recommendation  # noqa: F401
from app.models.user import RefreshToken, User, UserRole  # noqa: F401
from app.models.watchlist import Watchlist, WatchlistItem  # noqa: F401
