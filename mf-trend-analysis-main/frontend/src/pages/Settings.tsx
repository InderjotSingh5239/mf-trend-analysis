import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings as SettingsIcon, Moon, Bell, Shield, Trash2, LogOut } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTheme } from '@/hooks/useTheme'
import { useWatchlist } from '@/hooks/useWatchlist'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/hooks/useAuth'

export default function Settings() {
  const { theme, toggleTheme } = useTheme()
  const { watchlist, toggleWatch } = useWatchlist()
  const { showToast } = useToast()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState(true)

  const clearWatchlist = () => {
    watchlist.forEach((id) => toggleWatch(id))
    showToast('Watchlist cleared', 'info')
  }

  const handleSignOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display font-bold text-2xl text-ink-950 dark:text-white flex items-center gap-2">
          <SettingsIcon className="w-6 h-6" /> Settings
        </h1>
        <p className="text-sm text-ink-500 dark:text-paper-200/50">Manage your profile and preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Editing your name and email isn't available yet — check back soon.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium text-ink-500 dark:text-paper-200/50 mb-1.5 block">Full Name</label>
            <Input value={user?.fullName ?? ''} disabled readOnly />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-500 dark:text-paper-200/50 mb-1.5 block">Email</label>
            <Input type="email" value={user?.email ?? ''} disabled readOnly />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-ink-950/5 dark:divide-white/5">
          <div className="flex items-center justify-between py-3 first:pt-0">
            <div className="flex items-center gap-3">
              <Moon className="w-4 h-4 text-ink-500" />
              <div>
                <p className="text-sm font-medium text-ink-950 dark:text-paper-100">Dark Mode</p>
                <p className="text-xs text-ink-500 dark:text-paper-200/50">Toggle the interface theme</p>
              </div>
            </div>
            <ToggleSwitch checked={theme === 'dark'} onChange={toggleTheme} />
          </div>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-ink-500" />
              <div>
                <p className="text-sm font-medium text-ink-950 dark:text-paper-100">Notifications</p>
                <p className="text-xs text-ink-500 dark:text-paper-200/50">Price alerts and prediction updates</p>
              </div>
            </div>
            <ToggleSwitch checked={notifications} onChange={() => setNotifications((n) => !n)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-4 h-4" /> Data
          </CardTitle>
          <CardDescription>Your watchlist is stored locally in this browser.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" size="sm" onClick={clearWatchlist} disabled={watchlist.length === 0}>
            <Trash2 className="w-3.5 h-3.5" /> Clear Watchlist ({watchlist.length})
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" size="sm" onClick={handleSignOut}>
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-ink-950/15 dark:bg-white/15'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  )
}
