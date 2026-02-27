import { Navigate } from 'react-router-dom'
import { useHasModuleAccess } from '@/hooks/use-has-module-access'

export function RequireModuleAccess({ moduleKey, children }) {
  const { hasAccess, isLoading } = useHasModuleAccess(moduleKey)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-muted-foreground text-sm">Checking access...</div>
      </div>
    )
  }

  if (!hasAccess) {
    return <Navigate to="/" replace />
  }

  return children
}
