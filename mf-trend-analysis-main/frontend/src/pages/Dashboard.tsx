import { Wallet, TrendingUp, TrendingDown, Sparkles, Activity, Clock, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/common/StatCard'
import { FundRow } from '@/components/common/FundRow'
import { FundCard } from '@/components/common/FundCard'
import { Loader } from '@/components/common/Loader'
import { NavHistoryChart } from '@/components/charts/NavHistoryChart'
import { useFunds, useTopGainers, useTopLosers, useTrendingFunds } from '@/hooks/useFunds'
import { formatPercent } from '@/lib/utils'

export default function Dashboard() {
  const { data: gainers, isLoading: loadingGainers } = useTopGainers(4)
  const { data: losers, isLoading: loadingLosers } = useTopLosers(4)
  const { data: trending, isLoading: loadingTrending } = useTrendingFunds(6)
  // A cheap page-size-1 request just to read the backend's reported total
  // fund count — this is real data (ApiMutualFundListResponse.total), not
  // derived from the length of any locally-fetched slice.
  const { data: fundsPage } = useFunds({ pageSize: 1 })

  const benchmarkFund = trending?.[0]

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
          value="--"
          delta="Connect Portfolio"
          positive={false}
          accent="emerald"
        />
        <StatCard
          icon={Activity}
          label="Total Funds Tracked"
          value={fundsPage?.total?.toLocaleString('en-IN') ?? '--'}
          delta="Live from AMFI"
          positive
          accent="blue"
        />
        <StatCard
          icon={TrendingUp}
          label="Top Category CAGR"
          value="--"
          delta="Real data pending"
          positive={false}
          accent="emerald"
        />
        <StatCard
          icon={TrendingDown}
          label="Avg. Expense Ratio"
          value="--"
          delta="Real data pending"
          positive={false}
          accent="amber"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main chart + trending funds */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Market Overview</CardTitle>
                <CardDescription>
                  {benchmarkFund?.name ?? 'Loading...'} · {benchmarkFund?.benchmark ?? ''}
                </CardDescription>
              </div>
              <Badge variant="emerald">{formatPercent(benchmarkFund?.navChangePercent ?? 0)}</Badge>
            </CardHeader>
            <CardContent>
              <NavHistoryChart data={benchmarkFund?.navHistory ?? []} showMovingAverages />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Trending Funds</CardTitle>
                <CardDescription>Ranked by day-over-day NAV change</CardDescription>
              </div>
              <Link to="/explore" className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline">
                Browse all <ArrowRight className="w-3 h-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {loadingTrending ? (
                <Loader />
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {trending?.map((fund) => (
                    <FundCard key={fund.id} fund={fund} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Risk Meter</CardTitle>
              <CardDescription>Your portfolio's blended volatility score</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                <p className="text-sm text-ink-500 dark:text-paper-200/50">
                  Connect your portfolio to see a real risk score.
                </p>
                <Link to="/portfolio" className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline">
                  Go to Portfolio
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Gainers</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingGainers ? (
                <Loader />
              ) : (
                <div className="divide-y divide-ink-950/5 dark:divide-white/5">
                  {gainers?.map((f) => (
                    <FundRow key={f.id} fund={f} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Losers</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingLosers ? (
                <Loader />
              ) : (
                <div className="divide-y divide-ink-950/5 dark:divide-white/5">
                  {losers?.map((f) => (
                    <FundRow key={f.id} fund={f} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-4 h-4" /> Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <Clock className="w-8 h-8 text-ink-500/30 dark:text-paper-200/20" />
                <p className="text-sm text-ink-500 dark:text-paper-200/50">No recent activity to show yet.</p>
                <p className="text-xs text-ink-500/70 dark:text-paper-200/30">
                  Transactions, watchlist changes, and predictions you generate will appear here.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
