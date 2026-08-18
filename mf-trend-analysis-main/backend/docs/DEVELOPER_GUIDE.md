# Developer Guide

## Adding a new endpoint

1. **Model** (`app/models/`) — add/extend a SQLAlchemy model on the shared `Base`. Import it
   in `app/models/__init__.py` so Alembic autogeneration and `Base.metadata.create_all`
   (used by tests) both see it.
2. **Migration** — `alembic revision --autogenerate -m "add X"`, then read the generated file
   before committing; autogenerate is a starting point, not a guarantee (it won't infer
   `ondelete` behavior on new FKs, for example — copy the pattern from
   `0004_portfolio_watchlist_alerts.py`).
3. **Schema** (`app/schemas/`) — Pydantic v2 request/response models. Use
   `model_config = ConfigDict(from_attributes=True)` on any `*Read` schema so it can be
   returned directly from an ORM object.
4. **Repository** (`app/repositories/`) — raw query methods only (`get`, `list`, `create`,
   `update`, `delete`); no business logic here.
5. **Service** (`app/services/`) — business logic, calling the repository. Never import
   FastAPI here — this is what keeps services unit-testable.
6. **Endpoint** (`app/api/v1/endpoints/`) — thin: parse request, call
   `Depends(get_current_user_id)` for auth, call the service, map exceptions to HTTP status
   codes. If the resource is user-owned, **always** check ownership before returning it (see
   `_get_owned_portfolio` in `endpoints/portfolio.py` for the pattern — 404, not 403, on a
   foreign user's resource).
7. **Router** — register the new router in `app/api/v1/router.py`.
8. **Tests** — add a test in `tests/`; the in-memory SQLite fixture (`tests/conftest.py`)
   needs no external DB.

## Auth dependencies cheat-sheet

```python
from app.api.deps import get_current_user, get_current_user_id, require_admin

# need the full User object (email, role, etc.)
def endpoint(user: User = Depends(get_current_user)): ...

# only need the UUID (most Phase 4 portfolio/watchlist/alert endpoints)
def endpoint(user_id: uuid.UUID = Depends(get_current_user_id)): ...

# admin-only endpoint
def endpoint(user: User = Depends(require_admin)): ...
```

## Code style

- `black` (line length 110) + `isort` (black profile) + `flake8` — run via
  `pre-commit install` once, or manually: `black app tests && isort app tests && flake8 app tests`.
- `mypy app --ignore-missing-imports` runs in CI as informational (`continue-on-error`) —
  fix what you can, but a handful of ORM/ML-library findings are expected without the
  `sqlalchemy[mypy]` plugin and don't block merges.
- SQLAlchemy relationships that forward-reference a model defined later in the same or
  another file use string annotations (`Mapped["OtherModel"]`) with a `# noqa: F821` — this
  is standard SQLAlchemy 2.0 style; pyflakes doesn't parse these forward refs correctly
  inside `Mapped[...]`, so the noqa is expected, not a code smell.

## Working with Celery locally

```bash
celery -A app.tasks.celery_app worker --loglevel=info   # in one terminal
celery -A app.tasks.celery_app beat --loglevel=info      # in another
```

Both need `REDIS_HOST`/`REDIS_PORT` (or `CELERY_BROKER_URL`/`CELERY_RESULT_BACKEND`) pointing
at a reachable Redis — `docker compose up redis` if you don't want to install Redis locally.

## Seeding demo data

```bash
python scripts/seed_demo_data.py
```

Creates a demo user (`demo@mfplatform.example.com` / `DemoPassword123!`), three demo mutual
funds, a portfolio with transactions, a watchlist, and a drawdown alert — useful for exploring
`/docs` without creating everything by hand.
