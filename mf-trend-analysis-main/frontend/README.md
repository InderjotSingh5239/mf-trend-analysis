# NAVigate — AI Mutual Fund Prediction & Analytics (Frontend)

A FinTech-grade frontend for an AI-powered mutual fund NAV prediction and performance
analysis platform. Built with React 19 + TypeScript (strict) + Vite + Tailwind CSS v4.

This is one half of a monorepo — see the [root README](../README.md) for the full-stack
picture and [`docs/API_INTEGRATION.md`](../docs/API_INTEGRATION.md) for exactly which
features are wired to the real backend vs. mock data.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173. No backend or API keys are required — the app runs entirely
on realistic mock data out of the box.

```bash
npm run build     # production build → dist/
npm run lint      # oxlint
npm run preview   # preview the production build locally
npx tsc -b        # strict type check
```

## Connecting the real backend

By default the app runs on mock data. To point it at a real backend instead:

```bash
cp .env.example .env
# edit .env: VITE_API_BASE_URL=http://localhost:8000/api/v1
npm run dev
```

Every service in `src/services/*.ts` checks `isBackendConfigured` (from
`src/api/client.ts`) and switches from mock data to real `apiClient` calls, mapping
the backend's response shape into the app's existing UI types via
`src/services/*Adapter.ts`. **Not every page is wired to real data yet** — see
[`docs/API_INTEGRATION.md`](../docs/API_INTEGRATION.md) in the repo root for the
exact, honest breakdown (what's fully real, what has a documented fallback, and what
remains an explicitly scoped gap).

## What's built

Fully implemented, end-to-end:

- **Landing** — marketing page with animated hero, live ticker tape, feature grid
- **Auth** — Login, Register, Forgot Password, JWT + refresh-token session handling
- **Dashboard** — KPIs, market overview chart, AI recommendations, risk meter, gainers/losers, recent activity
- **Explorer** — search, filter (category/AMC/risk/expense ratio), sort, pagination
- **Fund Details** — NAV history + moving averages, holdings, sector/asset allocation, risk metrics, technical indicators tab (sections render conditionally based on data availability in real-backend mode)
- **AI Prediction** — fund + horizon selection, animated "model running" state, forecast chart with confidence band, feature importance, Buy/Hold/Sell signal, graceful "not yet generated" state
- **Analytics** — CAGR/alpha/beta/Sharpe, rolling returns, drawdown, monthly return heatmap
- **Compare Funds** — up to 5 funds side by side
- **Portfolio** — holdings table, P&L, allocation donut, growth chart (currently mock-only — see integration doc)
- **SIP & Lumpsum Calculators** — interactive sliders, projection charts (client-side math, verified to numerically match the backend's formulas)
- **Watchlist** — persisted locally, fund details fetched via the real-mode-aware fund service
- **News** — filterable market insights feed
- **About, Settings, 404** — supporting pages

Every page passes `tsc -b` (strict mode), `oxlint`, and `vite build` with zero errors.

## Architecture

```
src/
  api/          Axios client (JWT auth interceptor with refresh-on-401, error normalization)
  components/
    ui/         Low-level primitives (button, card, badge, input, select, dialog, tabs...)
    layout/     AppLayout, Navbar, Sidebar, Footer
    common/     FundCard, FilterPanel, Pagination, EmptyState, ErrorState, Loader, ProtectedRoute...
    charts/     NavHistoryChart, Sparkline, AllocationDonut, ForecastChart
  contexts/     Theme, Toast, Watchlist, Auth (React context + a paired hook + provider, one per concern)
  data/         Mock fund/news data + prediction simulation engine (used when no backend is configured)
  hooks/        React Query hooks (useFunds, usePrediction, useNews, useAuth...)
  pages/        One file per route
  services/     Data-fetching functions — mock by default, real when VITE_API_BASE_URL is set
  services/*Adapter.ts   Maps real backend response shapes into the app's existing UI types
  types/        Shared TypeScript domain types (`fund.ts`, `auth.ts`) and the backend's exact wire format (`api.ts`)
```

- **State**: React Query for server state, React Context for auth/theme/toast/watchlist, local
  `useState` for form/UI state.
- **Styling**: Tailwind CSS v4 (CSS-first config in `src/index.css`), custom design tokens
  (emerald/blue/crimson on an ink/paper base), IBM Plex Mono for all numeric/ticker data.
- **Forms**: React Hook Form + Zod for validated forms (auth pages).
- **Charts**: Recharts throughout, theme-aware (respects light/dark mode).

## Notes

- When running on mock data, all fund data, NAV history, and predictions are
  synthetically generated (`src/data/mockFunds.ts`, `src/data/predictionEngine.ts`)
  using a seeded PRNG, so the same fund always shows the same chart shape across
  reloads — useful for demos and screenshots.
- The watchlist's fund-ID list persists to `localStorage` regardless of mode; the fund
  *details* shown are fetched live (mock or real, depending on configuration).
- Predictions are model estimates for demonstration only, not investment advice — this
  disclaimer is also shown in the product UI itself.
- Fields with no backend data source (star ratings, holdings composition, sector/asset
  allocation, trailing-period returns) are typed as optional and hidden — never
  fabricated — when running against real backend data.
