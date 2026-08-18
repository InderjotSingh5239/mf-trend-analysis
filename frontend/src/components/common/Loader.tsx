import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Loader({ label, className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-12', className)}>
      <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
      {label && <p className="text-sm text-ink-500 dark:text-paper-200/50 font-mono-data">{label}</p>}
    </div>
  )
}
