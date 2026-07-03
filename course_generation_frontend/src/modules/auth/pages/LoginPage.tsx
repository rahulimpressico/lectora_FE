import { FormEvent, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Loader2, Lock } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { ApiClientError } from '@/api/errors'
import { cn } from '@/lib/cn'

const inputClassName =
  'w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all'

export function LoginPage() {
  const { isLoading, tempUserAuthEnabled, isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const redirectTo =
    (location.state as { from?: string } | null)?.from?.trim() || '/dashboard'

  if (!isLoading && isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await login(username.trim(), password)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError('Invalid username or password. Please try again.')
      } else {
        setError('Unable to sign in right now. Please try again.')
      }
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
                <Lock className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">Sign in</h1>
                <p className="mt-1 text-sm text-slate-500">Temporary user access</p>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-brand-500" aria-hidden="true" />
                Checking session…
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <label htmlFor="username" className="block text-sm font-medium text-slate-700">
                    Username
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={inputClassName}
                    placeholder="Enter username"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClassName}
                    placeholder="Enter access password"
                    required
                    disabled={isSubmitting}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? 'login-error' : undefined}
                  />
                </div>

                {error && (
                  <p
                    id="login-error"
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !username.trim() || !password.trim()}
                  className={cn(
                    'w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all',
                    'bg-indigo-600 shadow-sm shadow-indigo-200/60',
                    'hover:bg-indigo-700 active:scale-[0.98]',
                    'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
                  )}
                >
                  {isSubmitting ? 'Signing In…' : 'Sign In'}
                </button>
              </form>
            )}

            {!isLoading && !tempUserAuthEnabled && (
              <p className="mt-4 text-xs text-slate-500">
                Temporary user login is not enabled on this server.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
