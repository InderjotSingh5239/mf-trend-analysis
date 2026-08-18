# Test Fixtures — NOT used by production code

The files in this directory (`mockFunds.ts`, `mockNews.ts`, `predictionEngine.ts`) are
synthetic data and a client-side prediction simulator that were previously wired into the
app as a fallback when no backend was configured.

**As of this change, no production code imports anything from this directory.** Every
service (`fundService.ts`, `newsService.ts`, `predictionService.ts`, `authService.ts`,
`portfolioService.ts`, etc.) calls the real FastAPI backend directly and has no mock
fallback — if the backend is unreachable, the UI shows a real loading/error state, not
synthetic data (see `ErrorState`/`Loader` usage throughout `src/pages/`).

These files are kept only as a reference for writing future unit/integration test
fixtures (e.g. mocking `apiClient` responses in tests), and are intentionally isolated
here so it's obvious at a glance that nothing in `src/pages/`, `src/services/`, or
`src/hooks/` depends on them. If you add a new page or service, do not import from this
folder — call the real backend via `src/api/client.ts`.
