import { Link } from 'react-router-dom'
import type { MutualFund } from '@/types/fund'
import { formatPercent } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function FundRow({ fund, metric = 'change' }: { fund: MutualFund; metric?: 'change' | 'cagr' }) {
  const value = (metric === 'cagr' ? fund.cagr3y : fund.navChangePercent) ?? 0
  const positive = value >= 0

  return (
    <Link
      to={`/funds/${fund.id}`}
      className="flex items-center justify-between gap-3 py-2.5 px-2 -mx-2 rounded-lg hover:bg-ink-950/5 dark:hover:bg-white/5 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink-950 dark:text-paper-100 truncate">{fund.name}</p>
        <p className="text-xs text-ink-500 dark:text-paper-200/50">{fund.category}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-mono-data font-medium text-ink-950 dark:text-white">
          {fund.nav != null ? `₹${fund.nav.toFixed(2)}` : '—'}
        </p>
        <p className={cn('text-xs font-mono-data', positive ? 'ticker-up' : 'ticker-down')}>
          {formatPercent(value)}
        </p>
      </div>
    </Link>
  )
}
