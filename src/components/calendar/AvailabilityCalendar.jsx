import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAYS_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

function getMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPad = (firstDay.getDay() + 6) % 7 // Monday = 0
  const days = []

  for (let i = 0; i < startPad; i++) {
    days.push(null)
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d))
  }
  return days
}

function toDateStr(date) {
  return date.toISOString().slice(0, 10)
}

export function AvailabilityCalendar({ reservations = [], totalStock = 1, compact = false, headerExtra }) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())

  const reservedByDate = useMemo(() => {
    const map = {}
    for (const res of reservations) {
      const start = new Date(res.pickup_date)
      const end = new Date(res.return_date)
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = toDateStr(d)
        map[key] = (map[key] || 0) + (res.quantity || 1)
      }
    }
    return map
  }, [reservations])

  const days = getMonthGrid(currentYear, currentMonth)

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }

  const getAvailability = (date) => {
    if (!date) return null
    const key = toDateStr(date)
    const reserved = reservedByDate[key] || 0
    const available = totalStock - reserved
    if (available <= 0) return 'full'
    if (available <= Math.ceil(totalStock * 0.3)) return 'low'
    return 'available'
  }

  const isPast = (date) => {
    if (!date) return false
    const todayStr = toDateStr(today)
    return toDateStr(date) < todayStr
  }

  const dayLabels = compact ? DAYS_SHORT : DAYS

  return (
    <div className={cn('space-y-3', compact && 'space-y-1.5')}>
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={prevMonth}
            aria-label="Previous month"
            className={cn(compact && 'h-7 w-7')}
          >
            <ChevronLeft className={cn('h-4 w-4', compact && 'h-3.5 w-3.5')} />
          </Button>
          <span className={cn('font-semibold', compact ? 'text-xs' : 'text-sm')}>
            {compact
              ? `${MONTHS[currentMonth].slice(0, 3)} ${currentYear}`
              : `${MONTHS[currentMonth]} ${currentYear}`}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={nextMonth}
            aria-label="Next month"
            className={cn(compact && 'h-7 w-7')}
          >
            <ChevronRight className={cn('h-4 w-4', compact && 'h-3.5 w-3.5')} />
          </Button>
        </div>
        {headerExtra && <div className="flex items-center">{headerExtra}</div>}
      </div>

      {/* Day grid */}
      <div className={cn('grid grid-cols-7', compact ? 'gap-0.5' : 'gap-1')}>
        {dayLabels.map((d, i) => (
          <div
            key={`${d}-${i}`}
            className={cn(
              'text-center font-medium text-muted-foreground',
              compact ? 'text-[10px] py-0.5' : 'text-xs py-1'
            )}
          >
            {d}
          </div>
        ))}

        {days.map((date, i) => {
          if (!date) return <div key={`pad-${i}`} />
          const availability = getAvailability(date)
          const past = isPast(date)
          const isToday = toDateStr(date) === toDateStr(today)

          return (
            <div
              key={i}
              className={cn(
                'flex items-center justify-center rounded font-medium',
                compact
                  ? 'h-7 w-full text-[10px]'
                  : 'aspect-square text-xs',
                past && 'text-muted-foreground/40',
                !past && availability === 'available' && 'bg-success/15 text-success',
                !past && availability === 'low' && 'bg-warning/15 text-warning',
                !past && availability === 'full' && 'bg-destructive/15 text-destructive',
                isToday && 'ring-1 ring-primary'
              )}
            >
              {date.getDate()}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className={cn(
        'flex items-center justify-center text-muted-foreground',
        compact ? 'gap-3 text-[10px]' : 'gap-4 text-xs'
      )}>
        <span className="flex items-center gap-1">
          <span className={cn('rounded-full bg-success/50', compact ? 'h-1.5 w-1.5' : 'h-2.5 w-2.5')} /> Available
        </span>
        <span className="flex items-center gap-1">
          <span className={cn('rounded-full bg-warning/50', compact ? 'h-1.5 w-1.5' : 'h-2.5 w-2.5')} /> Low
        </span>
        <span className="flex items-center gap-1">
          <span className={cn('rounded-full bg-destructive/50', compact ? 'h-1.5 w-1.5' : 'h-2.5 w-2.5')} /> Fully booked
        </span>
      </div>
    </div>
  )
}
