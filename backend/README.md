# MF Intelligence Platform — Backend

A production-ready FastAPI backend for a mutual-fund research, prediction, and portfolio
management platform — authentication & RBAC, an ML prediction engine, market data & news
intelligence, and full portfolio/watchlist/alert management, merged from five build phases
into one deployable service.

- **Swagger UI**: `/docs` · **ReDoc**: `/redoc` · **Health check**: `/api/v1/health`
- **65/65 tests passing** · **flake8/black/isort clean** · **51 unique API routes, zero duplicates**

---

## What's inside

| Domain | Highlights |
|---|---|
| **Auth & RBAC** | JWT access + rotating refresh tokens, bcrypt password hashing, role-based admin dependency |
| **Fund reference data** | AMC / MutualFund / NAVHistory, AMFI NAV sync |
| **Machine learning** | Feature engineering, a multi-model leaderboard (sklearn, XGBoost, LightGBM, Prophet, LSTM), explainability, inference API |
| **Market data & news** | Yahoo Finance + FRED macro data, NewsAPI + VADER sentiment, fund-vs-benchmark beta/alpha/Treynor |
| **Portfolio management** | Portfolios, holdings, transactions with weighted-average NAV & XIRR, dashboard summaries |
| **Watchlists & alerts** | Threshold-based alerts (NAV, return, risk score, drawdown), notifications |
| **Calculators & analytics** | SIP / lumpsum / retirement projections, Monte Carlo simulation, allocation & risk analytics |
| **Background jobs** | Celery worker + beat for scheduled ETL and ML retraining |
| **Ops** | Alembic migrations, structured logging, global error handling, Docker, CI/CD |

See `docs/ARCHITECTURE.md` for the full system design and `docs/FOLDER_STRUCTURE.md` for a
guided tour of the codebase.

---

## Quickstart

### Docker Compose (recommended)

```bash
cp .env.example .env
docker compose up --build
```

Starts the API, Postgres, Redis, and a Celery worker + beat. Migrations run automatically.
Then open http://localhost:8000/docs.

### Bare virtualenv

```bash
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env      # point DATABASE_URL at a reachable Postgres
alembic upgrade head
uvicorn app.main:app --reload
```

### Try it immediately

```bash
python scripts/seed_demo_data.py
# logs a demo login: demo@mfplatform.example.com / DemoPassword123!
```

Or register your own user:

```bash
curl -X POST localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"SomethingStrong123!","full_name":"You"}'

curl -X POST localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"SomethingStrong123!"}'
# -> {"access_token": "...", "refresh_token": "...", "token_type": "bearer"}
```

Use the returned `access_token` as `Authorization: Bearer <token>` on subsequent requests, or
click **Authorize** in `/docs`.

---

## Configuration

All configuration is one Pydantic-Settings class (`app/core/config.py`), loaded from `.env`.
Copy `.env.example` to `.env` and fill in at minimum `SECRET_KEY`. `FRED_API_KEY` and
`NEWSAPI_KEY` are free and optional — those specific sync endpoints return a clear `422`
explaining how to get one if it's missing, rather than silently failing.

| Variable | Purpose |
|---|---|
| `SECRET_KEY` | JWT signing key — **must** be changed from the `.env.example` default in any real deployment |
| `DATABASE_URL` | Overrides the assembled `POSTGRES_*` connection string if set directly |
| `REDIS_HOST` / `REDIS_PORT`, `CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND` | Background job queue |
| `BACKEND_CORS_ORIGINS` | JSON list of allowed frontend origins (e.g. your Vercel URL) |
| `FRED_API_KEY` | https://fred.stlouisfed.org/docs/api/api_key.html |
| `NEWSAPI_KEY` | https://newsapi.org/register |
| `DEFAULT_TRADING_DAYS_PER_YEAR`, `DEFAULT_MONTE_CARLO_SIMULATIONS`, `DEFAULT_RISK_FREE_RATE` | Portfolio analytics/calculator defaults |

---

## API surface

Everything is mounted under `/api/v1`. Full interactive documentation is at `/docs`; a summary:

```
Auth          POST   /auth/register  /auth/login  /auth/refresh
Users         GET    /users/me
Funds         GET    /funds  /funds/{id}                    POST /funds/sync/amfi
ML            POST   /ml/train/{fund_id}                    GET  /ml/leaderboard/{fund_id}
Predictions   GET    /predictions/{fund_id}                 POST /predictions/{fund_id}/generate
Market data   GET    /market-data  /market-data/{symbol}     POST /market-data/sync/{yahoo|fred}
              GET    /market-data/funds/{fund_id}/risk-profile
News          GET    /news                                   POST /news/sync
Portfolios    GET/POST /portfolios   GET/PATCH/DELETE /portfolios/{id}
              GET/POST /portfolios/{id}/transactions          GET /portfolios/{id}/summary
Watchlists    GET/POST /watchlists                            POST /watchlists/{id}/items
                                                                DELETE /watchlists/{id}/items/{fund_id}
Alerts        GET/POST /alerts       POST /alerts/{id}/disable  DELETE /alerts/{id}
              GET /alerts/notifications
Calculators   POST /calculators/{sip|lumpsum|retirement|monte-carlo}
Analytics     GET  /analytics/portfolio/{id}/allocation
              POST /analytics/{risk-metrics|benchmark-comparison|drawdown|beta}
Health        GET  /health   /health/db
```

Every `portfolios`, `watchlists`, and `alerts` resource is scoped to the authenticated user —
another user's resource returns `404`, never `403`, so the API doesn't confirm whether a given
ID belongs to someone else.

---

## Testing

```bash
pytest                                          # 65 tests, in-memory SQLite, no external DB needed
pytest --cov=app --cov-report=term-missing      # with coverage
```

See `docs/TESTING_GUIDE.md` for fixture details and how to test against real Postgres.

## Code quality

```bash
black app tests && isort app tests && flake8 app tests
mypy app --ignore-missing-imports   # informational in CI; a few ORM-typing findings are expected
```

`.pre-commit-config.yaml` runs all of the above automatically — `pre-commit install` once.

---

## Deployment

- **Render**: `render.yaml` is a ready-to-use Blueprint (web + Celery worker + Celery beat +
  managed Postgres + managed Redis). See `docs/DEPLOYMENT_GUIDE.md`.
- **Railway**: builds from `Dockerfile` directly; add Postgres/Redis plugins and a
  `alembic upgrade head` release command. See `docs/DEPLOYMENT_GUIDE.md`.
- **Any Docker host**: `docker build -t mf-platform . && docker run -p 8000:8000 --env-file .env mf-platform`
  (respects the `PORT` env var if set, defaults to 8000).
- **Frontend on Vercel**: set `BACKEND_CORS_ORIGINS` to your Vercel URL and point the frontend
  at `${this backend's URL}/api/v1`.

---

## Project structure

```
app/
├── main.py            # single FastAPI() instance
├── core/               # config, security, logging
├── database/            # shared Base, session
├── middleware/           # global exception handlers
├── models/                # SQLAlchemy 2.0 ORM (one Base, one metadata)
├── schemas/                # Pydantic v2 request/response contracts
├── repositories/             # the only layer running raw queries
├── services/                   # business logic (framework-agnostic, unit-testable)
├── analytics/                   # fund-vs-benchmark risk metrics
├── ml/                            # feature engineering, model zoo, training, inference
├── etl/                             # AMFI / Yahoo Finance / FRED / NewsAPI extractors
├── tasks/                            # Celery app + scheduled jobs
└── api/v1/endpoints/                  # one router per domain, all mounted in api/v1/router.py
```

Full guided tour: `docs/FOLDER_STRUCTURE.md`. System design: `docs/ARCHITECTURE.md`. Schema:
`docs/ER_DIAGRAM.md`.

## Documentation index

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system design, request flow, auth model
- [`docs/FOLDER_STRUCTURE.md`](docs/FOLDER_STRUCTURE.md) — annotated directory tree
- [`docs/ER_DIAGRAM.md`](docs/ER_DIAGRAM.md) — full schema, Mermaid ER diagram
- [`docs/DEVELOPER_GUIDE.md`](docs/DEVELOPER_GUIDE.md) — how to add an endpoint, style guide
- [`docs/TESTING_GUIDE.md`](docs/TESTING_GUIDE.md) — fixtures, coverage, writing new tests
- [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md) — Render, Railway, Docker, Vercel wiring
- [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) — common errors and fixes
