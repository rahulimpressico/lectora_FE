import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import { MsalProvider, useMsal } from '@azure/msal-react'
import { InteractionStatus } from '@azure/msal-browser'
import type { AccountInfo } from '@azure/msal-browser'
import { getLoginRequest, msalAuthEnabled } from '@/auth/msalConfig'
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

  const activeAccount = instance.getActiveAccount() ?? accounts[0] ?? null

  const login = useCallback(async () => {
    const result = await instance.loginPopup(getLoginRequest())
    if (result.account) {
      instance.setActiveAccount(result.account)
    }
  }, [instance])

  const logout = useCallback(async () => {
    const account = instance.getActiveAccount() ?? accounts[0]
    await instance.logoutPopup({
      account: account ?? undefined,
      postLogoutRedirectUri: `${window.location.origin}/login`,
    })
  }, [instance, accounts])

  const isLoading =
    !initialized || inProgress !== InteractionStatus.None

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      msalAuthEnabled: true,
      isAuthenticated: activeAccount !== null,
      user: activeAccount ? accountToUser(activeAccount) : null,
      login,
      logout,
    }),
    [isLoading, activeAccount, login, logout],
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
