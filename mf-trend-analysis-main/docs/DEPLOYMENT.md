# Deployment

This is a monorepo with two independently-deployed halves: a static frontend
(Vercel) and a stateful Python backend (Render or Railway). They are not
deployed together, and the backend cannot reasonably run on Vercel — see
"Why not Vercel for the backend" below.

## Backend — Render or Railway

The backend needs a long-running process (FastAPI via uvicorn), a Postgres
database, a Redis instance, and separate long-running Celery worker/beat
processes for scheduled ETL and ML retraining. These are not things Vercel's
serverless function model supports.

**Render**: `backend/render.yaml` is a ready-to-use Blueprint provisioning
the API, Celery worker, Celery beat, managed Postgres, and managed Redis in
one step. See `backend/docs/DEPLOYMENT_GUIDE.md` for the full walkthrough.

**Railway**: connect the repo, set the root directory to `backend/`, add
Postgres/Redis plugins, and set a Release Command of `alembic upgrade head`.
Also covered in `backend/docs/DEPLOYMENT_GUIDE.md`.

Either way, once deployed you'll have a backend URL like
`https://mf-platform-api.onrender.com` — copy this for the frontend step.

## Frontend — Vercel

1. In the Vercel dashboard, **New Project** → import this repo.
2. Set **Root Directory** to `frontend`.
3. Vercel auto-detects the Vite framework preset (`frontend/vercel.json` is
   also included, so this should be automatic either way).
4. Set the environment variable `VITE_API_BASE_URL` to your deployed
   backend's API root, e.g. `https://mf-platform-api.onrender.com/api/v1`.
5. Deploy.

Without `VITE_API_BASE_URL` set, the deployed frontend runs entirely on mock
data — a working, demoable app with no backend required. Setting it switches
every service over to the real API (see `docs/API_INTEGRATION.md` for
exactly what that does and doesn't cover today).

## Why not Vercel for the backend

Vercel serverless functions are short-lived and stateless per invocation —
they don't support:
- A persistent Postgres connection pool (SQLAlchemy's `SessionLocal` expects
  a long-lived engine, not a fresh cold start per request)
- Long-running Celery worker/beat processes for scheduled ETL and ML
  retraining (`backend/app/tasks/`)
- The ML training pipeline's runtime dependencies (TensorFlow, Prophet,
  LightGBM, XGBoost, mlflow) — these alone exceed Vercel's serverless
  function size limits by a wide margin

None of this rules out a *partial* Vercel deployment of some stateless
read-only endpoints as Vercel Functions in the future, but that would need
a real redesign (splitting stateful and stateless endpoints, moving session
management to an external pooler like PgBouncer or Neon's serverless driver,
moving Celery to a different scheduler). That redesign has not been done
here, so this repo deploys the backend to Render/Railway as-is.

## Connecting a custom domain

Point your domain's DNS at Vercel for the frontend (Vercel's dashboard walks
through this) and add it to `BACKEND_CORS_ORIGINS` in the backend's
environment variables so the browser's CORS preflight succeeds.

## Local full-stack development

```bash
cp backend/.env.example backend/.env   # fill in SECRET_KEY at minimum
docker compose up --build
```

This runs Postgres, Redis, the API, Celery worker + beat, and an nginx-served
production build of the frontend, all networked together — see the root
`docker-compose.yml`. For day-to-day frontend development, running
`npm run dev` directly in `frontend/` (with `backend/` running via Docker or
bare `uvicorn`) gives faster hot-reload than rebuilding the frontend's Docker
image on every change.
