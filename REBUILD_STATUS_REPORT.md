# Rebuild Status Report — MF Intelligence Platform

Date: 2026-08-18
Scope: fixes applied against the supplied repository (`mf-trend-analysis-main`),
verified with real compiles/builds/tests run in this environment — not just
read-through review. No live PostgreSQL, external API keys, or deploy target
were available in this environment, so anything requiring those is called
out explicitly below rather than claimed as done.

## How to verify everything below yourself

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt          # core only, ML stack optional
pytest -q                                # 69 passed
python -c "import app.main"              # app imports cleanly, no DB needed

# Frontend
cd frontend
npm install
npx tsc -b                               # 0 errors
npm run build                            # production build succeeds
npx oxlint src                           # 0 errors (4 pre-existing warnings, unrelated)
```

---

## Fixed and verified this session

### 1. Critical: backend wouldn't start at all (two separate blockers)
- **`app/repositories/fund_repository.py`**: `upsert_fund()`'s body was
  indented outside the method (`SyntaxError: 'return' outside function`).
  Fixed; confirmed `python -m compileall app` passes clean across all 124
  files.
- **`app/core/config.py`** (not previously flagged): a `field_validator`
  referenced a `DATABASE_URL` field that was never declared on the
  `Settings` model, which raises `PydanticUserError` at import time —
  meaning the app could not start under any circumstances, even after the
  syntax fix. Rebuilt the settings module:
  - `DATABASE_URL` is now a real field. If the environment sets it, it
    wins (required for any hosted/managed Postgres). Otherwise it's
    assembled from `POSTGRES_*`, which is only valid for local Docker
    Compose (`POSTGRES_HOST=db`).
  - Added a production guard: refuses to start with the default
    development `SECRET_KEY` when `APP_ENV=production`, and forces
    `DEBUG=False` in production regardless of what's configured.
  - Verified both branches with real env-var-driven runs (dev default,
    prod override, prod-without-secret refusal).

### 2. Heavy ML dependencies were a hard startup blocker, not just bloat
LightGBM, XGBoost, and Prophet were imported at module level, and MLflow
was imported at module level in the model registry. Because
`app/api/v1/router.py` imports every endpoint module (including
`ml.py` → the trainer → these model classes) at startup, **the entire
API — funds, watchlist, portfolio, everything — failed to boot** unless
all of TensorFlow/Prophet/XGBoost/LightGBM/MLflow were installed.

Fixed by deferring these imports to inside each model's `fit()` method
(the same pattern the codebase already used correctly for
TensorFlow/LSTM), and making MLflow tracking optional with a logged
warning and a graceful no-op fallback. **Verified: the full FastAPI app
now imports with 51+ routes registered using only `requirements.txt`
(core) — no ML libraries needed for the API to run.**

Split `requirements.txt` into:
- `requirements.txt` — everything the API needs to serve every endpoint
  except the model-training job itself (inference against an
  already-trained model works fine).
- `requirements-ml.txt` — the heavy training-only stack (TensorFlow,
  Prophet, XGBoost, LightGBM, Optuna, SHAP, MLflow).

`backend/Dockerfile` installs both by default (`--build-arg
INSTALL_ML=false` to opt out for a lean API-only image) so
`docker-compose up` and the existing `render.yaml` blueprint keep working
exactly as before — this is a dependency-hygiene fix, not a functionality
cut.

### 3. ETL crash on real AMFI data
`app/etl/amfi_etl.py` called `.strip()` on `isin_growth`/`isin_div`
after they'd already been normalized to `None` — AMFI leaves these
columns blank for a large share of schemes, so this crashed with
`AttributeError` on real data, not just edge cases. Fixed.

### 4. "Trending Funds" / "AI Recommendations" were mislabeled, not computed
This was the deepest issue: the UI's "Trending Funds — Ranked by 3-year
CAGR" section was actually sorting by single-day NAV change, and there
was no backend support for CAGR-based ranking at all (`/funds` only
sorted by `scheme_name`, `nav`, `expense_ratio`, `aum`; CAGR was only
computed inside an internal ML feature-engineering function, never
exposed via API). Separately, the dashboard's "AI Recommendations"
section was just the trending-funds list relabeled — no model output
was actually involved.

Built the real thing instead of relabeling:
- New `FundRepository.get_trailing_cagr_map()`: computes actual trailing
  CAGR per fund from stored NAV history (`(latest/base)^(365.25/days) - 1`,
  using the NAV on/before `today - N years` as the base point). **Funds
  without ~3 years of coverage are excluded from the result, never
  assigned a fabricated CAGR** — this is the platform's stated
  data-availability policy, now actually enforced in code, not just
  documented.
- New `GET /funds/trending` endpoint using it, with two new tests
  (`tests/test_trending_funds.py`) proving both the ranking and the
  exclusion behavior — including a case where a 6-month-old fund with
  the single largest raw NAV jump is correctly excluded rather than
  topping the list.
- Frontend `fetchTrendingFunds()` now calls this real endpoint instead
  of re-sorting the list by day-change and calling it "CAGR".
- New `fetchLatestPredictionsForFunds()` / `useLatestPredictions()`:
  reads *already-persisted* predictions (`GET /predictions/{id}`, no
  generation triggered) for the trending funds. "AI Recommendations" on
  the dashboard now renders only funds with a real model output
  (recommendation, confidence, expected return), and shows an honest
  empty state — "No AI predictions available yet... Generate one from
  the AI Predictions page" — when none exist, instead of silently
  reusing the trending list.

### 5. Dashboard/Landing chart showed nothing
Both pages tried to chart `navHistory` off a fund object returned by the
list/trending endpoints, which never include NAV history (only the
detail endpoint does). Both now fetch the selected fund's full detail
(`useFund(id)`) before charting, with a loading state in between.

### 6. Stale hardcoded backend URL
`frontend/src/api/client.ts` had a specific Render URL
(`mf-trend-analysis-backend.onrender.com`) hardcoded as the fallback if
`VITE_API_BASE_URL` was unset, and the same URL was committed directly
in `.env.production`. If that backend URL ever changes, this fails
silently in production. Removed the hardcoded fallback entirely;
production builds now log a clear console error if the env var is
missing rather than silently pointing at a specific dead/wrong host.
Replaced `.env.production` (committed secret-ish config) with
`.env.example` / `.env.development.example` / `.env.production.example`
templates — the real value belongs in the hosting provider's env config
(Vercel dashboard), not in the repo. Confirmed no other file in the repo
references the old hardcoded URL.

---

## Verified working end-to-end (not just read)

- `python -m compileall backend/app` — clean, 124 files
- `pytest -q` in `backend/` — **69 passed**, including 2 new tests for
  the CAGR ranking endpoint, using the existing SQLite in-memory test
  fixtures (no live Postgres needed to verify backend logic)
- `python -c "import app.main"` — full app imports with only core
  dependencies installed, no DB connection needed at import time
- `npx tsc -b` in `frontend/` — 0 type errors
- `npm run build` in `frontend/` — production Vite build succeeds
- `npx oxlint src` — 0 errors (4 pre-existing warnings in
  `Analytics.tsx`, unrelated to anything touched this session)

---

## Explicitly NOT done — needs live infrastructure or your input

These require things this environment doesn't have (a real Postgres
instance, external API keys, a deploy target, months of real AMFI NAV
history to actually populate trailing-CAGR data). Attempting to "finish"
them without those would mean either faking results or guessing at
values you haven't provided — both of which the original rebuild prompt
explicitly rules out.

- **Running the AMFI ETL against live data** and populating a real
  Postgres instance — the fixes above are verified against the test
  suite's synthetic fixtures, not a live sync.
- **Model training** — training itself needs `requirements-ml.txt`
  installed and real NAV history; verified only that the training code
  now *imports* without crashing the rest of the app, not that a full
  train run against real data produces good models.
- **News provider integration** (`NEWSAPI_KEY`) and **FRED integration**
  (`FRED_API_KEY`) — need your API keys.
- **Deployment** to Render/Vercel per `render.yaml` / `vercel.json` —
  needs your accounts/credentials; the configs were reviewed and are
  consistent with the code fixes above, but a real deploy wasn't run.
- The remainder of the original 40-point rebuild checklist not covered
  above (broader test coverage beyond what exists, additional pages,
  documentation set, CI workflow validation) — happy to keep going on
  any specific item you want prioritized next.

## Recommended next steps, in order
1. Stand up Postgres + Redis (`docker compose up --build` from repo root
   works locally with `backend/.env` filled in) and run
   `alembic upgrade head`, then trigger `POST /funds/sync/amfi` to
   populate real NAV data.
2. Once ~3 years of NAV history exists for at least some funds, confirm
   `GET /funds/trending` returns real, non-empty results.
3. Install `requirements-ml.txt` on whatever runs Celery worker/training,
   and run a real training job.
4. Add `FRED_API_KEY` / `NEWSAPI_KEY` and confirm those integrations.
5. Deploy per the existing `render.yaml` / Vercel configs.
