import { useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { GitCompareArrows, X, Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/EmptyState'
import { Loader } from '@/components/common/Loader'
import { useFunds } from '@/hooks/useFunds'
import { fetchFundRiskProfile, type RiskProfile } from '@/services/marketService'
import type { MutualFund } from '@/types/fund'
import { cn, formatPercent } from '@/lib/utils'

const MAX_COMPARE = 5

interface CompareRow {
  label: string
  get: (f: MutualFund, risk?: RiskProfile) => string
  positive?: (f: MutualFund, risk?: RiskProfile) => boolean
}

const ROWS: CompareRow[] = [
  { label: 'NAV', get: (f) => (f.nav != null ? `₹${f.nav.toFixed(2)}` : '—') },
  { label: 'Day Change', get: (f) => formatPercent(f.navChangePercent ?? 0), positive: (f) => (f.navChangePercent ?? 0) >= 0 },
  { label: 'Risk Level', get: (f) => f.riskLevel ?? '—' },
  { label: 'Expense Ratio', get: (f) => (f.expenseRatio != null ? `${f.expenseRatio}%` : '—') },
  { label: 'AUM', get: (f) => (f.aum != null ? `₹${f.aum.toLocaleString('en-IN')}Cr` : '—') },
  {
    label: 'Annualized Return',
    get: (_f, risk) => (risk?.annualizedReturn != null ? `${risk.annualizedReturn.toFixed(2)}%` : '—'),
    positive: (_f, risk) => (risk?.annualizedReturn ?? 0) >= 0,
  },
  { label: 'Alpha', get: (_f, risk) => (risk?.alpha != null ? risk.alpha.toFixed(2) : '—'), positive: (_f, risk) => (risk?.alpha ?? 0) >= 0 },
  { label: 'Beta', get: (_f, risk) => (risk?.beta != null ? risk.beta.toFixed(2) : '—') },
  {
    label: 'Sharpe Ratio',
    get: (_f, risk) => (risk?.sharpeRatio != null ? risk.sharpeRatio.toFixed(2) : '—'),
    positive: (_f, risk) => (risk?.sharpeRatio ?? 0) >= 1,
  },
]

export default function CompareFunds() {
  const { data: fundsPage, isLoading: fundsLoading } = useFunds({ pageSize: 50 })
  const allFunds = fundsPage?.funds ?? []

  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const funds = selectedIds.map((id) => allFunds.find((f) => f.id === id)).filter((f): f is MutualFund => !!f)
  const availableToAdd = allFunds.filter((f) => !selectedIds.includes(f.id))

  const riskQueries = useQueries({
    queries: funds.map((f) => ({
      queryKey: ['fund-risk-profile', f.id],
      queryFn: () => fetchFundRiskProfile(f.id),
      retry: 1,
      staleTime: 60_000,
    })),
  })
  const riskById = new Map(funds.map((f, i) => [f.id, riskQueries[i]?.data]))

  const addFund = (id: string) => {
    if (selectedIds.length < MAX_COMPARE) setSelectedIds((prev) => [...prev, id])
  }
  const removeFund = (id: string) => setSelectedIds((prev) => prev.filter((i) => i !== id))

  if (fundsLoading) return <Loader label="LOADING FUNDS..." className="min-h-[40vh]" />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-ink-950 dark:text-white flex items-center gap-2">
          <GitCompareArrows className="w-6 h-6" /> Compare Funds
        </h1>
        <p className="text-sm text-ink-500 dark:text-paper-200/50">Compare up to {MAX_COMPARE} funds side by side.</p>
      </div>

      {selectedIds.length < MAX_COMPARE && (
        <Card>
          <CardContent className="p-4 flex items-center gap-3 flex-wrap">
            <Plus className="w-4 h-4 text-ink-500 shrink-0" />
            <Select
              className="max-w-sm"
              value=""
              onChange={(e) => e.target.value && addFund(e.target.value)}
            >
              <option value="">Add a fund to compare...</option>
              {availableToAdd.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
            <span className="text-xs text-ink-500 dark:text-paper-200/40">{selectedIds.length}/{MAX_COMPARE} selected</span>
          </CardContent>
        </Card>
      )}

      {funds.length === 0 ? (
        <EmptyState icon={GitCompareArrows} title="No funds selected" description="Add funds above to start comparing." />
      ) : (
        <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
          <div className="min-w-[640px]">
            <div
              className="grid gap-3 mb-3"
              style={{ gridTemplateColumns: `160px repeat(${funds.length}, minmax(180px, 1fr))` }}
            >
              <div />
              {funds.map((f) => (
                <Card key={f.id} className="relative">
                  <button
                    onClick={() => removeFund(f.id)}
                    aria-label={`Remove ${f.name}`}
                    className="absolute top-2 right-2 p-1 rounded-lg hover:bg-ink-950/10 dark:hover:bg-white/10 text-ink-500"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <CardContent className="p-4">
                    <p className="font-display font-semibold text-sm text-ink-950 dark:text-white leading-snug pr-5 mb-1">{f.name}</p>
                    <p className="text-xs text-ink-500 dark:text-paper-200/50">{f.amc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardContent className="p-0">
                {ROWS.map((row, i) => (
                  <div
                    key={row.label}
                    className={cn(
                      'grid items-center px-4 py-3',
                      i !== ROWS.length - 1 && 'border-b border-ink-950/5 dark:border-white/5'
                    )}
                    style={{ gridTemplateColumns: `160px repeat(${funds.length}, minmax(180px, 1fr))` }}
                  >
                    <p className="text-xs font-medium text-ink-500 dark:text-paper-200/50 uppercase tracking-wide">{row.label}</p>
                    {funds.map((f) => {
                      const risk = riskById.get(f.id)
                      const isGood = row.positive?.(f, risk)
                      return (
                        <p
                          key={f.id}
                          className={cn(
                            'text-sm font-mono-data font-medium',
                            row.positive ? (isGood ? 'ticker-up' : 'ticker-down') : 'text-ink-950 dark:text-paper-100'
                          )}
                        >
                          {row.get(f, risk)}
                        </p>
                      )
                    })}
                  </div>
                ))}
                <div
                  className="grid items-center px-4 py-3"
                  style={{ gridTemplateColumns: `160px repeat(${funds.length}, minmax(180px, 1fr))` }}
                >
                  <p className="text-xs font-medium text-ink-500 dark:text-paper-200/50 uppercase tracking-wide">Category</p>
                  {funds.map((f) => (
                    <Badge key={f.id} variant="outline" className="w-fit">
                      {f.category ?? '—'}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
            <p className="text-[11px] text-ink-500 dark:text-paper-200/30 mt-3">
              Annualized return, alpha, beta, and Sharpe ratio require sufficient benchmark history and may show
              "—" for funds without enough stored NAV data.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
