# Architecture

## System overview

The MF Intelligence Platform is a single FastAPI service backing a mutual-fund research,
prediction, and portfolio-management product. It merges five previously-separate build
phases into one deployable backend:

| Phase | Domain | Key pieces |
|---|---|---|
| 1 | Core platform | Auth (JWT + refresh tokens), RBAC, users, AMC/fund/NAV reference data, Alembic, Docker |
| 2 | Machine learning | Feature engineering, a multi-model training pipeline (sklearn/XGBoost/LightGBM/Prophet/LSTM), leaderboard selection, inference |
| 3 | Market data & news | AMFI NAV sync, Yahoo Finance + FRED macro data, NewsAPI + VADER sentiment, fund-vs-benchmark risk analytics |
| 4 | Portfolio | Portfolios, holdings, transactions (weighted-avg NAV, XIRR), watchlists, threshold alerts, SIP/lumpsum/retirement calculators, Monte Carlo simulation, allocation/risk analytics |
| 5 | Enterprise | CI/CD, structured docs, test suite, production hardening |

```
                        ┌─────────────────────────┐
                        │   Vercel (frontend)      │
                        └────────────┬─────────────┘
                                     │ HTTPS / JSON
                                     ▼
                        ┌─────────────────────────┐
                        │  FastAPI app (this repo)  │
                        │  /api/v1/*                │
                        │  Swagger @ /docs           │
                        └──────┬──────────┬─────────┘
                               │          │
                     SQLAlchemy│          │Celery broker
                               ▼          ▼
                     ┌──────────────┐  ┌────────────┐
                     │  PostgreSQL   │  │   Redis     │
                     └──────────────┘  └─────┬──────┘
                                              │
                                     ┌────────▼─────────┐
                                     │ Celery worker/beat │
                                     │ ETL, ML retrain,    │
                                     │ alert evaluation     │
                                     └──────────────────────┘
```

## Request flow

1. **Router** (`app/api/v1/router.py`) mounts every domain's endpoints under one `APIRouter`,
   which `main.py` includes once at `settings.API_V1_PREFIX` (`/api/v1`).
2. **Endpoint functions** (`app/api/v1/endpoints/*.py`) handle only HTTP concerns: parsing the
   request, resolving `Depends(get_current_user_id)` for auth, mapping domain exceptions to
   HTTP status codes, and returning a Pydantic response model.
3. **Services** (`app/services/*.py`) hold business logic and are framework-agnostic.
4. **Repositories** (`app/repositories/*.py`) are the only layer touching the SQLAlchemy
   `Session` with raw queries.
5. **Models** (`app/models/*.py`) are the single source of schema truth, all registered on one
   `Base` (`app/database/base.py`) so Alembic autogeneration sees the whole picture.

## Authentication & authorization

- JWT access tokens (`ACCESS_TOKEN_EXPIRE_MINUTES`) + rotating refresh tokens stored in the
  `refresh_tokens` table (`REFRESH_TOKEN_EXPIRE_DAYS`), issued/verified in `app/core/security.py`.
- `app/api/deps.py` exposes three dependencies used across every domain:
  - `get_current_user` — full `User` object, used where role or profile fields are needed.
  - `get_current_user_id` — just the UUID, used by the Phase 4 portfolio/watchlist/alerts
    endpoints (kept as a thin derived dependency so those modules don't need to import the
    full `User` model).
  - `require_admin` — 403s unless `role == ADMIN`.
- **Per-resource ownership is enforced at the endpoint layer**, not just authentication: every
  portfolio/watchlist/alert lookup checks `resource.user_id == current_user_id` and returns
  `404` (not `403`) on mismatch, so the API never confirms or denies that another user's
  resource exists.

## Background processing (Celery)

`app/tasks/celery_app.py` defines the Celery app; `docker-compose.yml` runs a worker and a
beat scheduler as separate containers against the same Redis broker/result backend.

| Task module | Schedule | Purpose |
|---|---|---|
| `etl_tasks.py` | daily | AMFI NAV sync for all tracked schemes |
| `market_tasks.py` | daily | Yahoo Finance + FRED sync |
| `news_tasks.py` | every 3h | NewsAPI fetch + VADER sentiment scoring |
| `ml_tasks.py` | on-demand / scheduled retrain | Trains the model leaderboard for a fund and promotes the best model |

Portfolio alert evaluation is intentionally synchronous today (evaluated on-demand via the
alert service); wiring a periodic Celery task to sweep `ACTIVE` alerts and create
`Notification` rows is a natural next step and is left as a TODO in `app/tasks/`.

## Data model portability note

Two Postgres-only types were originally hardcoded into the ORM layer (`JSONB` for
`ml_models.hyperparameters` and `news.related_symbols`). These are now declared via
`app.database.base.PortableJSON` — a SQLAlchemy variant type that renders as real `JSONB` on
Postgres (production) and falls back to generic `JSON` on any other dialect (SQLite, used by
the test suite). Alembic migrations still use `postgresql.JSONB()` directly, since migrations
only ever run against the real production database.

## Why phases 4/5 merge cleanly

Phases 1–3 were already built cumulatively (Phase 3's zip contained Phase 1 + 2 + 3 fully
merged). Phases 4 and 5 were built as a **standalone module** with its own lightweight
`app/db/` and stand-in `X-User-Id` auth, but were explicitly designed to be merged: code
comments in the original modules said to swap in the real JWT dependency and the real shared
`Base`. This repository does exactly that — see `docs/DEPLOYMENT_GUIDE.md` for what changed
during the merge if you're diffing against either original zip.
