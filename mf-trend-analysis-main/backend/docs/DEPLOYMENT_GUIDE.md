# Deployment Guide

## Local development (Docker Compose — recommended)

```bash
cp .env.example .env          # fill in SECRET_KEY, FRED_API_KEY, NEWSAPI_KEY (optional)
docker compose up --build
```

This starts four containers: `api` (FastAPI on :8000), `db` (Postgres 16), `redis`, and a
Celery `worker` + `beat` pair. Alembic migrations run automatically on API container start.

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health check: http://localhost:8000/api/v1/health

## Local development (bare virtualenv)

```bash
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env           # point DATABASE_URL at a local Postgres, or use SQLite for a quick spin
alembic upgrade head
uvicorn app.main:app --reload
```

`DATABASE_URL` defaults to assembling from the individual `POSTGRES_*` variables if left
unset; you can override it directly (e.g. `sqlite:///./dev.db` for a zero-setup local spin —
note some Postgres-only features like `JSONB` and true concurrent writes won't apply, this is
for quick iteration only, not for anything resembling production).

## Render

`render.yaml` in the repo root is a Render **Blueprint** — push this repo to GitHub, then in
the Render dashboard choose **New > Blueprint** and point it at the repo. It provisions:

- a **web service** (this API, `uvicorn app.main:app`)
- a **background worker** (Celery worker)
- a **cron/worker** for Celery beat
- a managed **Postgres** database
- a managed **Redis** instance

Render injects `DATABASE_URL` and `REDIS_URL`-style env vars automatically when you use its
managed Postgres/Redis add-ons referenced in `render.yaml`; set `SECRET_KEY`,
`FRED_API_KEY`, and `NEWSAPI_KEY` as secrets in the Render dashboard (marked `sync: false` in
the blueprint so they aren't committed to git).

Run migrations after first deploy (Render's shell, or add a Release Command
`alembic upgrade head` to the web service in the dashboard).

## Railway

1. `railway init` in the repo root, or connect the GitHub repo from the Railway dashboard.
2. Add a **Postgres** and a **Redis** plugin from Railway's marketplace — it will set
   `DATABASE_URL` / `REDIS_URL` env vars automatically.
3. Set `SECRET_KEY`, `FRED_API_KEY`, `NEWSAPI_KEY` in the service's Variables tab.
4. Railway builds from the `Dockerfile` automatically. Add a **Release Command** of
   `alembic upgrade head` (Settings > Deploy) so migrations run on every deploy.
5. Optionally add a second Railway service from the same repo/image for the Celery worker,
   overriding the start command to `celery -A app.tasks.celery_app worker --loglevel=info`.

## Connecting a frontend on Vercel

- Set `BACKEND_CORS_ORIGINS` in `.env` (or the platform's env vars) to include your Vercel
  deployment URL(s), e.g. `["https://your-app.vercel.app", "http://localhost:5173"]`.
- The frontend should call `${API_BASE_URL}/api/v1/...` — `API_BASE_URL` being wherever this
  backend is deployed (Render/Railway URL, or `http://localhost:8000` locally).
- Auth: `POST /api/v1/auth/login` returns `{access_token, refresh_token, token_type}`; send
  `Authorization: Bearer <access_token>` on subsequent requests. Refresh via
  `POST /api/v1/auth/refresh` before the access token expires
  (`ACCESS_TOKEN_EXPIRE_MINUTES`, default 30).

## Production checklist

- [ ] `SECRET_KEY` is a real random value, not the `.env.example` default
- [ ] `APP_ENV=production` and `DEBUG=false`
- [ ] `BACKEND_CORS_ORIGINS` is the exact frontend origin(s), not `*`
- [ ] Postgres has automated backups enabled (managed Postgres on Render/Railway does this)
- [ ] `alembic upgrade head` has been run against the production database
- [ ] Celery worker + beat are running as long-lived processes, not just the web dyno
