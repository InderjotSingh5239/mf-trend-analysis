import { Wallet, TrendingUp, TrendingDown, Sparkles, Activity, ArrowRight, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { StatCard } from '@/components/common/StatCard'
import { FundRow } from '@/components/common/FundRow'
import { FundCard } from '@/components/common/FundCard'
import { Loader } from '@/components/common/Loader'
import { NavHistoryChart } from '@/components/charts/NavHistoryChart'
import { useFund, useFunds, useTopGainers, useTopLosers, useTrendingFunds } from '@/hooks/useFunds'
import { useLatestPredictions } from '@/hooks/usePrediction'
import { formatPercent } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { usePortfolioSummary } from '@/hooks/usePortfolio'
import type { PredictionResult } from '@/types/fund'

const RECOMMENDATION_STYLE: Record<PredictionResult['recommendation'], { variant: 'emerald' | 'amber' | 'crimson'; Icon: typeof ArrowUpRight }> = {
  Buy: { variant: 'emerald', Icon: ArrowUpRight },
  Hold: { variant: 'amber', Icon: Minus },
  Sell: { variant: 'crimson', Icon: ArrowDownRight },
}

function AIPredictionCard({ prediction, fundName }: { prediction: PredictionResult; fundName: string }) {
  const style = RECOMMENDATION_STYLE[prediction.recommendation]
  return (
    <Link to={`/predict?fund=${prediction.fundId}`}>
      <Card className="hover:border-emerald-500/30 dark:hover:border-emerald-500/30 transition-colors h-full">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <p className="font-display font-semibold text-[15px] text-ink-950 dark:text-white leading-snug line-clamp-2">
              {fundName}
            </p>
            <Badge variant={style.variant} className="shrink-0 flex items-center gap-1">
              <style.Icon className="w-3 h-3" /> {prediction.recommendation}
            </Badge>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-ink-500 dark:text-paper-200/50">Expected return ({prediction.horizon}d)</p>
              <p className="text-lg font-mono-data font-semibold text-ink-950 dark:text-white">
                {formatPercent(prediction.expectedReturnPercent)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-ink-500 dark:text-paper-200/50">Confidence</p>
              <p className="text-sm font-mono-data text-ink-950 dark:text-white">{prediction.confidenceScore}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default function Dashboard() {
  const { data: fundsPage } = useFunds({ page: 1, pageSize: 1 })
  const fundsPageTotal = fundsPage?.total?.toLocaleString('en-IN') ?? '0'
  const { data: gainers, isLoading: loadingGainers } = useTopGainers(4)
  const { data: losers, isLoading: loadingLosers } = useTopLosers(4)
  const { data: trending, isLoading: loadingTrending } = useTrendingFunds(6)
  const { isAuthenticated } = useAuth()
  const { data: portfolioSummary } = usePortfolioSummary(isAuthenticated)

  // The dashboard's headline chart needs a fund's *full* NAV history,
  // which only the fund-detail endpoint returns (list/trending endpoints
  // only carry latest-NAV metadata — see PROJECT_AUDIT.md item B). So we
  // pick a real fund (the top CAGR-ranked trending fund) and fetch its
  // detail separately instead of trying to chart the list item directly.
  const topTrendingId = trending?.[0]?.id
  const { data: benchmarkFund, isLoading: loadingBenchmark } = useFund(topTrendingId)

  // Real, model-backed predictions for the trending funds — omits any
  // fund with no persisted prediction rather than relabeling "trending"
  // as "AI" (see PROJECT_AUDIT.md item C).
  const trendingIds = (trending ?? []).map((f) => f.id)
  const { data: predictions = [], isLoading: loadingPredictions } = useLatestPredictions(trendingIds)
  const fundsById = new Map((trending ?? []).map((f) => [f.id, f]))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-ink-950 dark:text-white">Dashboard</h1>
          <p className="text-sm text-ink-500 dark:text-paper-200/50">Welcome back — here's your market overview.</p>
        </div>
        <Link to="/predict">
          <Button>
            <Sparkles className="w-4 h-4" /> Run AI Prediction
          </Button>
        </Link>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
  icon={Wallet}
  label="Portfolio Value"
  value={portfolioSummary ? `₹${portfolioSummary.current_value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}
  delta={portfolioSummary ? formatPercent(portfolioSummary.total_pnl_percent) : 'Sign in to connect'}
  positive={portfolioSummary ? portfolioSummary.total_pnl >= 0 : false}
  accent="emerald"
        />
        <StatCard
  icon={Activity}
  label="Total Funds Tracked"
  value={fundsPageTotal}
  delta="From API"
  positive
  accent="blue"
        />
        <StatCard
  icon={TrendingUp}
  label="Top 3Y CAGR"
  value={benchmarkFund?.cagr3y != null ? formatPercent(benchmarkFund.cagr3y) : '—'}
  delta={benchmarkFund?.name ?? (loadingBenchmark ? 'Loading' : 'Unavailable')}
  positive={(benchmarkFund?.cagr3y ?? 0) >= 0}
  accent="emerald"
        />
        <StatCard
  icon={TrendingDown}
  label="Expense Ratio"
  value={benchmarkFund?.expenseRatio == null ? '—' : `${benchmarkFund.expenseRatio}%`}
  delta="Top trending fund"
  positive={false}
  accent="amber"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main chart + AI picks */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Market Overview</CardTitle>
                <CardDescription>
  {benchmarkFund?.name ?? (loadingBenchmark ? 'Loading...' : 'No fund selected')} · {benchmarkFund?.benchmark ?? ''}
</CardDescription>
              </div>
              <Badge variant="emerald">{formatPercent(benchmarkFund?.navChangePercent ?? 0)}</Badge>
            </CardHeader>
            <CardContent>
              {loadingBenchmark ? (
                <Loader />
              ) : (
                <NavHistoryChart data={benchmarkFund?.navHistory ?? []} showMovingAverages />
              )}
            </CardContent>
          </Card>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-ink-950 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" /> AI Recommendations
              </h2>
              <Link to="/predict" className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {loadingPredictions || loadingTrending ? (
              <Loader />
            ) : predictions.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center space-y-1">
                  <p className="text-sm text-ink-500 dark:text-paper-200/50">
                    No AI predictions available yet for today's trending funds.
                  </p>
                  <p className="text-xs text-ink-500/70 dark:text-paper-200/40">
                    Predictions require a trained model to have already run for a fund.{' '}
                    <Link to="/predict" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                      Generate one
                    </Link>{' '}
                    from the AI Predictions page.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {predictions.map((prediction) => {
                  const fund = fundsById.get(prediction.fundId)
                  return (
                    <AIPredictionCard
                      key={prediction.fundId}
                      prediction={prediction}
                      fundName={fund?.name ?? 'Fund'}
                    />
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Risk Meter</CardTitle>
              <CardDescription>Your portfolio's blended volatility score</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-end justify-between">
                <span className="text-3xl font-mono-data font-semibold text-ink-950 dark:text-white">
                  {portfolioSummary ? portfolioSummary.risk_score.toFixed(1) : '—'}
                </span>
                <Badge variant="amber">
                  {portfolioSummary
                    ? portfolioSummary.risk_score >= 7
                      ? 'High'
                      : portfolioSummary.risk_score >= 4
                        ? 'Moderate'
                        : 'Low'
                    : 'Sign in'}
                </Badge>
              </div>
              <Progress value={portfolioSummary ? Math.min(100, portfolioSummary.risk_score * 10) : 0} barClassName="bg-gradient-to-r from-emerald-500 via-amber-500 to-crimson-500" />
              <p className="text-xs text-ink-500 dark:text-paper-200/50">
                Calculated from the portfolio risk analytics returned by the backend.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Gainers</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingGainers ? <Loader /> : <div className="divide-y divide-ink-950/5 dark:divide-white/5">{gainers?.map((f) => <FundRow key={f.id} fund={f} />)}</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Losers</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingLosers ? <Loader /> : <div className="divide-y divide-ink-950/5 dark:divide-white/5">{losers?.map((f) => <FundRow key={f.id} fund={f} />)}</div>}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Trending Funds</CardTitle>
            <CardDescription>Ranked by trailing 3-year CAGR, computed from stored NAV history</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTrending ? (
              <Loader />
            ) : !trending?.length ? (
              <p className="text-sm text-ink-500 dark:text-paper-200/50 py-6 text-center">
                No funds currently have enough NAV history (~3 years) to compute a trailing CAGR ranking.
              </p>
            ) : (
              <div className="grid sm:grid-cols-3 gap-4">
                {trending.map((f) => (
                  <div key={f.id} className="space-y-1.5">
                    <FundCard fund={f} />
                    {f.cagr3y != null && (
                      <p className="text-xs text-ink-500 dark:text-paper-200/50 px-1">
                        3Y CAGR: <span className="font-mono-data font-medium text-emerald-600 dark:text-emerald-400">{formatPercent(f.cagr3y)}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            
              <div className="py-6 text-center">
              <p className="text-sm text-ink-500 dark:text-paper-200/50">
                      No recent activity available.
                  </p>
              <p className="text-xs text-ink-500/70 dark:text-paper-200/40 mt-1">
              Activity will appear here when portfolio transactions, SIPs,
              watchlist actions, or predictions are available from the API.
              </p>
</div>
            
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
