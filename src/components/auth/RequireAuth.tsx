import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { PageLoading } from '@/components/common/LoadingSpinner'

export function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <PageLoading />
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
