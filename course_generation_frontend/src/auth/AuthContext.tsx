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
  getIdentityTokenRequest,
  getMissingAuthConfig,
  getTokenRefreshMs,
  isAuthConfigValid,
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

/**
 * Blocking, fail-closed screen shown when required MSAL configuration is
 * missing. There is NO authentication bypass — the app is not rendered and no
 * context value with `isAuthenticated: true` is ever produced in this state.
 */
function AuthConfigError({ missing }: { missing: string[] }) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-3 bg-surface-secondary px-6 text-center">
      <h1 className="text-lg font-semibold text-slate-800">
        Authentication configuration is missing
      </h1>
      <p className="max-w-md text-sm text-slate-500">
        Microsoft sign-in cannot start because required configuration is not
        set. The application is blocked until this is fixed.
      </p>
      {missing.length > 0 && (
        <ul className="mt-1 space-y-0.5 text-sm text-slate-600">
          {missing.map((name) => (
            <li key={name}>
              <code>{name}</code>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
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

  // Session refresh loop — keep the MSAL identity session alive using login
  // scopes only. Backend API tokens are acquired per-request in getAccessToken().
  // Do NOT request VITE_AZURE_API_SCOPE here; API token failure must not log
  // the user out.
  useEffect(() => {
    if (!account) return

    let cancelled = false

    const refresh = async () => {
      const { scopes } = getIdentityTokenRequest()
      if (scopes.length === 0) return

      try {
        await instance.acquireTokenSilent({
          ...getIdentityTokenRequest(),
          account,
        })
      } catch (err) {
        // Only clear account when the MSAL session itself is invalid/expired.
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
  // Fail closed: without valid MSAL config (or an initialized instance) the app
  // is blocked entirely. No bypass, no fake user, no protected routes.
  if (!isAuthConfigValid() || !msalInstance) {
    return <AuthConfigError missing={getMissingAuthConfig()} />
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
