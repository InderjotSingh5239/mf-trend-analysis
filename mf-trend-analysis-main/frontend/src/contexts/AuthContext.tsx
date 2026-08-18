import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { tokenStorage } from '@/api/client'
import { AuthContext } from '@/contexts/auth-context'
import * as authService from '@/services/authService'
import type { AuthUser, LoginPayload, RegisterPayload } from '@/types/auth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      if (!tokenStorage.getAccessToken()) {
        setIsLoading(false)
        return
      }
      const current = await authService.fetchCurrentUser()
      if (!cancelled) {
        setUser(current)
        setIsLoading(false)
      }
    }

    bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function handleSessionExpired() {
      setUser(null)
    }
    window.addEventListener('auth:session-expired', handleSessionExpired)
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired)
  }, [])

  const login = useCallback(async (payload: LoginPayload) => {
    const session = await authService.login(payload)
    setUser(session.user)
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    const session = await authService.register(payload)
    setUser(session.user)
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}
