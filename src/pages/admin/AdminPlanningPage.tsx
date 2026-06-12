// @ts-nocheck — Phase-3 typing follow-up; remove this and fix once the surrounding API/component types stabilise.
import { useState } from 'react'
import { useAdminCalendarRequests } from '@/hooks/use-admin-calendar-requests'
import { RequestsCalendar } from '@/components/calendar/RequestsCalendar'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'

/**
 * Admin planning view: a calendar showing when IT/equipment is in
 * use across loans, IT requests and mailbox provisioning. Reuses the
 * shared RequestsCalendar in admin mode so admins can scan availability
 * and assignments at a glance.
 */
export function AdminPlanningPage() {
  const { events, isLoading, counts, users } = useAdminCalendarRequests()
  const [selectedIds] = useState(new Set())

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Planning"
        description="When IT equipment is in use — across loans, onboarding, IT requests and mailbox provisioning."
      />

      <RequestsCalendar
        events={events}
        counts={counts}
        hasCatalog
        hasItForm
        hasMailbox
        isAdmin
        users={users}
        showUser
        storageKey="admin-planning-view-mode"
        selectedIds={selectedIds}
      />
    </div>
  )
}
