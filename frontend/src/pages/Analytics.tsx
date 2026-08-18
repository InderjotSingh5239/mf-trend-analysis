import { useMemo, useState } from 'react'
import { LineChart as LineChartIcon } from 'lucide-react'
import {
  useFunds,
  useFund,
} from '@/hooks/useFunds'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  chartValueToNumber,
  cn,
  formatPercent,
} from '@/lib/utils'
import { Loader } from '@/components/common/Loader'

function rollingReturns(
  history: { date: string; nav: number }[],
  days: number,
) {
  return history
    .slice(days)
    .map((point, index) => {
      const previous = history[index].nav
      return {
        date: point.date,
        return:
          previous > 0
            ? ((point.nav - previous) / previous) * 100
            : 0,
      }
    })
}

function drawdowns(
  history: { date: string; nav: number }[],
) {
  let peak = 0

  return history.map((point) => {
    peak = Math.max(peak, point.nav)
    return {
      date: point.date,
      drawdown:
        peak > 0
          ? ((point.nav - peak) / peak) * 100
          : 0,
    }
  })
}

function monthlyReturns(
  history: { date: string; nav: number }[],
) {
  const byMonth = new Map<
    string,
    { first: number; last: number }
  >()

  for (const point of history) {
    const key = point.date.slice(0, 7)
    const current = byMonth.get(key)

    if (!current) {
      byMonth.set(key, {
        first: point.nav,
        last: point.nav,
      })
    } else {
      current.last = point.nav
    }
  }

  return [...byMonth.entries()].map(
    ([month, values]) => ({
      month,
      return:
        values.first > 0
          ? ((values.last - values.first) /
              values.first) *
            100
          : 0,
    }),
  )
}

export default function Analytics() {
  const { data: fundsPage, isLoading: fundsLoading } =
    useFunds({ page: 1, pageSize: 100 })

  const funds = fundsPage?.funds ?? []
  const [fundId, setFundId] = useState('')

  const effectiveId = fundId || funds[0]?.id
  const { data: fund, isLoading: fundLoading } =
    useFund(effectiveId)

  const history = fund?.navHistory ?? []

  const rolling30 = useMemo(
    () => rollingReturns(history, 30),
    [history],
  )
  const drawdown = useMemo(
    () => drawdowns(history),
    [history],
  )
  const monthly = useMemo(
    () => monthlyReturns(history),
    [history],
  )

  const maxDrawdown =
    drawdown.length > 0
      ? Math.min(...drawdown.map((p) => p.drawdown))
      : null

  if (fundsLoading || fundLoading) {
    return (
      <Loader
        label="LOADING ANALYTICS..."
        className="min-h-[40vh]"
      />
    )
  }

  if (!fund) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          No fund analytics are available yet.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-ink-950 dark:text-white flex items-center gap-2">
            <LineChartIcon className="w-6 h-6" />
            Performance Analytics
          </h1>
          <p className="text-sm text-ink-500 dark:text-paper-200/50">
            Calculated from the selected fund's real NAV history.
          </p>
        </div>

        <Select
          value={effectiveId}
          onChange={(event) =>
            setFundId(event.target.value)
          }
          className="max-w-md"
        >
          {funds.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="NAV"
          value={
            fund.nav == null
              ? '—'
              : `₹${fund.nav.toFixed(2)}`
          }
        />
        <MetricCard
          label="Daily Change"
          value={formatPercent(
            fund.navChangePercent ?? 0,
          )}
          positive={
            (fund.navChangePercent ?? 0) >= 0
          }
        />
        <MetricCard
          label="Annualized Volatility"
          value={
            history.length > 1
              ? `${calculateVolatility(history).toFixed(2)}%`
              : '—'
          }
        />
        <MetricCard
          label="Max Drawdown"
          value={
            maxDrawdown == null
              ? '—'
              : `${maxDrawdown.toFixed(2)}%`
          }
          positive={false}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>30-Day Rolling Return</CardTitle>
            <CardDescription>
              Based on real NAV observations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer
              width="100%"
              height={260}
            >
              <LineChart data={rolling30}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) =>
                    String(value).slice(5)
                  }
                />
                <YAxis
                  tickFormatter={(value) =>
                    `${value}%`
                  }
                />
                <Tooltip
                  formatter={(value) =>
                    `${chartValueToNumber(value).toFixed(2)}%`
                  }
                />
                <Line
                  type="monotone"
                  dataKey="return"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Drawdown</CardTitle>
            <CardDescription>
              Decline from the historical NAV peak.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer
              width="100%"
              height={260}
            >
              <AreaChart data={drawdown}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) =>
                    String(value).slice(5)
                  }
                />
                <YAxis
                  tickFormatter={(value) =>
                    `${value}%`
                  }
                />
                <Tooltip
                  formatter={(value) =>
                    `${chartValueToNumber(value).toFixed(2)}%`
                  }
                />
                <Area
                  type="monotone"
                  dataKey="drawdown"
                  fillOpacity={0.15}
                  strokeWidth={1.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Returns</CardTitle>
          <CardDescription>
            Month-over-month change from actual NAV data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {monthly.map((item) => (
              <div
                key={item.month}
                title={`${item.month}: ${formatPercent(item.return)}`}
                className={cn(
                  'w-16 h-16 rounded-lg flex flex-col items-center justify-center text-white',
                  item.return >= 3
                    ? 'bg-emerald-600'
                    : item.return >= 0
                      ? 'bg-emerald-500/60'
                      : item.return >= -3
                        ? 'bg-crimson-500/60'
                        : 'bg-crimson-600',
                )}
              >
                <span className="text-[9px] opacity-80">
                  {item.month.slice(2)}
                </span>
                <span className="text-xs font-mono-data font-semibold">
                  {item.return.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function calculateVolatility(
  history: { date: string; nav: number }[],
) {
  const returns: number[] = []

  for (let i = 1; i < history.length; i += 1) {
    const previous = history[i - 1].nav
    if (previous > 0) {
      returns.push(
        (history[i].nav - previous) / previous,
      )
    }
  }

  if (returns.length < 2) return 0

  const mean =
    returns.reduce((sum, value) => sum + value, 0) /
    returns.length

  const variance =
    returns.reduce(
      (sum, value) =>
        sum + (value - mean) ** 2,
      0,
    ) /
    (returns.length - 1)

  return Math.sqrt(variance) * Math.sqrt(252) * 100
}

function MetricCard({
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
      <CardContent className="p-4">
        <p className="text-[10px] text-ink-500 dark:text-paper-200/50 uppercase mb-1">
          {label}
        </p>
        <p
          className={cn(
            'text-lg font-mono-data font-semibold',
            positive === undefined
              ? 'text-ink-950 dark:text-white'
              : positive
                ? 'ticker-up'
                : 'ticker-down',
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  )
}
