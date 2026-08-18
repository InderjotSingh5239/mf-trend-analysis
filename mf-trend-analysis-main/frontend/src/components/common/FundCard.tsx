import { Link } from 'react-router-dom'
import { Star, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import type { MutualFund } from '@/types/fund'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sparkline } from '@/components/charts/Sparkline'
import { useWatchlist } from '@/hooks/useWatchlist'
import { useToast } from '@/hooks/useToast'
import { cn, formatPercent, formatCompactNumber } from '@/lib/utils'

const RISK_COLOR: Record<string, 'emerald' | 'amber' | 'crimson' | 'blue'> = {
  Low: 'emerald',
  Moderate: 'blue',
  'Moderately High': 'amber',
  High: 'crimson',
  'Very High': 'crimson',
}

export function FundCard({ fund }: { fund: MutualFund }) {
  const { isWatched, toggleWatch } = useWatchlist()
  const { showToast } = useToast()
  const watched = isWatched(fund.id)
  const positive = (fund.navChangePercent ?? 0) >= 0

  const onToggleWatch = (e: React.MouseEvent) => {
    e.preventDefault()
    toggleWatch(fund.id)
    showToast(watched ? `Removed ${fund.name} from watchlist` : `Added ${fund.name} to watchlist`, 'success')
  }

  return (
    <Link to={`/funds/${fund.id}`}>
      <Card className="hover:border-emerald-500/30 dark:hover:border-emerald-500/30 transition-colors group h-full">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <p className="font-display font-semibold text-[15px] text-ink-950 dark:text-white leading-snug line-clamp-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {fund.name}
              </p>
              {fund.amc && <p className="text-xs text-ink-500 dark:text-paper-200/50 mt-1">{fund.amc}</p>}
            </div>
            <button
              onClick={onToggleWatch}
              aria-label={watched ? 'Remove from watchlist' : 'Add to watchlist'}
              className="shrink-0 p-1.5 rounded-lg hover:bg-ink-950/5 dark:hover:bg-white/10"
            >
              <Star className={cn('w-4 h-4', watched ? 'fill-amber-500 text-amber-500' : 'text-ink-500')} />
            </button>
          </div>

          {(fund.category || fund.riskLevel) && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {fund.category && <Badge variant="outline">{fund.category}</Badge>}
              {fund.riskLevel && <Badge variant={RISK_COLOR[fund.riskLevel] ?? 'blue'}>{fund.riskLevel}</Badge>}
            </div>
          )}

          <div className="flex items-end justify-between gap-3 mb-3">
            <div>
              <p className="text-2xl font-mono-data font-semibold text-ink-950 dark:text-white">
                {fund.nav != null ? `₹${fund.nav.toFixed(2)}` : '—'}
              </p>
              {fund.navChangePercent != null && (
                <p className={cn('text-xs font-mono-data flex items-center gap-0.5 mt-0.5', positive ? 'ticker-up' : 'ticker-down')}>
                  {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {formatPercent(fund.navChangePercent)}
                </p>
              )}
            </div>
            {fund.navHistory.length > 0 && (
              <div className="w-24">
                <Sparkline data={fund.navHistory} positive={positive} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-ink-950/5 dark:border-white/5 text-center">
            <div>
              <p className="text-[10px] text-ink-500 dark:text-paper-200/40 uppercase tracking-wide">3Y CAGR</p>
              <p className="text-sm font-mono-data font-medium text-emerald-600 dark:text-emerald-400">
                {fund.cagr3y != null ? `${fund.cagr3y}%` : '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-ink-500 dark:text-paper-200/40 uppercase tracking-wide">Expense</p>
              <p className="text-sm font-mono-data font-medium text-ink-950 dark:text-paper-100">
                {fund.expenseRatio != null ? `${fund.expenseRatio}%` : '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-ink-500 dark:text-paper-200/40 uppercase tracking-wide">AUM</p>
              <p className="text-sm font-mono-data font-medium text-ink-950 dark:text-paper-100">
                {fund.aum != null ? `₹${formatCompactNumber(fund.aum)}Cr` : '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
