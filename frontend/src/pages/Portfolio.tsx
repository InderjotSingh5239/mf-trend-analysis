import { useEffect, useState } from 'react'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AllocationDonut } from '@/components/charts/AllocationDonut'
import { Loader } from '@/components/common/Loader'
import { EmptyState } from '@/components/common/EmptyState'
import {
  createPortfolio,
  fetchPortfolioSummary,
  listPortfolios,
} from '@/services/portfolioService'
import type {
  ApiPortfolio,
  ApiPortfolioSummary,
} from '@/types/api'
import {
  cn,
  formatCurrency,
  formatPercent,
} from '@/lib/utils'

export default function Portfolio() {
  const [portfolio, setPortfolio] =
    useState<ApiPortfolio | null>(null)
  const [summary, setSummary] =
    useState<ApiPortfolioSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)

    try {
      let portfolios = await listPortfolios()
      let current = portfolios[0]

      if (!current) {
        current = await createPortfolio()
        portfolios = [current]
      }

      setPortfolio(current)
      setSummary(
        await fetchPortfolioSummary(current.id),
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load portfolio.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  if (loading) {
    return (
      <Loader
        label="LOADING PORTFOLIO..."
        className="min-h-[40vh]"
      />
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="font-medium">
            Unable to load portfolio
          </p>
          <p className="text-sm text-ink-500 mt-2">
            {error}
          </p>
          <Button
            className="mt-5"
            onClick={() => void load()}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!portfolio || !summary) {
    return (
      <EmptyState
        icon={Wallet}
        title="No portfolio available"
        description="Create a portfolio to start tracking your investments."
      />
    )
  }

  const allocationData = Object.entries(
    summary.category_allocation,
  ).map(([name, value]) => ({
    name,
    value,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-ink-950 dark:text-white flex items-center gap-2">
            <Wallet className="w-6 h-6" />
            {portfolio.name}
          </h1>
          <p className="text-sm text-ink-500 dark:text-paper-200/50">
            Live portfolio values from your backend account.
          </p>
        </div>
        <Link to="/explore">
          <Button>
            <Plus className="w-4 h-4" />
            Add Investment
          </Button>
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric
          label="Invested"
          value={formatCurrency(
            summary.total_invested,
            true,
          )}
        />
        <Metric
          label="Current Value"
          value={formatCurrency(
            summary.current_value,
            true,
          )}
        />
        <Metric
          label="P&L"
          value={`${formatCurrency(summary.total_pnl, true)} (${formatPercent(summary.total_pnl_percent)})`}
          positive={summary.total_pnl >= 0}
        />
        <Metric
          label="Risk Score"
          value={summary.risk_score.toFixed(1)}
        />
      </div>

      {summary.number_of_holdings === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="font-display font-semibold text-lg">
              Your portfolio is empty
            </p>
            <p className="text-sm text-ink-500 mt-2">
              Add transactions from your fund research flow to
              see live holdings, P&L and allocation.
            </p>
            <Link to="/explore">
              <Button className="mt-5">
                Explore Funds
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Top Holdings</CardTitle>
                <CardDescription>
                  Current positions calculated by the backend.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-ink-950/5 dark:border-white/5 text-left">
                        <th className="px-5 py-3">Fund</th>
                        <th className="px-5 py-3">Units</th>
                        <th className="px-5 py-3">Value</th>
                        <th className="px-5 py-3">P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.top_holdings.map(
                        (holding) => (
                          <tr
                            key={holding.id}
                            className="border-b border-ink-950/5 dark:border-white/5 last:border-0"
                          >
                            <td className="px-5 py-3">
                              <Link
                                to={`/funds/${holding.fund_id}`}
                                className="font-medium hover:text-emerald-600"
                              >
                                {holding.fund_name}
                              </Link>
                            </td>
                            <td className="px-5 py-3 font-mono-data">
                              {holding.units.toFixed(2)}
                            </td>
                            <td className="px-5 py-3 font-mono-data">
                              {formatCurrency(
                                holding.current_value,
                                true,
                              )}
                            </td>
                            <td className="px-5 py-3">
                              <Badge
                                variant={
                                  holding.pnl >= 0
                                    ? 'emerald'
                                    : 'crimson'
                                }
                              >
                                {formatPercent(
                                  holding.pnl_percent,
                                )}
                              </Badge>
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Allocation</CardTitle>
              </CardHeader>
              <CardContent>
                <AllocationDonut
                  data={allocationData}
                  height={260}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Portfolio Risk</CardTitle>
              <CardDescription>
                Backend-calculated portfolio metrics.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-3 gap-4">
              <Metric
                label="Diversification"
                value={`${summary.diversification_score.toFixed(1)}/100`}
              />
              <Metric
                label="Volatility"
                value={`${summary.volatility.toFixed(2)}%`}
              />
              <Metric
                label="Sharpe Ratio"
                value={
                  summary.sharpe_ratio == null
                    ? '—'
                    : summary.sharpe_ratio.toFixed(2)
                }
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function Metric({
  label,
  value,
  positive,
}: {
  label: string
  value: string
  positive?: boolean
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs text-ink-500 dark:text-paper-200/50 uppercase mb-1">
          {label}
        </p>
        <p
          className={cn(
            'text-xl font-mono-data font-semibold',
            positive === undefined
              ? 'text-ink-950 dark:text-white'
              : positive
                ? 'ticker-up'
                : 'ticker-down',
          )}
        >
          {positive === true && (
            <TrendingUp className="inline w-4 h-4 mr-1" />
          )}
          {positive === false && (
            <TrendingDown className="inline w-4 h-4 mr-1" />
          )}
          {value}
        </p>
      </CardContent>
    </Card>
  )
}
