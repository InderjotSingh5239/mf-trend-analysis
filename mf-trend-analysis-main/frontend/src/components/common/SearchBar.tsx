import { Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState, type FormEvent } from 'react'

export function SearchBar({ className }: { className?: string }) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (query.trim()) navigate(`/explore?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <form onSubmit={onSubmit} className={className}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="search"
          placeholder="Search funds, AMCs, categories..."
          aria-label="Search mutual funds"
          className="h-10 w-full rounded-lg border border-ink-950/10 dark:border-white/10 bg-ink-950/[0.03] dark:bg-white/5 pl-9 pr-14 text-sm text-ink-950 dark:text-paper-100 placeholder:text-ink-500/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
        />
        <kbd className="hidden sm:flex absolute right-2.5 top-1/2 -translate-y-1/2 items-center px-1.5 py-0.5 rounded border border-ink-950/10 dark:border-white/15 text-[10px] font-mono-data text-ink-500">
          ⌘K
        </kbd>
      </div>
    </form>
  )
}
