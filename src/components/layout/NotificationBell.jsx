import { useState, useRef, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { Bell, UserPlus, UserMinus, Monitor, Mail, Package, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from '@/hooks/use-notifications'
import { cn } from '@/lib/utils'

const formatRelative = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// ── Request type categorization ──
const REQUEST_CATEGORIES = {
  onboarding: { label: 'Onboarding', icon: UserPlus, color: 'text-green-400 bg-green-500/10' },
  offboarding: { label: 'Offboarding', icon: UserMinus, color: 'text-orange-400 bg-orange-500/10' },
  it_material: { label: 'IT Material', icon: Monitor, color: 'text-blue-400 bg-blue-500/10' },
  mailbox: { label: 'Mailbox', icon: Mail, color: 'text-violet-400 bg-violet-500/10' },
  equipment: { label: 'Equipment', icon: Package, color: 'text-primary bg-primary/10' },
  default: { label: 'General', icon: Inbox, color: 'text-muted-foreground bg-muted/30' },
}

function getNotificationCategory(notification) {
  const title = (notification.title || '').toLowerCase()
  const message = (notification.message || '').toLowerCase()
  const type = (notification.type || '').toLowerCase()
  const combined = `${title} ${message} ${type}`

  if (combined.includes('onboarding')) return 'onboarding'
  if (combined.includes('offboarding')) return 'offboarding'
  if (combined.includes('mailbox') || combined.includes('functional mailbox')) return 'mailbox'
  if (combined.includes('it material') || combined.includes('it request') || combined.includes('equipment request')) return 'it_material'
  if (combined.includes('equipment') || combined.includes('loan') || combined.includes('request')) return 'equipment'
  return 'default'
}

const CATEGORY_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'it_material', label: 'IT' },
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'offboarding', label: 'Offboarding' },
  { key: 'mailbox', label: 'Mailbox' },
]

export function NotificationBell() {
  const { data: notifications = [] } = useNotifications()
  const markAsRead = useMarkAsRead()
  const markAllAsRead = useMarkAllAsRead()
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('all')
  const ref = useRef(null)

  const unreadCount = notifications.filter((n) => !n.is_read).length

  // Categorize and filter notifications
  const categorizedNotifications = useMemo(() =>
    notifications.map((n) => ({ ...n, _category: getNotificationCategory(n) })),
    [notifications]
  )

  const filteredNotifications = useMemo(() =>
    filter === 'all'
      ? categorizedNotifications
      : categorizedNotifications.filter((n) => n._category === filter),
    [categorizedNotifications, filter]
  )

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id)
    }
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <Button variant="ghost" size="icon" className="relative" onClick={() => setOpen(!open)} aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'} aria-expanded={open}>
        <Bell className="h-4 w-4" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key={unreadCount}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="absolute right-0 top-full mt-2 w-96 rounded-xl border bg-card shadow-xl z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="font-semibold text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="text-xs h-auto py-1" onClick={() => markAllAsRead.mutate()}>
                  Mark all read
                </Button>
              )}
            </div>

            {/* Category filter tabs */}
            <div className="flex gap-1 px-3 py-2 border-b overflow-x-auto">
              {CATEGORY_FILTERS.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setFilter(cat.key)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors',
                    filter === cat.key
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Notification list */}
            <div className="max-h-80 overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  {filter === 'all' ? 'No notifications' : `No ${filter.replace('_', ' ')} notifications`}
                </p>
              ) : (
                filteredNotifications.slice(0, 20).map((n) => (
                  <div key={n.id} onClick={() => handleNotificationClick(n)}>
                    {n.link ? (
                      <Link to={n.link} className="block">
                        <NotificationItem notification={n} />
                      </Link>
                    ) : (
                      <NotificationItem notification={n} />
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function NotificationItem({ notification }) {
  const category = getNotificationCategory(notification)
  const catConfig = REQUEST_CATEGORIES[category] || REQUEST_CATEGORIES.default
  const CatIcon = catConfig.icon

  return (
    <div
      className={cn(
        'flex gap-3 px-4 py-3 border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors',
        !notification.is_read && 'bg-primary/5'
      )}
    >
      {/* Category icon */}
      <div className={cn('mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center shrink-0', catConfig.color)}>
        <CatIcon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate flex-1">{notification.title}</p>
          {!notification.is_read && (
            <div className="h-2 w-2 shrink-0 rounded-full bg-primary" />
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', catConfig.color)}>
            {catConfig.label}
          </span>
          <span className="text-[10px] text-muted-foreground">{formatRelative(notification.created_at)}</span>
        </div>
      </div>
    </div>
  )
}
