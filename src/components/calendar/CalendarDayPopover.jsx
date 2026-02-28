import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { motion } from 'motion/react'
import {
  Package, ClipboardList, Mail, Clock, CheckCircle2, XCircle,
  Calendar, ChevronRight, X, MapPin,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const TYPE_CONFIG = {
  catalog: { icon: Package, color: 'text-primary', bg: 'bg-primary/10', label: 'Catalog' },
  it: { icon: ClipboardList, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'IT' },
  mailbox: { icon: Mail, color: 'text-violet-500', bg: 'bg-violet-500/10', label: 'Mailbox' },
}

const STATUS_MAP = {
  pending: { color: 'bg-amber-500/15 text-amber-600 border-amber-500/30', icon: Clock },
  approved: { color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30', icon: CheckCircle2 },
  rejected: { color: 'bg-destructive/15 text-destructive border-destructive/30', icon: XCircle },
  completed: { color: 'bg-primary/15 text-primary border-primary/30', icon: CheckCircle2 },
  cancelled: { color: 'bg-gray-500/15 text-gray-500 border-gray-500/30', icon: XCircle },
  picked_up: { color: 'bg-blue-500/15 text-blue-600 border-blue-500/30', icon: Package },
  returned: { color: 'bg-cyan-500/15 text-cyan-600 border-cyan-500/30', icon: CheckCircle2 },
  closed: { color: 'bg-gray-500/15 text-gray-600 border-gray-500/30', icon: CheckCircle2 },
}

function EventCard({ event }) {
  const typeCfg = TYPE_CONFIG[event.type] || TYPE_CONFIG.catalog
  const statusCfg = STATUS_MAP[event.status] || STATUS_MAP.pending
  const StatusIcon = statusCfg.icon
  const TypeIcon = typeCfg.icon

  const content = (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-xl border border-border/50 transition-all duration-200',
      event.linkTo && 'hover:border-primary/30 hover:bg-muted/30 cursor-pointer group'
    )}>
      <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', typeCfg.bg)}>
        <TypeIcon className={cn('h-4 w-4', typeCfg.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm truncate">{event.title}</span>
          <Badge variant="outline" className={cn('text-[10px] gap-1', statusCfg.color)}>
            <StatusIcon className="h-2.5 w-2.5" />
            {event.status}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
          {event.isMultiDay && event.endDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(event.startDate, 'dd MMM')} &rarr; {format(event.endDate, 'dd MMM yyyy')}
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
      {event.linkTo && (
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
      )}
    </div>
  )

  if (event.linkTo) {
    return <Link to={event.linkTo}>{content}</Link>
  }
  return content
}

export function CalendarDayPopover({ day, events, onClose }) {
  if (!events.length) return null

  // Deduplicate events (multi-day events appear multiple times)
  const seen = new Set()
  const unique = events.filter((ev) => {
    if (seen.has(ev.id)) return false
    seen.add(ev.id)
    return true
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <Card variant="glass" className="overflow-hidden">
        <CardContent className="p-0">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between bg-gradient-to-r from-primary/5 via-transparent to-cyan-500/5">
            <div>
              <h3 className="font-display font-bold text-sm">
                {format(day, 'EEEE, d MMMM yyyy')}
              </h3>
              <p className="text-[10px] text-muted-foreground">
                {unique.length} request{unique.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Events */}
          <div className="p-3 space-y-2 max-h-[300px] overflow-y-auto">
            {unique.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.2 }}
              >
                <EventCard event={event} />
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
