import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export function Breadcrumbs({ items }: { items: { label: string; path?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm mb-4 flex-wrap">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-ink-500/50" />}
          {item.path ? (
            <Link to={item.path} className="text-ink-500 dark:text-paper-200/60 hover:text-emerald-600 dark:hover:text-emerald-400">
              {item.label}
            </Link>
          ) : (
            <span className="text-ink-950 dark:text-white font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
