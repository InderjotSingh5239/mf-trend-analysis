import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-14 h-14 rounded-2xl bg-ink-950/5 dark:bg-white/5 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-ink-500" />
      </div>
      <h3 className="font-display font-semibold text-ink-950 dark:text-white mb-1">{title}</h3>
      {description && <p className="text-sm text-ink-500 dark:text-paper-200/50 max-w-sm">{description}</p>}
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
