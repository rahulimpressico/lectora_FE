import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Loader2, LogIn } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { cn } from '@/lib/cn'

export function LoginPage() {
  const { isLoading, msalAuthEnabled, isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const redirectTo =
    (location.state as { from?: string } | null)?.from?.trim() || '/dashboard'

  if (!isLoading && isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  const handleMicrosoftSignIn = async () => {
    setError(null)
    setIsSubmitting(true)

    try {
      await login()
      navigate(redirectTo, { replace: true })
    } catch (err) {
      const errorCode =
        typeof err === 'object' &&
        err !== null &&
        'errorCode' in err &&
        typeof (err as { errorCode?: string }).errorCode === 'string'
          ? (err as { errorCode: string }).errorCode
          : ''

      if (errorCode === 'user_cancelled' || errorCode === 'popup_window_error') {
        return
      }

      setError('Microsoft sign-in failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-surface-secondary antialiased">
      <header className="shrink-0 border-b border-slate-200/60 bg-white/80 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2.5">
          <img src="/favicon.svg" alt="" aria-hidden="true" className="h-8 w-8 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-bold leading-none tracking-tight text-slate-900">
              Course<span className="text-indigo-600"> Studio</span>
            </p>
            <p className="mt-0.5 text-[10px] font-medium tracking-wide text-slate-400">
              Course Generation Platform
            </p>
          </div>
        </div>
      </header>

      <main className="flex flex-1 w-full items-center justify-center px-4 py-10 sm:py-12">
        <div className="w-full max-w-[400px]">
          <div
            className={cn(
              'rounded-xl border border-border bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)] sm:p-8',
              isLoading && 'opacity-80',
            )}
          >
            <div className="mb-6 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <LogIn className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">Sign in</h1>
                <p className="mt-1 text-sm text-slate-500">Use your Microsoft work account</p>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-brand-500" aria-hidden="true" />
                Checking session…
              </div>
            ) : !msalAuthEnabled ? (
              <div className="space-y-4 text-sm text-slate-500">
                <p>
                  Microsoft sign-in is not configured. Set{' '}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">VITE_AZURE_TENANT_ID</code>{' '}
                  and{' '}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">VITE_AZURE_CLIENT_ID</code>{' '}
                  in your environment.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {error && (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => void handleMicrosoftSignIn()}
                  disabled={isSubmitting}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Signing in…
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 21 21" className="h-4 w-4" aria-hidden="true">
                        <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                        <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                        <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                        <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                      </svg>
                      Sign in with Microsoft
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
