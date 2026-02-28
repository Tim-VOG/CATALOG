import { useMemo } from 'react'
import { useAuth } from '@/lib/auth'
import { useHasModuleAccess } from '@/hooks/use-has-module-access'
import { useMyLoanRequests } from '@/hooks/use-loan-requests'
import { useMyItRequests } from '@/hooks/use-it-requests'
import { useMyMailboxRequests } from '@/hooks/use-mailbox-requests'
import {
  parseISO, startOfMonth, endOfMonth, eachDayOfInterval, format, isValid,
} from 'date-fns'

// ── Safely parse a date string ──
function safeParse(dateStr) {
  if (!dateStr) return null
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr)
    return isValid(d) ? d : null
  } catch {
    return null
  }
}

// ── Normalize requests into unified calendar events ──
function normalizeEvents(loanRequests, itRequests, mailboxRequests) {
  const events = []

  // Catalog / Loan requests
  for (const req of loanRequests) {
    const start = safeParse(req.pickup_date) || safeParse(req.created_at)
    if (!start) continue
    const end = safeParse(req.return_date)
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
      subtitle: req.location_name || `${req.item_count || 0} item${(req.item_count || 0) !== 1 ? 's' : ''}`,
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
      subtitle: req.business_unit || req.generated_email || '',
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
      subtitle: req.email_to_create || req.agency || '',
    })
  }

  return events
}

// ── Expand events into a date map for a given month ──
export function expandEventsToDateMap(events, monthDate, filters) {
  const monthStart = startOfMonth(monthDate)
  const monthEnd = endOfMonth(monthDate)
  const dateMap = new Map()

  for (const event of events) {
    // Type filter
    if (!filters.types.includes(event.type)) continue
    // Status filter (empty = show all)
    if (filters.statuses.length > 0 && !filters.statuses.includes(event.status)) continue

    if (event.isMultiDay && event.endDate) {
      // Expand range, clamped to visible month
      const rangeStart = event.startDate < monthStart ? monthStart : event.startDate
      const rangeEnd = event.endDate > monthEnd ? monthEnd : event.endDate
      if (rangeStart <= rangeEnd) {
        const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd })
        for (const day of days) {
          const key = format(day, 'yyyy-MM-dd')
          if (!dateMap.has(key)) dateMap.set(key, [])
          dateMap.get(key).push(event)
        }
      }
    } else {
      // Single-day
      if (event.startDate >= monthStart && event.startDate <= monthEnd) {
        const key = format(event.startDate, 'yyyy-MM-dd')
        if (!dateMap.has(key)) dateMap.set(key, [])
        dateMap.get(key).push(event)
      }
    }
  }

  return dateMap
}

// ── Main hook ──
export function useCalendarRequests() {
  const { user } = useAuth()

  const { hasAccess: hasCatalog } = useHasModuleAccess('catalog')
  const { hasAccess: hasItForm } = useHasModuleAccess('it_form')
  const { hasAccess: hasMailbox } = useHasModuleAccess('functional_mailbox')

  const loanQuery = useMyLoanRequests(user?.id)
  const itQuery = useMyItRequests(user?.id)
  const mailboxQuery = useMyMailboxRequests(user?.id)

  const loanRequests = loanQuery.data || []
  const itRequests = itQuery.data || []
  const mailboxRequests = mailboxQuery.data || []

  const isLoading = loanQuery.isLoading || (hasItForm && itQuery.isLoading) || (hasMailbox && mailboxQuery.isLoading)

  const events = useMemo(
    () => normalizeEvents(loanRequests, itRequests, mailboxRequests),
    [loanRequests, itRequests, mailboxRequests]
  )

  const counts = useMemo(() => ({
    catalog: loanRequests.length,
    it: itRequests.length,
    mailbox: mailboxRequests.length,
  }), [loanRequests, itRequests, mailboxRequests])

  return {
    events,
    isLoading,
    counts,
    hasCatalog,
    hasItForm,
    hasMailbox,
  }
}
