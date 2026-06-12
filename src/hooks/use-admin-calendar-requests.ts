import { useMemo } from 'react'
import { useLoanRequests } from '@/hooks/use-loan-requests'
import { useItRequests } from '@/hooks/use-it-requests'
import { useMailboxRequests } from '@/hooks/use-mailbox-requests'
import { safeParse } from '@/hooks/use-calendar-requests'

// ── Normalize ALL requests (admin-level, all users) into calendar events ──
function normalizeAdminEvents(loanRequests, itRequests, mailboxRequests) {
  const events = []

  // Catalog / Loan requests
  for (const req of loanRequests) {
    const start = safeParse(req.pickup_date) || safeParse(req.created_at)
    if (!start) continue
    const end = safeParse(req.return_date)
    const userName = `${req.user_first_name || ''} ${req.user_last_name || ''}`.trim()
    events.push({
      id: `catalog-${req.id}`,
      type: 'catalog',
      title: req.project_name || 'Equipment Request',
      status: req.status || 'pending',
      startDate: start,
      endDate: end,
      isMultiDay: !!(end && end.getTime() !== start.getTime()),
      original: req,
      linkTo: `/requests/${req.id}`,
      adminLinkTo: `/admin/requests/${req.id}`,
      subtitle: req.location_name || `${req.item_count || 0} item${(req.item_count || 0) !== 1 ? 's' : ''}`,
      // Admin user info
      userId: req.user_id,
      userName: userName || req.user_email || 'Unknown',
      userEmail: req.user_email || '',
      userAvatar: req.user_avatar_url || null,
    })
  }

  // IT requests
  for (const req of itRequests) {
    const start = safeParse(req.start_date) || safeParse(req.created_at)
    if (!start) continue
    events.push({
      id: `it-${req.id}`,
      type: 'it',
      title: `${req.first_name || ''} ${req.last_name || ''}`.trim() || 'IT Request',
      status: req.status || 'pending',
      startDate: start,
      endDate: null,
      isMultiDay: false,
      original: req,
      linkTo: null,
      adminLinkTo: '/admin/it-requests',
      subtitle: req.business_unit || req.generated_email || '',
      // Admin user info
      userId: req.requested_by,
      userName: req.requested_by_name || 'Unknown',
      userEmail: '',
      userAvatar: null,
    })
  }

  // Mailbox requests
  for (const req of mailboxRequests) {
    const start = safeParse(req.creation_date) || safeParse(req.created_at)
    if (!start) continue
    events.push({
      id: `mailbox-${req.id}`,
      type: 'mailbox',
      title: req.project_name || 'Mailbox Request',
      status: req.status || 'pending',
      startDate: start,
      endDate: null,
      isMultiDay: false,
      original: req,
      linkTo: null,
      adminLinkTo: '/admin/mailbox-requests',
      subtitle: req.email_to_create || req.agency || '',
      // Admin user info
      userId: req.requested_by,
      userName: req.requested_by_name || 'Unknown',
      userEmail: '',
      userAvatar: null,
    })
  }

  return events
}

// ── Extract unique users from events ──
function extractUsers(events) {
  const map = new Map()
  for (const ev of events) {
    if (ev.userId && !map.has(ev.userId)) {
      map.set(ev.userId, {
        id: ev.userId,
        name: ev.userName,
        email: ev.userEmail,
        avatar: ev.userAvatar,
      })
    }
  }
  // Sort by name
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
}

// ── Main admin hook ──
export function useAdminCalendarRequests() {
  const loanQuery = useLoanRequests()
  const itQuery = useItRequests()
  const mailboxQuery = useMailboxRequests()

  const loanRequests = loanQuery.data || []
  const itRequests = itQuery.data || []
  const mailboxRequests = mailboxQuery.data || []

  const isLoading = loanQuery.isLoading || itQuery.isLoading || mailboxQuery.isLoading

  const events = useMemo(
    () => normalizeAdminEvents(loanRequests, itRequests, mailboxRequests),
    [loanRequests, itRequests, mailboxRequests]
  )

  const counts = useMemo(() => ({
    catalog: loanRequests.length,
    it: itRequests.length,
    mailbox: mailboxRequests.length,
  }), [loanRequests, itRequests, mailboxRequests])

  const users = useMemo(() => extractUsers(events), [events])

  return {
    events,
    isLoading,
    counts,
    users,
  }
}
