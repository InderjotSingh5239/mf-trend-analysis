import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Wallet, TrendingUp, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Dialog } from '@/components/ui/dialog'
import { AllocationDonut } from '@/components/charts/AllocationDonut'
import { Loader } from '@/components/common/Loader'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { useAuth } from '@/hooks/useAuth'
import { useFunds } from '@/hooks/useFunds'
import {
  useAddTransaction,
  useCreatePortfolio,
  usePortfolioSummary,
  usePortfolioTransactions,
  usePortfolios,
} from '@/hooks/usePortfolio'
import { useToast } from '@/hooks/useToast'
import { cn, formatCurrency, formatPercent } from '@/lib/utils'
import type { ApiTransaction } from '@/types/api'

export default function Portfolio() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const navigate = useNavigate()

  if (authLoading) return <Loader label="LOADING..." className="min-h-[50vh]" />

  if (!isAuthenticated) {
    return (
      <EmptyState
        icon={Wallet}
        title="Sign in to see your portfolio"
        description="Your holdings, transactions, and P&L are tied to your account."
        actionLabel="Sign In"
        onAction={() => navigate('/login')}
      />
    )
  }

  return <AuthenticatedPortfolio />
}

function AuthenticatedPortfolio() {
  const { data: portfolios, isLoading, isError, refetch } = usePortfolios(true)
  const [activePortfolioId, setActivePortfolioId] = useState<string | undefined>(undefined)
  const [createOpen, setCreateOpen] = useState(false)

  const portfolioId = activePortfolioId ?? portfolios?.[0]?.id

  if (isLoading) return <Loader label="LOADING PORTFOLIO..." className="min-h-[50vh]" />
  if (isError) return <ErrorState title="Couldn't load your portfolios" onRetry={() => refetch()} />

  if (!portfolios || portfolios.length === 0) {
    return (
      <>
        <EmptyState
          icon={Wallet}
          title="Create your first portfolio"
          description="Track your mutual fund investments, P&L, and allocation in one place."
          actionLabel="Create Portfolio"
          onAction={() => setCreateOpen(true)}
        />
        <CreatePortfolioDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      </>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-ink-950 dark:text-white flex items-center gap-2">
            <Wallet className="w-6 h-6" /> Portfolio
          </h1>
          <p className="text-sm text-ink-500 dark:text-paper-200/50">A snapshot of your mutual fund holdings.</p>
        </div>
        <div className="flex items-center gap-2">
          {portfolios.length > 1 && (
            <Select value={portfolioId} onChange={(e) => setActivePortfolioId(e.target.value)} className="max-w-xs">
              {portfolios.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          )}
          <Button variant="outline" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" /> New Portfolio
          </Button>
        </div>
      </div>

      {portfolioId && <PortfolioDetail portfolioId={portfolioId} />}
      <CreatePortfolioDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}

function PortfolioDetail({ portfolioId }: { portfolioId: string }) {
  const { data: summary, isLoading: summaryLoading, isError: summaryError, refetch: refetchSummary } = usePortfolioSummary(portfolioId)
  const { data: transactions, isLoading: txLoading } = usePortfolioTransactions(portfolioId)
  const [addTxOpen, setAddTxOpen] = useState(false)

  if (summaryLoading) return <Loader label="LOADING SUMMARY..." className="min-h-[30vh]" />
  if (summaryError || !summary) return <ErrorState title="Couldn't load portfolio summary" onRetry={() => refetchSummary()} />

  const allocationData = Object.entries(summary.categoryAllocation).map(([name, value]) => ({ name, value }))

  return (
    <>
      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-ink-500 dark:text-paper-200/50 uppercase mb-1">Invested Amount</p>
            <p className="text-2xl font-mono-data font-semibold text-ink-950 dark:text-white">{formatCurrency(summary.totalInvested, true)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-ink-500 dark:text-paper-200/50 uppercase mb-1">Current Value</p>
            <p className="text-2xl font-mono-data font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(summary.currentValue, true)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-ink-500 dark:text-paper-200/50 uppercase mb-1">Total P&L</p>
            <p className={cn('text-2xl font-mono-data font-semibold flex items-center gap-1', summary.totalPnl >= 0 ? 'ticker-up' : 'ticker-down')}>
              <TrendingUp className="w-5 h-5" /> {formatCurrency(summary.totalPnl, true)} ({formatPercent(summary.totalPnlPercent)})
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Portfolio Metrics</CardTitle>
            <CardDescription>Risk and diversification, computed from your real holdings</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Metric label="Holdings" value={summary.numberOfHoldings.toString()} />
            <Metric label="XIRR" value={summary.xirr != null ? formatPercent(summary.xirr) : '—'} />
            <Metric label="Diversification" value={`${summary.diversificationScore.toFixed(0)}/100`} />
            <Metric label="Risk Score" value={`${summary.riskScore.toFixed(0)}/100`} />
            <Metric label="Volatility" value={`${summary.volatility.toFixed(2)}%`} />
            <Metric label="Sharpe Ratio" value={summary.sharpeRatio != null ? summary.sharpeRatio.toFixed(2) : '—'} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            {allocationData.length === 0 ? (
              <p className="text-sm text-ink-500 dark:text-paper-200/50 py-8 text-center">No holdings yet.</p>
            ) : (
              <AllocationDonut data={allocationData} height={220} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Holdings</CardTitle>
            <CardDescription>Current positions in this portfolio</CardDescription>
          </div>
          <Button size="sm" onClick={() => setAddTxOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> Record Transaction
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {summary.topHoldings.length === 0 ? (
            <p className="text-sm text-ink-500 dark:text-paper-200/50 py-8 text-center">
              No holdings yet — record your first transaction to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-950/5 dark:border-white/5 text-left">
                    <th className="px-5 py-3 text-xs font-medium text-ink-500 dark:text-paper-200/50 uppercase">Fund</th>
                    <th className="px-5 py-3 text-xs font-medium text-ink-500 dark:text-paper-200/50 uppercase">Units</th>
                    <th className="px-5 py-3 text-xs font-medium text-ink-500 dark:text-paper-200/50 uppercase">Invested</th>
                    <th className="px-5 py-3 text-xs font-medium text-ink-500 dark:text-paper-200/50 uppercase">Current Value</th>
                    <th className="px-5 py-3 text-xs font-medium text-ink-500 dark:text-paper-200/50 uppercase">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.topHoldings.map((h) => (
                    <tr key={h.id} className="border-b border-ink-950/5 dark:border-white/5 last:border-0">
                      <td className="px-5 py-3">
                        <Link to={`/funds/${h.fundId}`} className="font-medium text-ink-950 dark:text-paper-100 hover:text-emerald-600 dark:hover:text-emerald-400">
                          {h.fundName}
                        </Link>
                      </td>
                      <td className="px-5 py-3 font-mono-data text-ink-950 dark:text-paper-100">{h.units.toFixed(2)}</td>
                      <td className="px-5 py-3 font-mono-data text-ink-950 dark:text-paper-100">{formatCurrency(h.investedAmount, true)}</td>
                      <td className="px-5 py-3 font-mono-data text-ink-950 dark:text-white">{formatCurrency(h.currentValue, true)}</td>
                      <td className="px-5 py-3">
                        <Badge variant={h.pnl >= 0 ? 'emerald' : 'crimson'}>{formatPercent(h.pnlPercent)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {txLoading ? (
            <Loader />
          ) : !transactions || transactions.length === 0 ? (
            <p className="text-sm text-ink-500 dark:text-paper-200/50 py-8 text-center">No transactions recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-950/5 dark:border-white/5 text-left">
                    <th className="px-5 py-3 text-xs font-medium text-ink-500 dark:text-paper-200/50 uppercase">Fund</th>
                    <th className="px-5 py-3 text-xs font-medium text-ink-500 dark:text-paper-200/50 uppercase">Type</th>
                    <th className="px-5 py-3 text-xs font-medium text-ink-500 dark:text-paper-200/50 uppercase">Units</th>
                    <th className="px-5 py-3 text-xs font-medium text-ink-500 dark:text-paper-200/50 uppercase">NAV</th>
                    <th className="px-5 py-3 text-xs font-medium text-ink-500 dark:text-paper-200/50 uppercase">Amount</th>
                    <th className="px-5 py-3 text-xs font-medium text-ink-500 dark:text-paper-200/50 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="border-b border-ink-950/5 dark:border-white/5 last:border-0">
                      <td className="px-5 py-3 font-medium text-ink-950 dark:text-paper-100">{t.fundName}</td>
                      <td className="px-5 py-3">
                        <Badge variant="outline">{t.transactionType}</Badge>
                      </td>
                      <td className="px-5 py-3 font-mono-data text-ink-950 dark:text-paper-100">{t.units.toFixed(2)}</td>
                      <td className="px-5 py-3 font-mono-data text-ink-950 dark:text-paper-100">₹{t.nav.toFixed(2)}</td>
                      <td className="px-5 py-3 font-mono-data text-ink-950 dark:text-white">{formatCurrency(t.amount, true)}</td>
                      <td className="px-5 py-3 text-ink-500 dark:text-paper-200/50 font-mono-data">
                        {new Date(t.transactionDate).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AddTransactionDialog portfolioId={portfolioId} open={addTxOpen} onClose={() => setAddTxOpen(false)} />
    </>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-ink-950/[0.03] dark:bg-white/5 text-center">
      <p className="text-[10px] text-ink-500 dark:text-paper-200/40 uppercase mb-1">{label}</p>
      <p className="text-sm font-mono-data font-semibold text-ink-950 dark:text-white">{value}</p>
    </div>
  )
}

function CreatePortfolioDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const { mutate, isPending } = useCreatePortfolio()
  const { showToast } = useToast()

  const onSubmit = () => {
    if (!name.trim()) return
    mutate(
      { name: name.trim() },
      {
        onSuccess: () => {
          showToast('Portfolio created', 'success')
          setName('')
          onClose()
        },
        onError: (err) => {
          showToast(err instanceof Error ? err.message : 'Could not create portfolio', 'error')
        },
      }
    )
  }

  return (
    <Dialog open={open} onClose={onClose} title="Create Portfolio">
      <div className="p-5 space-y-4">
        <div>
          <label className="text-xs font-medium text-ink-500 dark:text-paper-200/50 mb-1.5 block">Portfolio Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Retirement Fund" />
        </div>
        <Button className="w-full" onClick={onSubmit} disabled={isPending || !name.trim()}>
          {isPending ? 'Creating...' : 'Create Portfolio'}
        </Button>
      </div>
    </Dialog>
  )
}

function AddTransactionDialog({
  portfolioId,
  open,
  onClose,
}: {
  portfolioId: string
  open: boolean
  onClose: () => void
}) {
  const { data: fundsPage } = useFunds({ pageSize: 50 })
  const funds = fundsPage?.funds ?? []

  const [fundId, setFundId] = useState('')
  const [type, setType] = useState<ApiTransaction['transaction_type']>('BUY')
  const [units, setUnits] = useState('')
  const [nav, setNav] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))

  const { mutate, isPending } = useAddTransaction(portfolioId)
  const { showToast } = useToast()

  const selectedFund = funds.find((f) => f.id === fundId)

  const onSubmit = () => {
    const unitsNum = Number(units)
    const navNum = Number(nav)
    if (!selectedFund || !unitsNum || unitsNum <= 0 || !navNum || navNum <= 0 || !date) {
      showToast('Fill in all fields with valid values', 'error')
      return
    }
    mutate(
      {
        fundId: selectedFund.id,
        fundName: selectedFund.name,
        transactionType: type,
        units: unitsNum,
        nav: navNum,
        transactionDate: new Date(date).toISOString(),
        sector: undefined,
        category: selectedFund.category,
      },
      {
        onSuccess: () => {
          showToast('Transaction recorded', 'success')
          setUnits('')
          setNav('')
          onClose()
        },
        onError: (err) => {
          showToast(err instanceof Error ? err.message : 'Could not record transaction', 'error')
        },
      }
    )
  }

  return (
    <Dialog open={open} onClose={onClose} title="Record Transaction">
      <div className="p-5 space-y-4">
        <div>
          <label className="text-xs font-medium text-ink-500 dark:text-paper-200/50 mb-1.5 block">Fund</label>
          <Select value={fundId} onChange={(e) => setFundId(e.target.value)}>
            <option value="">Select a fund...</option>
            {funds.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-ink-500 dark:text-paper-200/50 mb-1.5 block">Transaction Type</label>
          <Select value={type} onChange={(e) => setType(e.target.value as ApiTransaction['transaction_type'])}>
            <option value="BUY">Buy</option>
            <option value="SELL">Sell</option>
            <option value="SIP">SIP</option>
            <option value="DIVIDEND_REINVEST">Dividend Reinvest</option>
            <option value="SWITCH_IN">Switch In</option>
            <option value="SWITCH_OUT">Switch Out</option>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-ink-500 dark:text-paper-200/50 mb-1.5 block">Units</label>
            <Input type="number" min="0" step="0.001" value={units} onChange={(e) => setUnits(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-500 dark:text-paper-200/50 mb-1.5 block">NAV (₹)</label>
            <Input type="number" min="0" step="0.01" value={nav} onChange={(e) => setNav(e.target.value)} placeholder="0.00" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-ink-500 dark:text-paper-200/50 mb-1.5 block">Transaction Date</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
        </div>
        <Button className="w-full" onClick={onSubmit} disabled={isPending}>
          {isPending ? 'Recording...' : 'Record Transaction'}
        </Button>
      </div>
    </Dialog>
  )
}
