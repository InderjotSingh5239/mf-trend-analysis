import { cn } from '@/lib/utils'

export function Progress({
  value,
  className,
  barClassName,
}: {
  value: number
  className?: string
  barClassName?: string
}) {
  return (
    <div className={cn('h-2 w-full rounded-full bg-ink-950/8 dark:bg-white/10 overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-full bg-emerald-500 transition-all duration-500', barClassName)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}
