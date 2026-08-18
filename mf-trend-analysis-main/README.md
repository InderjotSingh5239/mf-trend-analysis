# MF Intelligence Platform

An AI-assisted mutual fund research, prediction, and portfolio-management
platform — a FastAPI backend and a React/TypeScript frontend, merged into a
single monorepo with a real, verified integration between them.

```
.
├── backend/    FastAPI + PostgreSQL + Celery — auth, ML predictions, market
│               data/news intelligence, portfolio/watchlist/alerts, calculators
├── frontend/   React 19 + TypeScript + Vite + Tailwind — full UI, runs on
│               mock data out of the box or wired to the real backend
├── docs/       Cross-cutting docs for the merged project (this folder)
└── docker-compose.yml   Full local stack: Postgres, Redis, API, Celery, frontend
```

Each half also has its own detailed docs: `backend/README.md` and
`backend/docs/`, `frontend/README.md`.

## Quickstart

### Option A — frontend only, no backend (fastest)

```bash
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173` running entirely on mock data — every page
works, nothing to configure. This is the default mode; `VITE_API_BASE_URL`
is unset in `frontend/.env.example`.

### Option B — full stack

```bash
cp backend/.env.example backend/.env   # fill in SECRET_KEY at minimum
docker compose up --build
```

Then in a second terminal, point the frontend at the real backend:

```bash
cd frontend
echo "VITE_API_BASE_URL=http://localhost:8000/api/v1" > .env
npm install
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend Swagger UI: `http://localhost:8000/docs`

Seed some data to explore with: `docker compose exec api python scripts/seed_demo_data.py`
(logs a demo login — `demo@mfplatform.example.com` / `DemoPassword123!`).

## What's real, what's mock

The frontend works two ways: fully on mock data (no backend needed — great
for demos, screenshots, and portfolio review), or wired to the real backend
when `VITE_API_BASE_URL` is set. **`docs/API_INTEGRATION.md` is the honest,
detailed map of exactly which features are fully wired to real data, which
have a documented partial/fallback behavior, and which remain mock-only —
read that before assuming any given page is backend-connected.**

Short version: auth, fund browsing/search, fund detail + NAV history,
predictions, news, and watchlist are genuinely wired to the real API with
working adapters. The Portfolio *page* is not yet wired to the real
(fully-built, fully-tested) Portfolio API — an explicitly scoped gap, not an
oversight. A handful of fund-level fields (star ratings, holdings
composition, sector/asset allocation) have no backend data source at all and
are conditionally hidden rather than faked when running against real data.

## Verified state of this repo

- Backend: 67/67 tests passing, flake8/black/isort clean
- Frontend: 0 TypeScript errors (strict mode), 0 lint warnings, clean
  production build
- A real cross-project bug was found and fixed during integration: the
  frontend and backend computed SIP growth with different compounding
  conventions and would have shown different numbers for the same inputs —
  see `docs/API_INTEGRATION.md#calculator-math` for details

## Documentation index

- [`docs/API_INTEGRATION.md`](docs/API_INTEGRATION.md) — what's real vs. mock, field by field
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Vercel (frontend) + Render/Railway (backend), and why not Vercel for the backend
- [`backend/README.md`](backend/README.md) — backend-specific setup, API surface, testing
- [`backend/docs/`](backend/docs/) — backend architecture, ER diagram, developer/testing guides, troubleshooting
- [`frontend/README.md`](frontend/README.md) — frontend-specific setup and structure

## Tech stack

**Backend**: FastAPI, SQLAlchemy 2.0, PostgreSQL, Alembic, Celery + Redis,
scikit-learn/XGBoost/LightGBM/Prophet for the ML prediction engine, JWT auth.

**Frontend**: React 19, TypeScript (strict), Vite, Tailwind CSS 4, TanStack
Query, React Hook Form + Zod, Recharts, Framer Motion.
