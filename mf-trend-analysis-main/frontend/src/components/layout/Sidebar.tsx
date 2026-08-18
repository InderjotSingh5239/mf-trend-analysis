import { NavLink } from 'react-router-dom'
import { TrendingUp, X } from 'lucide-react'
import { PRIMARY_NAV, SECONDARY_NAV } from '@/lib/routes'
import { cn } from '@/lib/utils'

export function Sidebar({ mobileOpen, onCloseMobile }: { mobileOpen: boolean; onCloseMobile: () => void }) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors group',
      isActive
        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
        : 'text-ink-500 dark:text-paper-200/70 hover:bg-ink-950/5 dark:hover:bg-white/5 hover:text-ink-950 dark:hover:text-white'
    )

  const content = (
    <>
      <div className="flex items-center justify-between px-2 mb-8">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <p className="font-display font-bold text-[15px] text-ink-950 dark:text-white">NAVigate</p>
            <p className="text-[11px] text-ink-500 dark:text-paper-200/50 font-mono-data">AI FUND ANALYTICS</p>
          </div>
        </div>
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1 text-ink-500 hover:text-ink-950 dark:hover:text-white"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto" aria-label="Primary">
        {PRIMARY_NAV.map((item) => (
          <NavLink key={item.path} to={item.path} className={linkClass} onClick={onCloseMobile}>
            <item.icon className="w-[18px] h-[18px] shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="pt-4 mt-4 border-t border-ink-950/5 dark:border-white/5 space-y-1">
        {SECONDARY_NAV.map((item) => (
          <NavLink key={item.path} to={item.path} className={linkClass} onClick={onCloseMobile}>
            <item.icon className="w-[18px] h-[18px] shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-ink-950/5 dark:border-white/5 p-4 h-screen sticky top-0">
        {content}
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          'lg:hidden fixed inset-0 z-40 transition-opacity',
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={onCloseMobile} />
        <aside
          className={cn(
            'absolute left-0 top-0 h-full w-72 bg-paper-50 dark:bg-ink-950 p-4 flex flex-col transition-transform duration-200',
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {content}
        </aside>
      </div>
    </>
  )
}
