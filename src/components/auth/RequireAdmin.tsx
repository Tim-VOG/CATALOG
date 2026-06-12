import { useState, useEffect, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { PinGate } from './PinGate'

/**
 * Loading + missing-profile boilerplate shared by RequireAdmin and
 * RequireStaff. Returns either a fallback node to render, or null
 * when the profile is ready and the caller can proceed.
 */
function useProfileGate() {
  const { user, profile, loading, refreshProfile } = useAuth()
  const [retryCount, setRetryCount] = useState(0)
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    if (!loading && user && !profile && retryCount < 3 && !retrying) {
      const delay = 1000 * (retryCount + 1)
      const timer = setTimeout(async () => {
        setRetrying(true)
        try { await refreshProfile() } catch { /* ignore */ }
        setRetrying(false)
        setRetryCount((c) => c + 1)
      }, delay)
      return () => clearTimeout(timer)
    }
  }, [loading, user, profile, retryCount, retrying, refreshProfile])

  if (loading || retrying || (user && !profile && retryCount < 3)) {
    return {
      fallback: (
        <div className="flex items-center justify-center min-h-screen gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm text-muted-foreground">
            {retryCount > 0 ? `Loading profile... (attempt ${retryCount + 1}/3)` : 'Loading...'}
          </span>
        </div>
      ),
    }
  }

  if (user && !profile) {
    return {
      fallback: (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <p className="text-sm text-muted-foreground">Unable to load your profile.</p>
          <Button variant="outline" className="gap-2" onClick={() => { setRetryCount(0); setRetrying(false) }}>
            <RefreshCw className="h-4 w-4" /> Retry
          </Button>
        </div>
      ),
    }
  }

  return { fallback: null }
}

/**
 * Admin-only area gate (full inventory + sensitive pages). Requires
 * role='admin' + the shared access PIN.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth()
  const { fallback } = useProfileGate()
  if (fallback) return fallback
  if (!isAdmin) return <Navigate to="/" replace />
  return <PinGate>{children}</PinGate>
}

/**
 * Staff area gate — admin OR manager (HR). Both go through the same
 * PIN. Page-level admin/manager separation happens via <AdminOnly>
 * + the sidebar filter, not here.
 */
export function RequireStaff({ children }: { children: ReactNode }) {
  const { isStaff } = useAuth()
  const { fallback } = useProfileGate()
  if (fallback) return fallback
  if (!isStaff) return <Navigate to="/" replace />
  return <PinGate>{children}</PinGate>
}

/**
 * Wrap an individual admin page that a manager must NOT reach. Assumes
 * the parent already gated the staff area, so we only need to bounce
 * managers back to the dashboard. No extra PIN prompt.
 */
export function AdminOnly({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth()
  if (!isAdmin) return <Navigate to="/admin" replace />
  return <>{children}</>
}
