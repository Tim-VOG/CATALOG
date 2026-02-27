import { useMemo } from 'react'
import { useAuth } from '@/lib/auth'
import { useModuleAccess } from './use-module-access'

/**
 * Convenience hook: returns whether the current user has access to a module.
 *
 * Rules:
 * - 'catalog' is always accessible to everyone (no admin grant needed)
 * - Admins always have access to all modules
 * - Other users need an explicit `granted = true` row in module_access
 *
 * @param {string} moduleKey - One of 'catalog', 'onboarding', 'it_form', 'functional_mailbox'
 * @returns {{ hasAccess: boolean, isLoading: boolean }}
 */
export const useHasModuleAccess = (moduleKey) => {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const { data: accessRows = [], isLoading: accessLoading } = useModuleAccess(user?.id)

  const hasAccess = useMemo(() => {
    // Catalog is always accessible
    if (moduleKey === 'catalog') return true
    // Admins always have access
    if (isAdmin) return true
    // Check for explicit grant
    return accessRows.some(
      (row) => row.module_key === moduleKey && row.granted === true
    )
  }, [moduleKey, isAdmin, accessRows])

  return {
    hasAccess,
    isLoading: authLoading || accessLoading,
  }
}
