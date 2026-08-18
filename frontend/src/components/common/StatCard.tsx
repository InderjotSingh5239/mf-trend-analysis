import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function StatCard({
  icon: Icon,
  label,
  value,
  delta,
  positive,
  accent = 'emerald',
}: {
  icon: LucideIcon
  label: string
  value: string
  delta?: string
  positive?: boolean
  accent?: 'emerald' | 'blue' | 'amber'
}) {
  const accentClass = {
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    amber: 'bg-amber-500/10 text-amber-500',
  }[accent]

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', accentClass)}>
            <Icon className="w-[18px] h-[18px]" />
          </div>
          {delta && (
            <span className={cn('text-xs font-mono-data font-medium', positive ? 'ticker-up' : 'ticker-down')}>
              {delta}
            </span>
          )}
        </div>
        <p className="text-2xl font-mono-data font-semibold text-ink-950 dark:text-white">{value}</p>
        <p className="text-xs text-ink-500 dark:text-paper-200/50 mt-1">{label}</p>
      </CardContent>
    </Card>
  )
}
