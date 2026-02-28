import { useMemo } from 'react'
import { startOfWeek, endOfWeek, addDays, format, isSameDay, isToday as checkIsToday } from 'date-fns'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

const TYPE_COLORS = {
  catalog: { bg: 'bg-primary/20', border: 'border-primary/40', text: 'text-primary', dot: 'bg-primary' },
  it: { bg: 'bg-amber-500/20', border: 'border-amber-500/40', text: 'text-amber-500', dot: 'bg-amber-500' },
  mailbox: { bg: 'bg-violet-500/20', border: 'border-violet-500/40', text: 'text-violet-500', dot: 'bg-violet-500' },
}

export function CalendarWeekView({ currentDate, eventsMap, selectedDay, onSelectDay, showUser = false }) {
  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate])

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i)
      const key = format(date, 'yyyy-MM-dd')
      const dayEvents = eventsMap.get(key) || []
      // Deduplicate
      const seen = new Set()
      const unique = dayEvents.filter((ev) => {
        if (seen.has(ev.id)) return false
        seen.add(ev.id)
        return true
      })
      return { date, key, events: unique }
    })
  }, [weekStart, eventsMap])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden"
    >
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border/30">
        {days.map(({ date, key }) => {
          const isToday = checkIsToday(date)
          const isSelected = selectedDay && isSameDay(date, selectedDay)
          return (
            <button
              key={key}
              onClick={() => onSelectDay(date)}
              className={cn(
                'py-2.5 px-1 text-center transition-all duration-200 border-r border-border/20 last:border-r-0',
                isToday && 'bg-primary/5',
                isSelected && 'bg-primary/10',
              )}
            >
              <div className="text-[10px] sm:text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
                {format(date, 'EEE')}
              </div>
              <div className={cn(
                'text-sm sm:text-lg font-bold mt-0.5',
                isToday ? 'text-primary' : 'text-foreground',
              )}>
                {format(date, 'd')}
              </div>
            </button>
          )
        })}
      </div>

      {/* Event rows */}
      <div className="grid grid-cols-7 min-h-[200px]">
        {days.map(({ date, key, events }) => {
          const isToday = checkIsToday(date)
          const isSelected = selectedDay && isSameDay(date, selectedDay)
          return (
            <div
              key={key}
              onClick={() => onSelectDay(date)}
              className={cn(
                'p-1 sm:p-1.5 border-r border-border/20 last:border-r-0 min-h-[160px] sm:min-h-[200px] cursor-pointer transition-colors',
                isToday && 'bg-primary/[0.03]',
                isSelected && 'bg-primary/[0.06]',
                'hover:bg-muted/20',
              )}
            >
              <div className="space-y-1">
                {events.slice(0, 6).map((ev) => {
                  const colors = TYPE_COLORS[ev.type] || TYPE_COLORS.catalog
                  return (
                    <div
                      key={ev.id}
                      className={cn(
                        'rounded-md px-1.5 py-1 text-[9px] sm:text-[10px] leading-tight border truncate',
                        colors.bg, colors.border,
                      )}
                    >
                      <div className="flex items-center gap-1">
                        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', colors.dot)} />
                        <span className={cn('truncate font-medium', colors.text)}>{ev.title}</span>
                      </div>
                      {showUser && ev.userName && (
                        <div className="text-muted-foreground/60 truncate mt-0.5">{ev.userName}</div>
                      )}
                    </div>
                  )
                })}
                {events.length > 6 && (
                  <div className="text-[9px] text-muted-foreground/50 text-center font-medium">
                    +{events.length - 6} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
