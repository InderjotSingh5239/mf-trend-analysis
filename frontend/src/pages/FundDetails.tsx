import { useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Download,
} from 'lucide-react'

import { useFund } from '@/hooks/useFunds'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { Loader } from '@/components/common/Loader'
import { ErrorState } from '@/components/common/ErrorState'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import { NavHistoryChart } from '@/components/charts/NavHistoryChart'
import { AllocationDonut } from '@/components/charts/AllocationDonut'
import { useWatchlist } from '@/hooks/useWatchlist'
import { useToast } from '@/hooks/useToast'
import { cn, formatPercent } from '@/lib/utils'

import type {
  HoldingItem,
  SectorAllocation,
} from '@/types/fund'

const RISK_COLOR: Record<
  string,
  'emerald' | 'amber' | 'crimson' | 'blue'
> = {
  Low: 'emerald',
  Moderate: 'blue',
  'Moderately High': 'amber',
  High: 'crimson',
  'Very High': 'crimson',
}

export default function FundDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const {
    data: fund,
    isLoading,
    isError,
    refetch,
  } = useFund(id)

  const { isWatched, toggleWatch } = useWatchlist()
  const { showToast } = useToast()

  const derived = useMemo(() => {
    if (!fund) return null

    const positive = (fund.navChangePercent ?? 0) >= 0

    const assetAllocData = fund.assetAllocation
      ? [
          {
            name: 'Equity',
            value: fund.assetAllocation.equity,
          },
          {
            name: 'Debt',
            value: fund.assetAllocation.debt,
          },
          {
            name: 'Cash',
            value: fund.assetAllocation.cash,
          },
          {
            name: 'Other',
            value: fund.assetAllocation.other,
          },
        ].filter(
          (item) => item.value > 0,
        )
      : []

    const sectorData = (
      fund.sectorAllocation ?? []
    ).map((sector: SectorAllocation) => ({
      name: sector.sector,
      value: sector.percent,
    }))

    const returnEntries = fund.returns
      ? (
          Object.entries(
            fund.returns,
          ) as [string, number][]
        )
      : []

    return {
      positive,
      assetAllocData,
      sectorData,
      returnEntries,
    }
  }, [fund])

  if (isLoading) {
    return (
      <Loader
        label="LOADING FUND DATA..."
        className="min-h-[50vh]"
      />
    )
  }

  if (
    isError ||
    !fund ||
    !derived
  ) {
    return (
      <ErrorState
        title="Fund not found"
        onRetry={() => refetch()}
      />
    )
  }

  const {
    positive,
    assetAllocData,
    sectorData,
    returnEntries,
  } = derived

  const watched = isWatched(fund.id)

  const hasReturns =
    returnEntries.length > 0

  const hasHoldings =
    (fund.holdings?.length ?? 0) > 0

  const hasTechnical =
    fund.riskMetrics != null

  const infoRows = [
    fund.fundManager && {
      label: 'Fund Manager',
      value: fund.fundManager,
    },

    fund.fundManagerTenureYears != null && {
      label: 'Manager Tenure',
      value: `${fund.fundManagerTenureYears} years`,
    },

    fund.fundAgeYears != null && {
      label: 'Fund Age',
      value: `${fund.fundAgeYears} years`,
    },

    fund.minSipAmount != null && {
      label: 'Min. SIP',
      value: `₹${fund.minSipAmount}`,
    },

    fund.minLumpsumAmount != null && {
      label: 'Min. Lumpsum',
      value: `₹${fund.minLumpsumAmount}`,
    },

    fund.benchmark && {
      label: 'Benchmark',
      value: fund.benchmark,
    },
  ].filter(
    Boolean,
  ) as {
    label: string
    value: string
  }[]

  const defaultTab = hasReturns
    ? 'returns'
    : hasHoldings
      ? 'holdings'
      : hasTechnical
        ? 'indicators'
        : 'info'

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          {
            label: 'Explore Funds',
            path: '/explore',
          },
          {
            label: fund.name,
          },
        ]}
      />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {fund.category && (
              <Badge variant="outline">
                {fund.category}
              </Badge>
            )}

            {fund.riskLevel && (
              <Badge
                variant={
                  RISK_COLOR[
                    fund.riskLevel
                  ] ?? 'blue'
                }
              >
                {fund.riskLevel}
              </Badge>
            )}

            {fund.isin && (
              <Badge variant="blue">
                {fund.isin}
              </Badge>
            )}
          </div>

          <h1 className="font-display font-bold text-2xl text-ink-950 dark:text-white">
            {fund.name}
          </h1>

          <p className="text-sm text-ink-500 dark:text-paper-200/50">
            {[
              fund.amc,
              fund.benchmark &&
                `Benchmark: ${fund.benchmark}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              toggleWatch(fund.id)

              showToast(
                watched
                  ? 'Removed from watchlist'
                  : 'Added to watchlist',
                'success',
              )
            }}
          >
            <Star
              className={cn(
                'w-4 h-4',
                watched &&
                  'fill-amber-500 text-amber-500',
              )}
            />

            {watched
              ? 'Watching'
              : 'Watch'}
          </Button>

          <Button
            onClick={() =>
              navigate(
                `/predict/${fund.id}`,
              )
            }
          >
            <Sparkles className="w-4 h-4" />
            Predict NAV
          </Button>
        </div>
      </div>

      {/* Main metrics */}
      <div className="grid lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-ink-500 dark:text-paper-200/50 uppercase tracking-wide mb-1">
              Current NAV
            </p>

            <p className="text-3xl font-mono-data font-semibold text-ink-950 dark:text-white">
              {fund.nav != null
                ? `₹${fund.nav.toFixed(2)}`
                : '—'}
            </p>

            {fund.navChangePercent != null && (
              <p
                className={cn(
                  'text-sm font-mono-data flex items-center gap-1 mt-1',
                  positive
                    ? 'ticker-up'
                    : 'ticker-down',
                )}
              >
                {positive ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}

                {formatPercent(
                  fund.navChangePercent,
                )}{' '}
                today
              </p>
            )}
          </CardContent>
        </Card>

        {fund.cagr3y != null && (
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-ink-500 dark:text-paper-200/50 uppercase tracking-wide mb-1">
                3Y CAGR
              </p>

              <p className="text-3xl font-mono-data font-semibold text-emerald-600 dark:text-emerald-400">
                {fund.cagr3y}%
              </p>

              {fund.benchmark && (
                <p className="text-xs text-ink-500 dark:text-paper-200/50 mt-1">
                  vs. {fund.benchmark}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {fund.expenseRatio != null && (
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-ink-500 dark:text-paper-200/50 uppercase tracking-wide mb-1">
                Expense Ratio
              </p>

              <p className="text-3xl font-mono-data font-semibold text-ink-950 dark:text-white">
                {fund.expenseRatio}%
              </p>

              {fund.exitLoad && (
                <p className="text-xs text-ink-500 dark:text-paper-200/50 mt-1">
                  Exit load: {fund.exitLoad}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {fund.aum != null && (
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-ink-500 dark:text-paper-200/50 uppercase tracking-wide mb-1">
                AUM
              </p>

              <p className="text-3xl font-mono-data font-semibold text-ink-950 dark:text-white">
                ₹
                {fund.aum.toLocaleString(
                  'en-IN',
                )}
                Cr
              </p>

              {fund.rating != null && (
                <p className="text-xs text-ink-500 dark:text-paper-200/50 mt-1">
                  Rating:{' '}
                  {'★'.repeat(
                    fund.rating,
                  )}
                  {'☆'.repeat(
                    Math.max(
                      0,
                      5 - fund.rating,
                    ),
                  )}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* NAV History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>
              Historical NAV
            </CardTitle>

            <CardDescription>
              Daily NAV with 30D and 90D moving averages
            </CardDescription>
          </div>

          <Button
            variant="ghost"
            size="sm"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </Button>
        </CardHeader>

        <CardContent>
          {fund.navHistory.length > 0 ? (
            <NavHistoryChart
              data={fund.navHistory}
              showMovingAverages
              height={340}
            />
          ) : (
            <p className="text-sm text-ink-500 dark:text-paper-200/50 py-12 text-center">
              No NAV history available yet for this fund.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Details */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              Fund Details
            </CardTitle>
          </CardHeader>

          <CardContent>
            <Tabs
              defaultValue={defaultTab}
            >
              <TabsList className="mb-4">
                {hasReturns && (
                  <TabsTrigger value="returns">
                    Returns
                  </TabsTrigger>
                )}

                {hasHoldings && (
                  <TabsTrigger value="holdings">
                    Top Holdings
                  </TabsTrigger>
                )}

                {hasTechnical && (
                  <TabsTrigger value="indicators">
                    Risk Metrics
                  </TabsTrigger>
                )}

                <TabsTrigger value="info">
                  Fund Info
                </TabsTrigger>
              </TabsList>

              {/* Returns */}
              {hasReturns && (
                <TabsContent value="returns">
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {returnEntries.map(
                      (
                        [period, value]: [
                          string,
                          number,
                        ],
                      ) => (
                        <div
                          key={period}
                          className="text-center p-3 rounded-xl bg-ink-950/[0.03] dark:bg-white/5"
                        >
                          <p className="text-[10px] text-ink-500 dark:text-paper-200/40 uppercase mb-1">
                            {period}
                          </p>

                          <p
                            className={cn(
                              'text-sm font-mono-data font-semibold',
                              value >= 0
                                ? 'ticker-up'
                                : 'ticker-down',
                            )}
                          >
                            {formatPercent(
                              value,
                            )}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                </TabsContent>
              )}

              {/* Holdings */}
              {hasHoldings && (
                <TabsContent value="holdings">
                  <div className="divide-y divide-ink-950/5 dark:divide-white/5">
                    {(
                      fund.holdings ?? []
                    ).map(
                      (
                        holding: HoldingItem,
                      ) => (
                        <div
                          key={holding.name}
                          className="flex items-center justify-between py-2.5"
                        >
                          <div>
                            <p className="text-sm font-medium text-ink-950 dark:text-paper-100">
                              {holding.name}
                            </p>

                            <p className="text-xs text-ink-500 dark:text-paper-200/50">
                              {holding.sector}
                            </p>
                          </div>

                          <p className="text-sm font-mono-data font-medium text-ink-950 dark:text-white">
                            {holding.percent}%
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                </TabsContent>
              )}

              {/* Risk metrics */}
              {hasTechnical &&
                fund.riskMetrics && (
                  <TabsContent value="indicators">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Metric
                        label="Alpha"
                        value={
                          fund.riskMetrics.alpha
                        }
                      />

                      <Metric
                        label="Beta"
                        value={
                          fund.riskMetrics.beta
                        }
                      />

                      <Metric
                        label="Sharpe Ratio"
                        value={
                          fund.riskMetrics
                            .sharpeRatio
                        }
                      />

                      <Metric
                        label="Std. Deviation"
                        value={`${fund.riskMetrics.standardDeviation}%`}
                      />

                      <Metric
                        label="Sortino Ratio"
                        value={
                          fund.riskMetrics.sortino
                        }
                      />

                      {fund.riskMetrics
                        .rSquared != null && (
                        <Metric
                          label="R²"
                          value={
                            fund.riskMetrics
                              .rSquared
                          }
                        />
                      )}
                    </div>
                  </TabsContent>
                )}

              {/* Fund info */}
              <TabsContent value="info">
                {infoRows.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-y-3 text-sm">
                    {infoRows.map(
                      (
                        row: {
                          label: string
                          value: string
                        },
                      ) => (
                        <InfoRow
                          key={row.label}
                          label={row.label}
                          value={row.value}
                        />
                      ),
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-ink-500 dark:text-paper-200/50 py-6 text-center">
                    No additional fund information available.
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Right side */}
        <div className="space-y-6">
          {assetAllocData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Asset Allocation
                </CardTitle>
              </CardHeader>

              <CardContent>
                <AllocationDonut
                  data={assetAllocData}
                  height={200}
                />
              </CardContent>
            </Card>
          )}

          {sectorData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Sector Allocation
                </CardTitle>
              </CardHeader>

              <CardContent>
                <AllocationDonut
                  data={sectorData}
                  height={220}
                />
              </CardContent>
            </Card>
          )}

          {fund.riskMetrics && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Risk Metrics
                </CardTitle>
              </CardHeader>

              <CardContent className="grid grid-cols-2 gap-3">
                <Metric
                  label="Alpha"
                  value={
                    fund.riskMetrics.alpha
                  }
                />

                <Metric
                  label="Beta"
                  value={
                    fund.riskMetrics.beta
                  }
                />

                <Metric
                  label="Sharpe Ratio"
                  value={
                    fund.riskMetrics.sharpeRatio
                  }
                />

                <Metric
                  label="Std. Deviation"
                  value={`${fund.riskMetrics.standardDeviation}%`}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Link
        to="/explore"
        className="hidden"
      >
        Back
      </Link>
    </div>
  )
}

function InfoRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex justify-between border-b border-ink-950/5 dark:border-white/5 pb-2.5">
      <span className="text-ink-500 dark:text-paper-200/50">
        {label}
      </span>

      <span className="font-medium text-ink-950 dark:text-paper-100">
        {value}
      </span>
    </div>
  )
}

function Metric({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="p-3 rounded-xl bg-ink-950/[0.03] dark:bg-white/5 text-center">
      <p className="text-[10px] text-ink-500 dark:text-paper-200/40 uppercase mb-1">
        {label}
      </p>

      <p className="text-sm font-mono-data font-semibold text-ink-950 dark:text-white">
        {value}
      </p>
    </div>
  )
}
