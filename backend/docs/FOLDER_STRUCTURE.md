# Folder Structure

```
backend/
├── .github/workflows/ci.yml     # lint -> test -> docker-build pipeline
├── alembic/
│   ├── env.py                    # wired to app settings + full ORM metadata
│   ├── script.py.mako
│   └── versions/
│       ├── 0001_core_platform.py            # users, refresh_tokens, amcs, mutual_funds, nav_history
│       ├── 0002_ml_and_predictions.py       # ml_models, model_metrics, predictions, prediction_history
│       ├── 0003_market_news.py              # market_data, economic_indicators, news
│       └── 0004_portfolio_watchlist_alerts.py  # portfolios, holdings, transactions,
│                                                 # watchlists, watchlist_items, alerts, notifications
├── app/
│   ├── main.py                   # single FastAPI() instance, CORS, routers, startup/shutdown
│   ├── core/
│   │   ├── config.py              # pydantic-settings Settings (the ONE config system)
│   │   ├── security.py            # password hashing, JWT create/decode
│   │   └── logging_config.py      # loguru setup
│   ├── database/
│   │   ├── base.py                 # shared declarative Base, UUID/Timestamp mixins, PortableJSON
│   │   └── session.py               # engine, SessionLocal, get_db() dependency
│   ├── middleware/
│   │   └── error_handler.py         # global exception handlers (validation, DB, unhandled)
│   ├── models/                    # SQLAlchemy 2.0 ORM models (one Base, one metadata)
│   │   ├── user.py                  # User, RefreshToken, UserRole
│   │   ├── amc.py, mutual_fund.py, nav_history.py
│   │   ├── ml.py                    # MLModel, ModelMetric
│   │   ├── prediction.py            # Prediction, PredictionHistory
│   │   ├── market_data.py, news.py
│   │   └── portfolio.py, watchlist.py, alerts.py
│   ├── schemas/                   # Pydantic v2 request/response contracts (mirrors models/)
│   ├── repositories/              # the ONLY layer that runs db.query()/select() (besides alembic/)
│   ├── services/                  # business logic; never imports FastAPI, fully unit-testable
│   │   ├── auth_service.py, market_service.py, news_service.py, etl_service.py
│   │   ├── training_service.py, prediction_service.py
│   │   └── portfolio_service.py, portfolio_analytics_service.py,
│   │       calculator_service.py, monte_carlo_service.py, alert_service.py
│   ├── analytics/
│   │   └── risk_analytics.py        # fund-vs-benchmark beta/alpha/Treynor (uses market_data)
│   ├── ml/                        # feature engineering, model zoo, training, registry, inference
│   │   ├── models/                  # sklearn / xgboost / lightgbm / prophet / lstm wrappers
│   │   └── training/                # trainer.py (leaderboard across all models), evaluation.py
│   ├── etl/                       # AMFI NAV, Yahoo Finance, FRED, NewsAPI extractors
│   ├── tasks/                      # Celery app + scheduled beat tasks (ETL, ML retrain, alerts)
│   └── api/
│       ├── deps.py                  # get_db, get_current_user, get_current_user_id, require_admin
│       └── v1/
│           ├── router.py             # aggregates every sub-router, mounted once in main.py
│           └── endpoints/
│               ├── health.py, auth.py, users.py, funds.py         # Phase 1
│               ├── ml.py, predictions.py                          # Phase 2
│               ├── market_data.py, news.py                        # Phase 3
│               └── portfolio.py, watchlist.py, alerts.py,         # Phase 4
│                   calculators.py, portfolio_analytics.py
├── docs/                          # this file + ARCHITECTURE / ER_DIAGRAM / DEPLOYMENT / etc.
├── scripts/
│   ├── create_admin.py             # promote/create an admin user
│   └── seed_demo_data.py           # seed a demo user + portfolio + watchlist + alert
├── tests/                         # pytest, in-memory SQLite, no external DB required
├── .env.example
├── .pre-commit-config.yaml
├── Dockerfile
├── docker-compose.yml              # api + postgres + redis + celery worker + celery beat
├── render.yaml                     # one-click Render blueprint (web + worker + beat + Postgres + Redis)
├── pyproject.toml                  # black / isort / mypy / pytest config
├── setup.cfg                       # flake8 config
├── requirements.txt / requirements-dev.txt
├── alembic.ini
└── README.md
```

## Why this layering?

- **`api/endpoints/` never imports `repositories/` directly** — routers depend on `services/`
  (or a repository only for a cheap ownership/existence check before delegating to a service),
  keeping HTTP concerns (status codes, request parsing, auth) separate from business rules.
- **`services/` never imports FastAPI** — this is what makes `CalculatorService`,
  `MonteCarloService`, `PortfolioService`, and `AnalyticsService` unit-testable with plain
  `pytest`, no `TestClient`, no event loop.
- **`repositories/` is the only place `db.query()`/`select()` appears** outside of `alembic/` —
  if the project ever needs to swap ORMs or add a caching layer, this is the only layer that
  changes.
- **One `Base`, one `metadata`, one `alembic/env.py`** — every model in `app/models/__init__.py`
  is imported so `alembic revision --autogenerate` sees the full schema, not just part of it.
- **`ml/` and `etl/` are framework-agnostic** — they can be imported and unit-tested (or reused
  in a notebook / Celery task) without booting FastAPI at all.
