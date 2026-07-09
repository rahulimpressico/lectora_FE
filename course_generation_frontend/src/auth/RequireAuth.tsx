import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'

// One automatic redirect attempt per browser session — prevents an infinite
// login redirect loop if the user returns still unauthenticated. Cleared once
// authenticated, when a redirect attempt fails, or when the user hits retry.
const REDIRECT_FLAG = 'msal_auto_redirect'

function SessionScreen({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center gap-2 bg-surface-secondary text-sm text-slate-500">
      <Loader2 className="h-4 w-4 animate-spin text-brand-500" aria-hidden="true" />
      {label}
    </div>
  )
}

function SignInRetryScreen({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-surface-secondary px-6 text-center">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold text-slate-800">
          Sign-in didn’t complete
        </h1>
        <p className="max-w-md text-sm text-slate-500">{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
      >
        Try sign in again
      </button>
    </div>
  )
}

function AutoLogin() {
  const { login } = useAuth()
  const [error, setError] = useState<string | null>(null)
  // If a redirect was already attempted this session and we're still here
  // unauthenticated, don't auto-redirect again (loop guard) — offer retry.
  const [needsManualRetry, setNeedsManualRetry] = useState(
    () => sessionStorage.getItem(REDIRECT_FLAG) !== null,
  )

  // Full-page redirect (not popup, so the browser doesn't block it). On success
  // the browser navigates away and this promise never resolves. On failure we
  // clear the one-shot flag, log the error, and surface a retry action instead
  // of leaving the user stuck on the redirect screen. `setError` only runs in
  // the async catch, never synchronously during the effect below.
  const attemptLogin = useCallback(async () => {
    sessionStorage.setItem(REDIRECT_FLAG, '1')
    try {
      await login()
    } catch (err) {
      sessionStorage.removeItem(REDIRECT_FLAG)
      console.error('[auth] login redirect failed:', err)
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong while starting Microsoft sign-in.',
      )
    }
  }, [login])

  useEffect(() => {
    // Auto-trigger only the first attempt of the session. If the flag is already
    // set we render the retry screen instead of redirecting again.
    if (sessionStorage.getItem(REDIRECT_FLAG)) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void attemptLogin()
  }, [attemptLogin])

  const retry = useCallback(() => {
    setError(null)
    setNeedsManualRetry(false)
    sessionStorage.removeItem(REDIRECT_FLAG)
    void attemptLogin()
  }, [attemptLogin])

  if (error || needsManualRetry) {
    return (
      <SignInRetryScreen
        message={
          error ?? 'We couldn’t complete sign-in. Please try again.'
        }
        onRetry={retry}
      />
    )
  }

  return <SessionScreen label="Redirecting to sign in…" />
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated) {
      sessionStorage.removeItem(REDIRECT_FLAG)
    }
  }, [isAuthenticated])

  if (isLoading) {
    return <SessionScreen label="Checking session…" />
  }

  // Protected routes never render without a real authenticated MSAL account.
  if (!isAuthenticated) {
    return <AutoLogin />
  }

  return <>{children}</>
}
