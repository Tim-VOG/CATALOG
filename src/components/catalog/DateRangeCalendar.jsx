import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function toDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPad = (firstDay.getDay() + 6) % 7 // Monday = 0
  const days = []
  for (let i = 0; i < startPad; i++) days.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d))
  return days
}

/**
 * DateRangeCalendar — visual month calendar for selecting a pickup → return date range.
 *
 * Props:
 *   startDate  - ISO string 'YYYY-MM-DD' or ''
 *   endDate    - ISO string 'YYYY-MM-DD' or ''
 *   onChange   - (startDate, endDate) => void
 */
export function DateRangeCalendar({ startDate, endDate, onChange }) {
  const today = new Date()
  const todayStr = toDateStr(today)
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  // hover state for range preview
  const [hoverDate, setHoverDate] = useState(null)

  // Which click we're on: if no start or both set → next click sets start; if only start → next sets end
  const isSelectingEnd = startDate && !endDate

  const days = useMemo(() => getMonthGrid(currentYear, currentMonth), [currentYear, currentMonth])

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1) }
    else setCurrentMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1) }
    else setCurrentMonth((m) => m + 1)
  }

  const handleDayClick = (dateStr) => {
    if (dateStr < todayStr) return // can't pick past dates

    if (!startDate || (startDate && endDate)) {
      // Start fresh selection
      onChange(dateStr, '')
    } else {
      // Selecting end date
      if (dateStr < startDate) {
        // Clicked before start → make this the new start
        onChange(dateStr, '')
      } else if (dateStr === startDate) {
        // Same day → single-day range
        onChange(dateStr, dateStr)
      } else {
        onChange(startDate, dateStr)
      }
    }
  }

  const clearSelection = () => {
    onChange('', '')
  }

  // Compute range boundaries for styling
  const rangeStart = startDate || null
  const rangeEnd = endDate || (isSelectingEnd && hoverDate > startDate ? hoverDate : null)

  const getDayState = (dateStr) => {
    if (!dateStr) return 'empty'
    if (dateStr < todayStr) return 'past'
    if (dateStr === rangeStart && dateStr === rangeEnd) return 'single'
    if (dateStr === rangeStart) return 'start'
    if (dateStr === rangeEnd) return 'end'
    if (rangeStart && rangeEnd && dateStr > rangeStart && dateStr < rangeEnd) return 'in-range'
    return 'normal'
  }

  const formatSelectedRange = () => {
    if (!startDate) return null
    const fmt = (s) => {
      const d = new Date(s + 'T00:00:00')
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    }
    if (!endDate) return `From ${fmt(startDate)} — select return date`
    const s = new Date(startDate + 'T00:00:00')
    const e = new Date(endDate + 'T00:00:00')
    const diffDays = Math.round((e - s) / (1000 * 60 * 60 * 24))
    return `${fmt(startDate)} → ${fmt(endDate)}  (${diffDays} day${diffDays !== 1 ? 's' : ''})`
  }

  return (
    <div className="space-y-3">
      {/* Month header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth} aria-label="Previous month">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-semibold text-sm">
          {MONTHS[currentMonth]} {currentYear}
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth} aria-label="Next month">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0.5">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}

        {/* Day cells */}
        {days.map((date, i) => {
          if (!date) return <div key={`pad-${i}`} className="aspect-square" />

          const dateStr = toDateStr(date)
          const state = getDayState(dateStr)
          const isPast = dateStr < todayStr
          const isToday = dateStr === todayStr

          return (
            <button
              key={i}
              type="button"
              disabled={isPast}
              onClick={() => handleDayClick(dateStr)}
              onMouseEnter={() => setHoverDate(dateStr)}
              onMouseLeave={() => setHoverDate(null)}
              className={cn(
                'aspect-square flex items-center justify-center text-xs font-medium transition-colors relative',
                isPast && 'text-muted-foreground/30 cursor-not-allowed',
                // Normal day
                state === 'normal' && !isPast && 'hover:bg-primary/10 rounded-md cursor-pointer',
                // Today ring
                isToday && state === 'normal' && 'ring-1 ring-primary/50 rounded-md',
                // Start of range
                state === 'start' && 'bg-primary text-primary-foreground rounded-l-md',
                // End of range
                state === 'end' && 'bg-primary text-primary-foreground rounded-r-md',
                // Single day (start = end)
                state === 'single' && 'bg-primary text-primary-foreground rounded-md',
                // In range
                state === 'in-range' && 'bg-primary/15 text-primary',
              )}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>

      {/* Selected range summary */}
      {startDate && (
        <div className="flex items-center justify-between gap-2 text-xs bg-muted/50 rounded-md px-3 py-2">
          <span className={cn('text-muted-foreground', endDate && 'text-foreground font-medium')}>
            {formatSelectedRange()}
          </span>
          <button
            type="button"
            onClick={clearSelection}
            className="shrink-0 rounded-full p-0.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Clear dates"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {!startDate && (
        <p className="text-xs text-muted-foreground text-center">
          Click a date to set the pickup date
        </p>
      )}
    </div>
  )
}
