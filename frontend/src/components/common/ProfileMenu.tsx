import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Settings, LogOut, LogIn, UserCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0].slice(0, 2)
  return initials.toUpperCase()
}

export function ProfileMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  if (!user) {
    return (
      <Link to="/login">
        <button className="flex items-center gap-1.5 px-3.5 h-9 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors">
          <LogIn className="w-3.5 h-3.5" /> Sign In
        </button>
      </Link>
    )
  }

  const handleSignOut = () => {
    setOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full hover:bg-ink-950/5 dark:hover:bg-white/10 transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white text-xs font-semibold font-display">
          {getInitials(user.fullName)}
        </div>
        <span className="hidden sm:block text-sm font-medium text-ink-950 dark:text-paper-100">
          {user.fullName}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-52 rounded-xl glass-panel border border-ink-950/10 dark:border-white/10 p-1.5 shadow-lg z-50"
        >
          <div className="px-2.5 py-2 mb-1 border-b border-ink-950/5 dark:border-white/5">
            <p className="text-sm font-medium text-ink-950 dark:text-white">{user.fullName}</p>
            <p className="text-xs text-ink-500 dark:text-paper-200/50">{user.email}</p>
          </div>
          <Link
            to="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-ink-950 dark:text-paper-100 hover:bg-ink-950/5 dark:hover:bg-white/10"
          >
            <UserCircle className="w-4 h-4" /> My Profile
          </Link>
          <Link
            to="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-ink-950 dark:text-paper-100 hover:bg-ink-950/5 dark:hover:bg-white/10"
          >
            <Settings className="w-4 h-4" /> Settings
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-crimson-500 hover:bg-crimson-500/10"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      )}
    </div>
  )
}
