import { useFunds } from '@/hooks/useFunds'
import { formatPercent, cn } from '@/lib/utils'

export function TickerTape() {
  const { data, isLoading } = useFunds({ pageSize: 20 })
  const funds = data?.funds ?? []

  if (isLoading || funds.length === 0) {
    return (
      <div className="relative overflow-hidden border-y border-white/10 bg-ink-900/60 py-2.5">
        <div className="h-4" />
      </div>
    )
  }

  const items = [...funds, ...funds]

  return (
    <div className="relative overflow-hidden border-y border-white/10 bg-ink-900/60 py-2.5">
      <div className="flex animate-[ticker_45s_linear_infinite] hover:[animation-play-state:paused] w-max">
        {items.map((fund, i) => (
          <div key={`${fund.id}-${i}`} className="flex items-center gap-2 px-5 shrink-0 font-mono-data text-xs">
            <span className="text-paper-200/70">{(fund.amc ?? '').split(' ')[0].toUpperCase()}</span>
            <span className="text-white font-medium">{fund.nav != null ? `₹${fund.nav.toFixed(2)}` : '—'}</span>
            <span className={cn((fund.navChangePercent ?? 0) >= 0 ? 'ticker-up' : 'ticker-down')}>
              {formatPercent(fund.navChangePercent ?? 0)}
            </span>
            <span className="text-white/10 ml-3">|</span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}
