import { useMemo } from 'react'
import { isSameDay } from 'date-fns'
import { cn } from '@/lib/utils'

const TYPE_DOTS = {
  catalog: 'bg-primary',
  it: 'bg-amber-500',
  mailbox: 'bg-violet-500',
}

const TYPE_BARS = {
  catalog: 'bg-primary/50',
  it: 'bg-amber-500/50',
  mailbox: 'bg-violet-500/50',
}

export function CalendarDayCell({ day, isCurrentMonth, isToday, isSelected, events, onSelect }) {
  // Separate multi-day (bar) events from single-day (dot) events
  const { barEvents, dotEvents } = useMemo(() => {
    const bars = []
    const dots = []
    const seenTypes = new Set()

    for (const ev of events) {
      if (ev.isMultiDay) {
        bars.push(ev)
      } else {
        // Only one dot per type
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

  const hasEvents = events.length > 0
  const extraCount = events.length - (dotEvents.slice(0, 3).length + barSegments.length)

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

        {/* Single-day dots */}
        {dotEvents.length > 0 && (
          <div className="flex items-center gap-0.5 mt-0.5">
            {dotEvents.slice(0, 3).map((ev) => (
              <span
                key={ev.id}
                className={cn(
                  'h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full',
                  TYPE_DOTS[ev.type] || 'bg-primary',
                )}
              />
            ))}
          </div>
        )}

        {/* Extra count */}
        {extraCount > 0 && (
          <span className="text-[8px] text-muted-foreground font-medium leading-none">
            +{extraCount}
          </span>
        )}
      </div>
    </button>
  )
}
