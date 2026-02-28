import { useMemo } from 'react'
import { isSameDay } from 'date-fns'
import { Package, ClipboardList, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'

const TYPE_ICONS = {
  catalog: Package,
  it: ClipboardList,
  mailbox: Mail,
}

const TYPE_COLORS = {
  catalog: 'text-primary',
  it: 'text-amber-500',
  mailbox: 'text-violet-500',
}

const TYPE_BARS = {
  catalog: 'bg-primary/50',
  it: 'bg-amber-500/50',
  mailbox: 'bg-violet-500/50',
}

export function CalendarDayCell({ day, isCurrentMonth, isToday, isSelected, events, onSelect, showLabels = false }) {
  // Separate multi-day (bar) events from single-day (icon) events
  const { barEvents, dotEvents } = useMemo(() => {
    const bars = []
    const dots = []
    const seenTypes = new Set()

    for (const ev of events) {
      if (ev.isMultiDay) {
        bars.push(ev)
      } else {
        if (!seenTypes.has(ev.type)) {
          dots.push(ev)
          seenTypes.add(ev.type)
        }
      }
    }
    return { barEvents: bars, dotEvents: dots }
  }, [events])

  // For multi-day bars, determine position in range
  const barSegments = useMemo(() => {
    const seen = new Set()
    return barEvents
      .filter((ev) => {
        if (seen.has(ev.id)) return false
        seen.add(ev.id)
        return true
      })
      .slice(0, 2)
      .map((ev) => {
        let position = 'single'
        if (ev.isMultiDay && ev.endDate) {
          const isStart = isSameDay(day, ev.startDate)
          const isEnd = isSameDay(day, ev.endDate)
          if (isStart && isEnd) position = 'single'
          else if (isStart) position = 'start'
          else if (isEnd) position = 'end'
          else position = 'middle'
        }
        return { event: ev, position }
      })
  }, [barEvents, day])

  // Unique events for label display on desktop
  const labelEvents = useMemo(() => {
    if (!showLabels) return []
    const seen = new Set()
    return events.filter((ev) => {
      if (seen.has(ev.id)) return false
      seen.add(ev.id)
      return true
    }).slice(0, 2)
  }, [events, showLabels])

  const hasEvents = events.length > 0
  const uniqueCount = useMemo(() => {
    const s = new Set()
    for (const ev of events) s.add(ev.id)
    return s.size
  }, [events])
  const mobileShown = dotEvents.slice(0, 3).length + barSegments.length
  const extraMobile = Math.max(0, uniqueCount - mobileShown)
  const extraDesktop = Math.max(0, uniqueCount - labelEvents.length)

  return (
    <button
      onClick={() => onSelect(day)}
      className={cn(
        'relative flex flex-col items-center justify-start rounded-xl transition-all duration-200 min-h-[52px] sm:min-h-[68px] p-1 sm:p-1.5 group',
        isCurrentMonth ? 'hover:bg-muted/40' : 'opacity-25 pointer-events-none',
        isToday && !isSelected && 'ring-2 ring-primary/40 shadow-[0_0_16px_rgba(249,115,22,0.1)]',
        isSelected && 'bg-primary/15 ring-2 ring-primary/50 shadow-[0_0_20px_rgba(249,115,22,0.15)]',
        hasEvents && isCurrentMonth && 'cursor-pointer',
        !hasEvents && isCurrentMonth && 'cursor-default',
      )}
    >
      {/* Day number */}
      <span className={cn(
        'text-xs sm:text-sm font-medium transition-colors leading-none',
        isToday && 'text-primary font-bold',
        isSelected && 'text-primary font-bold',
        !isToday && !isSelected && isCurrentMonth && 'text-foreground',
      )}>
        {day.getDate()}
      </span>

      {/* Event indicators */}
      <div className="flex-1 flex flex-col items-center justify-end gap-0.5 w-full mt-0.5">
        {/* Desktop labels (when showLabels=true) */}
        {showLabels && labelEvents.length > 0 && (
          <div className="hidden sm:flex flex-col gap-px w-full">
            {labelEvents.map((ev) => {
              const Icon = TYPE_ICONS[ev.type] || Package
              return (
                <div key={ev.id} className="flex items-center gap-0.5 px-0.5 truncate">
                  <Icon className={cn('h-2.5 w-2.5 shrink-0', TYPE_COLORS[ev.type] || 'text-primary')} />
                  <span className={cn('text-[8px] leading-tight truncate font-medium', TYPE_COLORS[ev.type] || 'text-primary')}>
                    {ev.title}
                  </span>
                </div>
              )
            })}
            {extraDesktop > 0 && (
              <span className="text-[7px] text-muted-foreground/50 font-medium text-center">
                +{extraDesktop}
              </span>
            )}
          </div>
        )}

        {/* Mobile: always show icons & bars (also desktop fallback when no labels) */}
        <div className={cn(showLabels ? 'sm:hidden' : '', 'flex flex-col items-center gap-0.5 w-full')}>
          {/* Multi-day bar segments */}
          {barSegments.map(({ event, position }) => (
            <div
              key={event.id}
              className={cn(
                'h-1 sm:h-1.5 w-full',
                TYPE_BARS[event.type] || 'bg-primary/50',
                position === 'start' && 'rounded-l-full pl-0.5',
                position === 'end' && 'rounded-r-full pr-0.5',
                position === 'single' && 'rounded-full mx-1',
                position === 'middle' && '',
              )}
            />
          ))}

          {/* Single-day type icons */}
          {dotEvents.length > 0 && (
            <div className="flex items-center gap-0.5 mt-0.5">
              {dotEvents.slice(0, 3).map((ev) => {
                const Icon = TYPE_ICONS[ev.type] || Package
                return (
                  <Icon
                    key={ev.id}
                    className={cn(
                      'h-2.5 w-2.5 sm:h-3 sm:w-3',
                      TYPE_COLORS[ev.type] || 'text-primary',
                    )}
                  />
                )
              })}
            </div>
          )}

          {extraMobile > 0 && (
            <span className="text-[8px] text-muted-foreground font-medium leading-none">
              +{extraMobile}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
