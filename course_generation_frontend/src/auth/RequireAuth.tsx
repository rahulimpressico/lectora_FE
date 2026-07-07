import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'

// Guards against an infinite redirect loop: if we already sent the user to
// Microsoft once and they came back unauthenticated (e.g. cancelled), show a
// manual button instead of redirecting again. Cleared once authenticated.
const REDIRECT_FLAG = 'msal_auto_redirect'

function LoginPrompt() {
  const { login } = useAuth()
  const [showButton, setShowButton] = useState(false)
  const running = useRef(false)

  const trigger = async () => {
    if (running.current) return
    running.current = true
    setShowButton(false)
    try {
      await login()
    } catch {
      setShowButton(true)
      running.current = false
    }
  }

  useEffect(() => {
    if (sessionStorage.getItem(REDIRECT_FLAG)) {
      setShowButton(true)
      return
    }
    sessionStorage.setItem(REDIRECT_FLAG, '1')
    void trigger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-surface-secondary text-sm text-slate-500">
      {!showButton ? (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-brand-500" aria-hidden="true" />
          Redirecting to sign in…
        </div>
      ) : (
        <>
          <p>Sign in to continue.</p>
          <button
            type="button"
            onClick={() => void trigger()}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700"
          >
            <svg viewBox="0 0 21 21" className="h-4 w-4" aria-hidden="true">
              <rect x="1" y="1" width="9" height="9" fill="#f25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
              <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
            </svg>
            Sign in with Microsoft
          </button>
        </>
      )}
    </div>
  )
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoading, msalAuthEnabled, isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated) {
      sessionStorage.removeItem(REDIRECT_FLAG)
    }
  }, [isAuthenticated])

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-surface-secondary text-sm text-slate-500">
        Checking session…
      </div>
    )
  }

  if (msalAuthEnabled && !isAuthenticated) {
    return <LoginPrompt />
  }

  return <>{children}</>
}
