import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoading, msalAuthEnabled, isAuthenticated } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-surface-secondary text-sm text-slate-500">
        Checking session…
      </div>
    )
  }

  if (msalAuthEnabled && !isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}
