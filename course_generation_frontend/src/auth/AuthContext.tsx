import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { fetchAuthSession, login as apiLogin, logout as apiLogout, type TempUserInfo } from '@/api/auth/api'
import { setUnauthorizedHandler } from '@/api/client'

interface AuthContextValue {
  isLoading: boolean
  tempUserAuthEnabled: boolean
  isAuthenticated: boolean
  user: TempUserInfo | null
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const [tempUserAuthEnabled, setTempUserAuthEnabled] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<TempUserInfo | null>(null)

  const refresh = useCallback(async () => {
    try {
      const session = await fetchAuthSession()
      setTempUserAuthEnabled(session.temp_user_auth)
      setIsAuthenticated(session.authenticated)
      setUser(session.user)
    } catch {
      setTempUserAuthEnabled(true)
      setIsAuthenticated(false)
      setUser(null)
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
      setUser(null)
      setTempUserAuthEnabled(true)
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    await apiLogin(username, password)
    await refresh()
  }, [refresh])

  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } finally {
      setIsAuthenticated(false)
      setUser(null)
      setTempUserAuthEnabled(true)
    }
  }, [])

  const value = useMemo(
    () => ({
      isLoading,
      tempUserAuthEnabled,
      isAuthenticated,
      user,
      login,
      logout,
      refresh,
    }),
    [isLoading, tempUserAuthEnabled, isAuthenticated, user, login, logout, refresh],
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
