# Troubleshooting Guide

## "relation 'portfolios' does not exist" (or any other table)
Migrations haven't been run. `alembic upgrade head`. In `docker-compose.yml` this runs
automatically as part of the `api` service's startup; in a bare virtualenv you must run it
yourself before `uvicorn`.

## "could not translate host name 'db' to address"
You're running `uvicorn` outside Docker but `DATABASE_URL`/`POSTGRES_HOST` still points at
host `db` (the Compose service name). Set `POSTGRES_HOST=localhost` (or your actual DB host)
in `.env` when running outside Compose.

## `psycopg2` install fails with a missing `pg_config` error
Install the Postgres client headers first:
- macOS: `brew install postgresql`
- Debian/Ubuntu: `sudo apt-get install libpq-dev gcc`

Then re-run `pip install -r requirements.txt`. The provided `Dockerfile` already installs
`libpq-dev` and `gcc` inside the image, so this only affects local/bare-metal installs.

## `401 Unauthorized` on every endpoint requiring a user
This is real JWT auth (not a stand-in header). Register and log in first:
```bash
curl -X POST localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"SomethingStrong123!","full_name":"You"}'

curl -X POST localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"SomethingStrong123!"}'
```
Then send `Authorization: Bearer <access_token>` on subsequent requests. In Swagger UI
(`/docs`), use the **Authorize** button.

## `404 Not Found` on a portfolio/watchlist/alert I know exists
This is intentional if the resource belongs to a different user — ownership is enforced on
every portfolio/watchlist/alert endpoint, and a foreign user's resource returns `404` (not
`403`) so the API never confirms another user's resource exists. Double-check you're
authenticated as the user who created it.

## `422 Unprocessable Entity` on transaction/alert endpoints
Check that:
- `fund_id` / `portfolio_id` / `watchlist_id` are valid UUID strings that actually exist
  (`fund_id` on holdings/transactions has a real foreign key to `mutual_funds.id` — you can't
  invent one)
- `transaction_date` is a valid ISO-8601 datetime (`"2024-01-15T00:00:00Z"`)
- `transaction_type` is one of `BUY`, `SELL`, `SIP`, `DIVIDEND_REINVEST`, `SWITCH_IN`,
  `SWITCH_OUT` (case-sensitive)
- `alert_type` is one of `NAV_ABOVE`, `NAV_BELOW`, `RETURN_ABOVE`, `RETURN_BELOW`,
  `RISK_SCORE_ABOVE`, `PORTFOLIO_DRAWDOWN`

## "Cannot sell more units than currently held"
An intentional `ValueError` from `PortfolioService`, mapped to HTTP 400 — the SELL/SWITCH_OUT
transaction you're recording would take a holding negative. Check the holding's current
`units` (via `GET /api/v1/portfolios/{id}`) against the transaction you're submitting.

## Docker Compose: API container keeps restarting, connection refused to `db`
`depends_on: db: condition: service_healthy` should prevent this, but on a first-ever volume
creation Postgres can take a few extra seconds to initialize. Re-run
`docker compose up` (without `--build`) once `docker compose ps` shows `db` as healthy, or
increase the healthcheck `retries` in `docker-compose.yml`.

## `mypy` fails in CI
The CI workflow runs mypy with `continue-on-error: true` deliberately — a handful of findings
are expected without the `sqlalchemy[mypy]` plugin configured (attribute types on ORM columns,
mostly) and don't block merges. Check the CI logs for genuinely new errors introduced by your
change; fix incrementally rather than trying to zero out the pre-existing count.

## Tests fail with `UnsupportedCompilationError: ... can't render element of type JSONB`
This means a new column was added using `sqlalchemy.dialects.postgresql.JSONB` directly
instead of `app.database.base.PortableJSON` — the test suite runs on SQLite, which has no
native `JSONB` type. Swap the column's type to `PortableJSON` (see `app/models/news.py` or
`app/models/ml.py` for the pattern); it still renders as real `JSONB` on Postgres in
production.

## `TypeError: can't compare offset-naive and offset-aware datetimes`
SQLite (used by the test suite) doesn't preserve `tzinfo` on `DateTime(timezone=True)`
columns the way Postgres does — a value written as UTC-aware comes back naive when read back
under SQLite. Any code comparing a DB-sourced datetime against `datetime.now(timezone.utc)`
should normalize first (see `PortfolioService._to_utc` or the fix in
`AuthService.refresh_access_token` for the pattern) rather than assuming tzinfo survived the
round-trip.
