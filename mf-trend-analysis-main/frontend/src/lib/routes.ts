import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Search,
  Sparkles,
  LineChart,
  GitCompareArrows,
  Wallet,
  Calculator,
  Star,
  Newspaper,
  Info,
  Settings,
} from 'lucide-react'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
}

export const PRIMARY_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Explore Funds', path: '/explore', icon: Search },
  { label: 'AI Prediction', path: '/predict', icon: Sparkles },
  { label: 'Analytics', path: '/analytics', icon: LineChart },
  { label: 'Compare Funds', path: '/compare', icon: GitCompareArrows },
  { label: 'Portfolio', path: '/portfolio', icon: Wallet },
  { label: 'Calculators', path: '/calculators/sip', icon: Calculator },
  { label: 'Watchlist', path: '/watchlist', icon: Star },
  { label: 'News & Insights', path: '/news', icon: Newspaper },
]

export const SECONDARY_NAV: NavItem[] = [
  { label: 'About', path: '/about', icon: Info },
  { label: 'Settings', path: '/settings', icon: Settings },
]
