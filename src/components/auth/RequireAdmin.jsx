import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

export function RequireAdmin({ children }) {
  const { user, profile, isAdmin, loading, refreshProfile } = useAuth()
  const [retryCount, setRetryCount] = useState(0)
  const [retrying, setRetrying] = useState(false)

  // Auto-retry loading profile if user exists but profile is null after initial load
  useEffect(() => {
    if (!loading && user && !profile && retryCount < 3 && !retrying) {
      const delay = 1000 * (retryCount + 1) // 1s, 2s, 3s
      const timer = setTimeout(async () => {
        setRetrying(true)
        try {
          await refreshProfile()
        } catch {
          // ignore — profile will still be null
        }
        setRetrying(false)
        setRetryCount((c) => c + 1)
      }, delay)
      return () => clearTimeout(timer)
    }
  }, [loading, user, profile, retryCount, retrying, refreshProfile])

  // Still loading auth or retrying profile
  if (loading || retrying || (user && !profile && retryCount < 3)) {
    return (
      <div className="flex items-center justify-center min-h-screen gap-3">
        <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-sm text-muted-foreground">
          {retryCount > 0 ? `Loading profile... (attempt ${retryCount + 1}/3)` : 'Loading...'}
        </span>
      </div>
    )
  }

  // User exists but profile completely failed after all retries — show error with manual retry
  if (user && !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-sm text-muted-foreground">
          Unable to load your profile. This may be a temporary issue.
        </p>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => {
            setRetryCount(0)
            setRetrying(false)
          }}
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}
