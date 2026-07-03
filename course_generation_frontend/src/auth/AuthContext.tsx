import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { fetchAuthMe, login as apiLogin, logout as apiLogout } from '@/api/auth/api'
import { setUnauthorizedHandler } from '@/api/client'

interface AuthContextValue {
  isLoading: boolean
  tempLoginEnabled: boolean
  isAuthenticated: boolean
  login: (password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const [tempLoginEnabled, setTempLoginEnabled] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const me = await fetchAuthMe()
      setTempLoginEnabled(me.temp_login)
      setIsAuthenticated(me.authenticated)
    } catch {
      setTempLoginEnabled(true)
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setIsAuthenticated(false)
      setTempLoginEnabled(true)
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  const login = useCallback(async (password: string) => {
    await apiLogin(password)
    await refresh()
  }, [refresh])

  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } finally {
      setIsAuthenticated(false)
      setTempLoginEnabled(true)
    }
  }, [])

  const value = useMemo(
    () => ({
      isLoading,
      tempLoginEnabled,
      isAuthenticated,
      login,
      logout,
      refresh,
    }),
    [isLoading, tempLoginEnabled, isAuthenticated, login, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
