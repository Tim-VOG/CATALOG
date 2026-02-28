import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { motion } from 'motion/react'
import {
  Package, ChevronRight, MapPin, Calendar, ArrowRight,
  Clock, CheckCircle2, XCircle, Search, Inbox,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/common/UserAvatar'
import { cn } from '@/lib/utils'

const STATUS_MAP = {
  pending: { color: 'bg-amber-500/15 text-amber-600 border-amber-500/30', icon: Clock, label: 'Pending' },
  approved: { color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30', icon: CheckCircle2, label: 'Approved' },
  rejected: { color: 'bg-destructive/15 text-destructive border-destructive/30', icon: XCircle, label: 'Rejected' },
  completed: { color: 'bg-primary/15 text-primary border-primary/30', icon: CheckCircle2, label: 'Completed' },
  cancelled: { color: 'bg-gray-500/15 text-gray-500 border-gray-500/30', icon: XCircle, label: 'Cancelled' },
  picked_up: { color: 'bg-blue-500/15 text-blue-600 border-blue-500/30', icon: Package, label: 'Picked Up' },
  returned: { color: 'bg-cyan-500/15 text-cyan-600 border-cyan-500/30', icon: CheckCircle2, label: 'Returned' },
  closed: { color: 'bg-gray-500/15 text-gray-600 border-gray-500/30', icon: CheckCircle2, label: 'Closed' },
}

const STATUS_PILLS = ['pending', 'approved', 'picked_up', 'returned', 'completed', 'rejected']

function LoanCard({ event }) {
  const statusCfg = STATUS_MAP[event.status] || STATUS_MAP.pending
  const StatusIcon = statusCfg.icon
  const hasDateRange = event.startDate && event.endDate

  return (
    <Link to={event.adminLinkTo || `/admin/requests/${event.original?.id}`}>
      <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-muted/20 transition-all duration-200 group cursor-pointer">
        {/* User avatar */}
        <UserAvatar
          avatarUrl={event.userAvatar}
          firstName={event.userName?.split(' ')[0]}
          lastName={event.userName?.split(' ')[1]}
          email={event.userEmail}
          size="sm"
          className="h-9 w-9 shrink-0"
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm truncate">{event.title}</span>
            <Badge variant="outline" className={cn('text-[10px] gap-1', statusCfg.color)}>
              <StatusIcon className="h-2.5 w-2.5" />
              {statusCfg.label}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
            <span className="font-medium">{event.userName}</span>
            {hasDateRange && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3 shrink-0" />
                {format(event.startDate, 'dd MMM yyyy')}
                <ArrowRight className="h-2.5 w-2.5" />
                {format(event.endDate, 'dd MMM yyyy')}
              </span>
            )}
            {!hasDateRange && event.startDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(event.startDate, 'dd MMM yyyy')}
              </span>
            )}
            {event.subtitle && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 shrink-0" />
                {event.subtitle}
              </span>
            )}
            {event.original?.item_count > 0 && (
              <Badge variant="outline" className="text-[10px]">
                <Package className="h-2.5 w-2.5 mr-1" />
                {event.original.item_count} item{event.original.item_count !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>

        {/* Date range bar */}
        {hasDateRange && (
          <div className="hidden md:flex flex-col items-center gap-0.5 shrink-0 w-24">
            <span className="text-[10px] text-muted-foreground">{format(event.startDate, 'dd/MM')}</span>
            <div className="h-1.5 w-full rounded-full bg-primary/30 overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: '100%' }} />
            </div>
            <span className="text-[10px] text-muted-foreground">{format(event.endDate, 'dd/MM')}</span>
          </div>
        )}

        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
      </div>
    </Link>
  )
}

export function CatalogLoansView({ events, users }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState([])
  const [userFilter, setUserFilter] = useState([])

  // Only catalog events
  const catalogEvents = useMemo(() => {
    return events
      .filter((ev) => ev.type === 'catalog')
      .sort((a, b) => b.startDate - a.startDate) // newest first
  }, [events])

  // Apply filters
  const filtered = useMemo(() => {
    let result = catalogEvents
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((ev) =>
        ev.title.toLowerCase().includes(q) ||
        ev.userName?.toLowerCase().includes(q) ||
        ev.subtitle?.toLowerCase().includes(q)
      )
    }
    if (statusFilter.length > 0) {
      result = result.filter((ev) => statusFilter.includes(ev.status))
    }
    if (userFilter.length > 0) {
      result = result.filter((ev) => userFilter.includes(ev.userId))
    }
    return result
  }, [catalogEvents, search, statusFilter, userFilter])

  const toggleStatus = (status) => {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    )
  }

  return (
    <div className="space-y-4">
      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/20 border border-border/30 flex-1">
          <Search className="h-4 w-4 text-muted-foreground/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by project, user, location..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40"
          />
        </div>
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_PILLS.map((status) => {
          const cfg = STATUS_MAP[status]
          const isActive = statusFilter.includes(status)
          return (
            <button
              key={status}
              onClick={() => toggleStatus(status)}
              className={cn(
                'inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all duration-200 capitalize',
                isActive
                  ? cn(cfg.color, 'shadow-sm')
                  : 'bg-transparent text-muted-foreground/50 border-transparent hover:text-muted-foreground hover:bg-muted/30'
              )}
            >
              {cfg.label}
            </button>
          )
        })}
        {statusFilter.length > 0 && (
          <button
            onClick={() => setStatusFilter([])}
            className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground underline underline-offset-2 transition-colors ml-1"
          >
            Clear
          </button>
        )}
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} catalog loan{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Loan cards */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border/50 bg-card/30 p-8 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No catalog loans found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.2 }}
            >
              <LoanCard event={event} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
