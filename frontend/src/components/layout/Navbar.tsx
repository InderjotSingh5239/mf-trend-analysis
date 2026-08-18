import { Menu, Bell } from 'lucide-react'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { ProfileMenu } from '@/components/common/ProfileMenu'
import { SearchBar } from '@/components/common/SearchBar'

export function Navbar({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  return (
    <header className="sticky top-0 z-30 h-16 flex items-center gap-3 px-4 lg:px-6 border-b border-ink-950/5 dark:border-white/5 bg-paper-50/80 dark:bg-ink-950/80 backdrop-blur-xl">
      <button
        onClick={onOpenMobileMenu}
        className="lg:hidden p-2 -ml-2 text-ink-950 dark:text-white"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex-1 max-w-md">
        <SearchBar />
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1.5">
        <div className="hidden md:flex items-center gap-1.5 mr-2 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono-data pulse-dot">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          MARKET OPEN
        </div>
        <button
          className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-ink-950/5 dark:hover:bg-white/10 text-ink-500 dark:text-paper-200"
          aria-label="Notifications"
        >
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-crimson-500" />
        </button>
        <ThemeToggle />
        <div className="w-px h-6 bg-ink-950/10 dark:bg-white/10 mx-1" />
        <ProfileMenu />
      </div>
    </header>
  )
}
