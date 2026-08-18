# Frontend ↔ Backend Integration

This document is the honest map of what's really wired to the live FastAPI
backend, what deliberately still uses mock data (and why), and what's a
known, explicitly-scoped gap rather than a silent omission.

## How the toggle works

`frontend/src/api/client.ts` exports `isBackendConfigured`, which is
`Boolean(import.meta.env.VITE_API_BASE_URL)`. Every service in
`frontend/src/services/*.ts` checks this flag:

- **Unset** (default): the app runs entirely on mock data
  (`src/data/mockFunds.ts`, `mockNews.ts`, the client-side prediction
  simulator). No backend required — this is what makes the app demoable
  out of the box.
- **Set** (e.g. `VITE_API_BASE_URL=http://localhost:8000/api/v1`): services
  call the real backend and adapt its response shape into the app's existing
  UI types via `src/services/*Adapter.ts`.

## Fully wired to the real backend

| Feature | Frontend | Backend | Notes |
|---|---|---|---|
| Register / Login / Refresh / Logout | `authService.ts`, `AuthContext` | `POST /auth/register`, `/login`, `/refresh` | Refresh-token rotation bug fixed during integration (backend doesn't rotate the refresh token on `/auth/refresh`; the frontend previously assumed it did) |
| Fund list + search + pagination | `fundService.ts` → `fundAdapter.ts` | `GET /funds` | Category/risk-level filtering and sorting are applied **client-side on the fetched page only** — the backend doesn't support server-side filtering by category/risk/AMC beyond `search`, so this is a real but partial filter, not a full-dataset one |
| Fund detail + NAV history | `fundService.ts` → `fundAdapter.ts` | `GET /funds/{id}` | Moving averages (MA30/MA90) are computed client-side from the real NAV history |
| Current NAV + day change | `fundAdapter.ts` | `GET /funds`, `GET /funds/{id}` (`latest_nav`, `nav_change_percent`) | Added during this integration — computed server-side via a window-function query, avoiding N+1 requests per fund on the list page |
| Top gainers / losers | `fundService.ts` | `GET /funds` (sorted client-side by `nav_change_percent`) | Real data; the backend has no dedicated "movers" endpoint, so this fetches a larger page and sorts client-side |
| "Trending" funds | `fundService.ts` | (falls back to gainers) | The mock version ranks by 3Y CAGR, which the backend doesn't compute (no aggregate returns table) — real mode uses day-change as a documented approximation, not a fabricated CAGR |
| NAV predictions | `predictionService.ts` → `predictionAdapter.ts` | `GET /predictions/{fund_id}` | See "Admin-only generation" below |
| News | `newsService.ts` → `newsAdapter.ts` | `GET /news` | Backend categorizes articles by the NewsAPI query string that found them, not a clean label — mapped via a lookup table in `newsAdapter.ts` |
| Watchlist (fund lookup) | `Watchlist.tsx` → `useWatchlistFunds` | `GET /funds/{id}` (one per watched fund) | Fixed during integration: this page used to look up watched funds in mock data only, so a real-backend fund would silently disappear from the watchlist page after being starred |
| SIP / Lumpsum / Retirement / Monte Carlo math | Client-side (`SipCalculator.tsx` etc.) | `POST /calculators/*` (same formulas) | See "Calculator math" below — kept client-side deliberately, but verified to numerically agree with the backend |

## Admin-only prediction generation

`POST /predictions/{fund_id}/generate` requires an admin role — regular
users can only `GET` predictions that have already been generated (by an
admin, or by the scheduled Celery retraining task). This means:

- A fund with no predictions yet returns `404` from the backend.
- The frontend's `PredictionNotAvailableError` (in `predictionService.ts`)
  catches this and `AIPrediction.tsx` renders a clear "no prediction
  available yet" state instead of a generic error or an infinite spinner.
- There is currently no "Generate now" button for regular users in the UI —
  this is intentional, matching the backend's authorization model, not an
  oversight.

## Calculator math: client-side by design, verified to agree with the backend

The SIP/Lumpsum calculator pages compute instantly on every slider drag
(`useMemo` over local state) rather than calling `POST /calculators/sip` on
every tick — a network round-trip per slider pixel would be a real UX
regression. The backend's calculator endpoints (`CalculatorService`) remain
fully real and available for any future server-side use (reports, saved
projections, etc.).

**During this integration, a real discrepancy was found and fixed**: the
frontend used annuity-due compounding (investment compounds the same month
it's made — the industry-standard convention for Indian SIP calculators)
while the backend originally used ordinary-annuity compounding (investment
compounds starting the following month). Same inputs would have produced
different maturity values depending on which one you trusted. The backend
(`calculator_service.py`, `monte_carlo_service.py`) was changed to match the
annuity-due convention; a 15-year ₹10,000/month SIP at 12% now computes to
₹50,45,760 on both sides, verified numerically.

## Known gap: Portfolio page

`backend/app/api/v1/endpoints/portfolio.py` is a fully real, tested,
per-user-authenticated CRUD API (portfolios, holdings, transactions,
weighted-average NAV, XIRR, dashboard summary) — see `backend/tests/
test_api_portfolio.py` and `test_portfolio_service.py`.

`frontend/src/pages/Portfolio.tsx`, however, still renders a static
illustrative demo portfolio built from local mock data and is **not yet
wired to this real API**. Unlike Watchlist (which was a small, self-contained
fix), wiring Portfolio properly means adding real forms for creating a
portfolio and recording transactions, and replacing the whole page's data
model — a genuine feature-build task, not a quick integration fix, and it
was explicitly out of scope for this pass rather than silently skipped.
The backend is ready for it whenever that UI work happens.

## Fields with no backend data source at all

The mock fund model includes several fields the backend has no data source
for and makes no attempt to fabricate: star rating, top holdings breakdown,
sector allocation, asset allocation (equity/debt/cash/other %), trailing
period returns (1M/3M/.../5Y), fund manager tenure, and minimum SIP amount
(the backend has `min_investment` for lumpsum, but no separate SIP minimum).

`frontend/src/types/fund.ts`'s `MutualFund` interface marks all of these as
optional, and the components that render them
(`FundCard.tsx`, `FundDetails.tsx`, `Analytics.tsx`, `CompareFunds.tsx`)
check for presence and hide the corresponding UI section or show `—` rather
than a fabricated `0` or `0%` — which for financial data would be actively
misleading, not just a cosmetic gap.
