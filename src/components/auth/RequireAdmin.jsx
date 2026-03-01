import { Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'

export function RequireAdmin({ children }) {
  const { user, profile, isAdmin, loading } = useAuth()

  // Still loading auth/profile — show a proper loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen gap-3">
        <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    )
  }

  // User is authenticated but profile hasn't loaded yet
  // (race condition: onAuthStateChange fires before profile fetch completes)
  if (user && !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen gap-3">
        <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-sm text-muted-foreground">Loading profile...</span>
      </div>
    )
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}
