import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
  )

  return (
    <nav className="flex items-center justify-center gap-1.5" aria-label="Pagination">
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="w-9 h-9 flex items-center justify-center rounded-lg border border-ink-950/10 dark:border-white/10 disabled:opacity-40 hover:bg-ink-950/5 dark:hover:bg-white/10 text-ink-950 dark:text-paper-100"
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      {pages.map((p, i) => (
        <span key={p} className="flex items-center">
          {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1 text-ink-500 text-sm">…</span>}
          <button
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cn(
              'w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium font-mono-data',
              p === page
                ? 'bg-emerald-500 text-white'
                : 'text-ink-950 dark:text-paper-100 hover:bg-ink-950/5 dark:hover:bg-white/10'
            )}
          >
            {p}
          </button>
        </span>
      ))}
      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="w-9 h-9 flex items-center justify-center rounded-lg border border-ink-950/10 dark:border-white/10 disabled:opacity-40 hover:bg-ink-950/5 dark:hover:bg-white/10 text-ink-950 dark:text-paper-100"
        aria-label="Next page"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  )
}
