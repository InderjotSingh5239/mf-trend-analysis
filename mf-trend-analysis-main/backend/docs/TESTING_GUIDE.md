# Testing Guide

## Running the suite

```bash
pip install -r requirements-dev.txt
pytest                          # all tests
pytest --cov=app --cov-report=term-missing   # with coverage
pytest tests/test_api_portfolio.py -v         # a single file
```

Tests run against an **in-memory SQLite database** (`tests/conftest.py`), created fresh per
test via the `db_session` fixture and torn down afterward — no external Postgres/Redis needed
to run the suite locally or in CI.

## Fixtures (`tests/conftest.py`)

| Fixture | Provides |
|---|---|
| `db_session` | a fresh SQLAlchemy `Session` against an in-memory SQLite DB with every table created |
| `client` | a `TestClient` with `get_db` overridden to use `db_session` |
| `sample_user_id` | a random UUID standing in for an authenticated user in Phase 4 tests |

For endpoint tests that need a specific user identity without going through the full JWT
login flow, override `get_current_user_id` directly:

```python
from app.api.deps import get_current_user_id

app.dependency_overrides[get_current_user_id] = lambda: sample_user_id
```

(`tests/test_api_portfolio.py` does exactly this in its own `client` fixture.)

For tests that exercise the real JWT flow end-to-end (registration → login → protected route),
don't override the auth dependency — call `/api/v1/auth/register` and `/api/v1/auth/login`
through the `client` fixture and use the returned bearer token, as `tests/test_auth.py` does.

## What's covered

- `test_auth.py` — register/login/refresh, protected-route access, expired/invalid tokens
- `test_health.py` — liveness + DB-connectivity checks
- `test_amfi_parser.py`, `test_features.py`, `test_evaluation.py`, `test_prediction_engine.py`
  — ML pipeline unit tests (feature engineering, model evaluation metrics, ensemble selection)
- `test_news_sentiment.py`, `test_risk_analytics.py` — Phase 3 sentiment scoring and
  fund-vs-benchmark risk metrics
- `test_portfolio_service.py`, `test_api_portfolio.py` — transaction recording, weighted-
  average NAV, XIRR, dashboard summary, and the full HTTP surface including auth
- `test_calculators.py`, `test_monte_carlo.py`, `test_portfolio_analytics_service.py` —
  SIP/lumpsum/retirement math, Monte Carlo simulation, allocation/risk analytics

## Testing against real Postgres (optional)

The in-memory SQLite approach covers ORM logic and HTTP behavior, but doesn't exercise
Postgres-only behavior (`JSONB` storage, `ON DELETE` cascade behavior at the DB level,
concurrent-write semantics). To test against real Postgres, point `DATABASE_URL` at a real
instance and run migrations, then adapt `tests/conftest.py`'s `db_session` fixture to use that
engine instead of the in-memory SQLite one — the CI workflow (`.github/workflows/ci.yml`) does
this by spinning up a `postgres:16-alpine` service container and running
`alembic upgrade head` before the test step, as a template for a Postgres-backed local setup.

## Writing new tests

- Keep service-layer tests free of `TestClient`/HTTP — instantiate the service directly with
  `db_session` and assert on its return value (see `test_portfolio_service.py`).
- For endpoint tests, always add at least one negative case: unauthenticated (expect 401) and,
  for user-owned resources, cross-user access (expect 404) — see
  `tests/test_api_portfolio.py` for the pattern this repo follows everywhere ownership matters.
