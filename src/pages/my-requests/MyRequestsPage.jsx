import { Link } from 'react-router-dom'
import { usePageTitle } from '@/hooks/use-page-title'
import { motion } from 'motion/react'
import { Inbox, ArrowRight, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { RequestsCalendar } from '@/components/calendar/RequestsCalendar'
import { useCalendarRequests } from '@/hooks/use-calendar-requests'

// ── Calendar loading skeleton ──
function CalendarSkeleton() {
  return (
    <div className="max-w-5xl mx-auto py-10 px-4 space-y-6">
      <div>
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-4 w-36 mt-2" />
        <Skeleton className="h-0.5 w-16 mt-3" />
      </div>
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-9 w-9 rounded-xl" />
      </div>
      {/* Filters */}
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-full" />
        ))}
      </div>
      {/* Grid */}
      <div className="rounded-2xl border border-border/50 p-3">
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={`h-${i}`} className="h-5 w-full rounded" />
          ))}
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-14 sm:h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──
export function MyRequestsPage() {
  usePageTitle('My Requests')
  const { events, isLoading, counts, hasCatalog, hasItForm, hasMailbox } = useCalendarRequests()

  const totalCount = events.length

  if (isLoading) return <CalendarSkeleton />

  if (totalCount === 0) {
    return (
      <div className="max-w-5xl mx-auto py-10 px-4">
        <EmptyState
          icon={Inbox}
          title="No requests yet"
          description="You haven't submitted any requests. Browse the available hubs to get started."
        >
          <Link to="/">
            <Button className="gap-2">
              <ArrowRight className="h-4 w-4" />
              Go to Hub
            </Button>
          </Link>
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-gradient-primary">
              My Requests
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {totalCount} request{totalCount !== 1 ? 's' : ''} across all hubs
            </p>
          </div>
          <Badge variant="outline" className="ml-auto text-xs gap-1.5 hidden sm:flex">
            <CalendarDays className="h-3 w-3" />
            Calendar view
          </Badge>
        </div>
        <motion.div
          className="mt-4 h-0.5 w-16 rounded-full bg-primary/60"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ originX: 0 }}
        />
      </motion.div>

      {/* Calendar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <RequestsCalendar
          events={events}
          counts={counts}
          hasCatalog={hasCatalog}
          hasItForm={hasItForm}
          hasMailbox={hasMailbox}
        />
      </motion.div>
    </div>
  )
}
