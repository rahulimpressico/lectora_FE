import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'

// One redirect attempt per browser session — prevents an infinite redirect
// loop if the user returns still unauthenticated. Cleared once authenticated.
const REDIRECT_FLAG = 'msal_auto_redirect'

function SessionScreen({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center gap-2 bg-surface-secondary text-sm text-slate-500">
      <Loader2 className="h-4 w-4 animate-spin text-brand-500" aria-hidden="true" />
      {label}
    </div>
  )
}

function AutoLogin() {
  const { login } = useAuth()

  useEffect(() => {
    if (sessionStorage.getItem(REDIRECT_FLAG)) return
    sessionStorage.setItem(REDIRECT_FLAG, '1')
    // Auto-trigger MSAL login on load (full-page redirect, not popup, so the
    // browser doesn't block it). No fallback UI — the app stays on the session
    // screen until authentication succeeds.
    void login().catch(() => {})
  }, [login])

  return <SessionScreen label="Redirecting to sign in…" />
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoading, msalAuthEnabled, isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated) {
      sessionStorage.removeItem(REDIRECT_FLAG)
    }
  }, [isAuthenticated])

  if (isLoading) {
    return <SessionScreen label="Checking session…" />
  }

  if (msalAuthEnabled && !isAuthenticated) {
    return <AutoLogin />
  }

  return <>{children}</>
}
