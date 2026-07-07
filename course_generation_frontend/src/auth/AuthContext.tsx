import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { MsalProvider, useMsal } from '@azure/msal-react'
import { InteractionRequiredAuthError, InteractionStatus } from '@azure/msal-browser'
import type { AccountInfo } from '@azure/msal-browser'
import {
  getLoginRequest,
  getTokenRefreshMs,
  getTokenRequest,
  msalAuthEnabled,
} from '@/auth/msalConfig'
import { msalInstance } from '@/auth/msalInstance'
import { useMsalBootstrap } from '@/auth/useMsalBootstrap'

export interface AuthUser {
  id: string
  username: string
  displayName: string | null
}

interface AuthContextValue {
  isLoading: boolean
  msalAuthEnabled: boolean
  isAuthenticated: boolean
  user: AuthUser | null
  login: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function accountToUser(account: AccountInfo): AuthUser {
  return {
    id: account.homeAccountId,
    username: account.username,
    displayName: account.name ?? null,
  }
}

function BypassAuthProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading: false,
      msalAuthEnabled: false,
      isAuthenticated: true,
      user: null,
      login: async () => {
        throw new Error('Microsoft sign-in is not configured')
      },
      logout: async () => {},
    }),
    [],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function MsalAuthProvider({ children }: { children: ReactNode }) {
  const { instance, accounts, inProgress } = useMsal()
  const initialized = useMsalBootstrap(instance, accounts)

  const [account, setAccount] = useState<AccountInfo | null>(
    () => instance.getActiveAccount() ?? accounts[0] ?? null,
  )

  // Keep local session state in sync with MSAL's account cache.
  useEffect(() => {
    setAccount(instance.getActiveAccount() ?? accounts[0] ?? null)
  }, [instance, accounts])

  // Redirect (not popup) so login can start automatically on load — browsers
  // block popups that aren't opened from a direct user gesture.
  const login = useCallback(async () => {
    await instance.loginRedirect(getLoginRequest())
  }, [instance])

  const logout = useCallback(async () => {
    const current = instance.getActiveAccount() ?? accounts[0]
    await instance.logoutPopup({
      account: current ?? undefined,
      postLogoutRedirectUri: window.location.origin,
    })
    setAccount(null)
  }, [instance, accounts])

  // Session refresh loop — silently renew the token on the configured TTL.
  // If silent renewal requires interaction (refresh token expired), drop the
  // session so RequireAuth re-triggers login.
  useEffect(() => {
    if (!account) return

    let cancelled = false

    const refresh = async () => {
      try {
        await instance.acquireTokenSilent({ ...getTokenRequest(), account })
      } catch (err) {
        if (!cancelled && err instanceof InteractionRequiredAuthError) {
          setAccount(null)
        }
      }
    }

    const id = window.setInterval(() => void refresh(), getTokenRefreshMs())
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [account, instance])

  const isLoading = !initialized || inProgress !== InteractionStatus.None

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      msalAuthEnabled: true,
      isAuthenticated: account !== null,
      user: account ? accountToUser(account) : null,
      login,
      logout,
    }),
    [isLoading, account, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function AuthProvider({ children }: { children: ReactNode }) {
  if (!msalAuthEnabled() || !msalInstance) {
    return <BypassAuthProvider>{children}</BypassAuthProvider>
  }

  return (
    <MsalProvider instance={msalInstance}>
      <MsalAuthProvider>{children}</MsalAuthProvider>
    </MsalProvider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
