import { useMemo } from 'react'
import { useFunds } from '@/hooks/useFunds'
import { formatPercent } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function TickerTape() {
  const { data } = useFunds({
    page: 1,
    pageSize: 12,
  })

  const items = useMemo(
    () => [...(data?.funds ?? []), ...(data?.funds ?? [])],
    [data?.funds],
  )

  if (!items.length) {
    return null
  }

  return (
    <div className="relative overflow-hidden border-y border-white/10 bg-ink-900/60 py-2.5">
      <div className="flex animate-[ticker_45s_linear_infinite] hover:[animation-play-state:paused] w-max">
        {items.map((fund, index) => (
          <div
            key={`${fund.id}-${index}`}
            className="flex items-center gap-2 px-5 shrink-0 font-mono-data text-xs"
          >
            <span className="text-paper-200/70">
              {(fund.amc ?? 'MF')
                .split(' ')[0]
                .toUpperCase()}
            </span>
            <span className="text-white font-medium">
              {fund.nav == null
                ? '—'
                : `₹${fund.nav.toFixed(2)}`}
            </span>
            <span
              className={cn(
                (fund.navChangePercent ?? 0) >= 0
                  ? 'ticker-up'
                  : 'ticker-down',
              )}
            >
              {formatPercent(
                fund.navChangePercent ?? 0,
              )}
            </span>
            <span className="text-white/10 ml-3">
              |
            </span>
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
