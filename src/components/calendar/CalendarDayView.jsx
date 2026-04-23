import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { motion } from 'motion/react'
import {
  Package, ClipboardList, Mail, Clock, CheckCircle2, XCircle,
  Calendar, ChevronRight, MapPin, Inbox, Square, CheckSquare,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/common/UserAvatar'
import { cn } from '@/lib/utils'

const TYPE_CONFIG = {
  catalog: { icon: Package, color: 'text-primary', bg: 'bg-primary/10', border: 'border-l-primary', label: 'Catalog' },
  it: { icon: ClipboardList, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-l-amber-500', label: 'IT' },
  mailbox: { icon: Mail, color: 'text-violet-500', bg: 'bg-violet-500/10', border: 'border-l-violet-500', label: 'Mailbox' },
}

const STATUS_MAP = {
  pending: { color: 'bg-amber-500/15 text-amber-600 border-amber-500/30', icon: Clock },
  in_progress: { color: 'bg-blue-500/15 text-blue-600 border-blue-500/30', icon: Package },
  ready: { color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30', icon: CheckCircle2 },
}

function DayEventCard({ event, showUser, selectable, isSelected, onToggleSelect }) {
  const typeCfg = TYPE_CONFIG[event.type] || TYPE_CONFIG.catalog
  const statusCfg = STATUS_MAP[event.status] || STATUS_MAP.pending
  const StatusIcon = statusCfg.icon
  const TypeIcon = typeCfg.icon
  const linkTo = event.adminLinkTo || event.linkTo

  const content = (
    <div className={cn(
      'flex items-center gap-3 p-4 rounded-xl border-l-[3px] border border-border/50 transition-all duration-200 bg-card/50',
      typeCfg.border,
      linkTo && !selectable && 'hover:border-primary/30 hover:bg-muted/30 cursor-pointer group',
      selectable && 'cursor-pointer hover:bg-muted/30',
      isSelected && 'bg-primary/10 border-primary/30 ring-1 ring-primary/20',
    )}>
      {selectable && (
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onToggleSelect?.(event.id)
          }}
          className="shrink-0"
        >
          {isSelected ? (
            <CheckSquare className="h-5 w-5 text-primary" />
          ) : (
            <Square className="h-5 w-5 text-muted-foreground/40 hover:text-muted-foreground" />
          )}
        </button>
      )}
      <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', typeCfg.bg)}>
        <TypeIcon className={cn('h-5 w-5', typeCfg.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm truncate">{event.title}</span>
          <Badge variant="outline" className={cn('text-[10px] gap-1', statusCfg.color)}>
            <StatusIcon className="h-2.5 w-2.5" />
            {event.status}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
          {showUser && event.userName && (
            <span className="flex items-center gap-1.5">
              {event.userAvatar ? (
                <UserAvatar avatarUrl={event.userAvatar} firstName={event.userName?.split(' ')[0]} lastName={event.userName?.split(' ')[1]} size="sm" className="h-4 w-4 text-[7px]" />
              ) : null}
              <span className="font-medium">{event.userName}</span>
            </span>
          )}
          {event.isMultiDay && event.endDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(event.startDate, 'dd MMM')} → {format(event.endDate, 'dd MMM yyyy')}
            </span>
          )}
          {event.subtitle && (
            <span className="flex items-center gap-1 truncate">
              {event.type === 'catalog' && <MapPin className="h-3 w-3 shrink-0" />}
              {event.subtitle}
            </span>
          )}
        </div>
      </div>
      {linkTo && !selectable && (
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
      )}
    </div>
  )

  if (selectable) {
    return (
      <div onClick={() => onToggleSelect?.(event.id)}>
        {content}
      </div>
    )
  }

  if (linkTo) return <Link to={linkTo}>{content}</Link>
  return content
}

export function CalendarDayView({
  currentDate,
  eventsMap,
  showUser = false,
  selectable = false,
  selectedIds,
  onToggleSelect,
}) {
  const dateKey = format(currentDate, 'yyyy-MM-dd')
  const dayEvents = eventsMap.get(dateKey) || []

  // Deduplicate
  const events = useMemo(() => {
    const seen = new Set()
    return dayEvents.filter((ev) => {
      if (seen.has(ev.id)) return false
      seen.add(ev.id)
      return true
    })
  }, [dayEvents])

  // Sort: multi-day first, then by type
  const sorted = useMemo(() => {
    return [...events].sort((a, b) => {
      if (a.isMultiDay && !b.isMultiDay) return -1
      if (!a.isMultiDay && b.isMultiDay) return 1
      const typeOrder = { catalog: 0, it: 1, mailbox: 2 }
      return (typeOrder[a.type] || 0) - (typeOrder[b.type] || 0)
    })
  }, [events])

  if (sorted.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm p-8 text-center"
      >
        <Inbox className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No requests on this day</p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-2"
    >
      {sorted.map((event, i) => (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04, duration: 0.2 }}
        >
          <DayEventCard
            event={event}
            showUser={showUser}
            selectable={selectable}
            isSelected={selectedIds?.has(event.id)}
            onToggleSelect={onToggleSelect}
          />
        </motion.div>
      ))}
    </motion.div>
  )
}
