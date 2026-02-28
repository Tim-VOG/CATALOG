import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  addMonths, subMonths, addWeeks, subWeeks, addDays, subDays,
  startOfMonth, startOfWeek, endOfWeek, endOfMonth,
  format, isSameDay,
} from 'date-fns'
import { AnimatePresence, motion } from 'motion/react'
import {
  ChevronLeft, ChevronRight, CalendarDays, CalendarRange,
  LayoutGrid, Grid3x3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { expandEventsToDateMap, getViewRange } from '@/hooks/use-calendar-requests'
import { CalendarFilterBar } from './CalendarFilterBar'
import { AdminCalendarFilterBar } from './AdminCalendarFilterBar'
import { CalendarGrid } from './CalendarGrid'
import { CalendarDayPopover } from './CalendarDayPopover'
import { CalendarDayView } from './CalendarDayView'
import { CalendarWeekView } from './CalendarWeekView'
import { CalendarQuarterView } from './CalendarQuarterView'
import { cn } from '@/lib/utils'

const VIEW_MODES = [
  { key: 'day', icon: CalendarDays, label: '1 Day' },
  { key: 'week', icon: CalendarRange, label: '1 Week' },
  { key: 'month', icon: Grid3x3, label: '1 Month' },
  { key: '3month', icon: LayoutGrid, label: '3 Months' },
]

const STORAGE_KEY = 'calendar-view-mode'

function getTitle(currentDate, viewMode) {
  switch (viewMode) {
    case 'day':
      return format(currentDate, 'EEEE, d MMMM yyyy')
    case 'week': {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 })
      const we = endOfWeek(currentDate, { weekStartsOn: 1 })
      return ws.getMonth() === we.getMonth()
        ? `${format(ws, 'd')}–${format(we, 'd MMMM yyyy')}`
        : `${format(ws, 'd MMM')} – ${format(we, 'd MMM yyyy')}`
    }
    case '3month': {
      const end = addMonths(currentDate, 2)
      return currentDate.getFullYear() === end.getFullYear()
        ? `${format(currentDate, 'MMM')} – ${format(end, 'MMM yyyy')}`
        : `${format(currentDate, 'MMM yyyy')} – ${format(end, 'MMM yyyy')}`
    }
    case 'month':
    default:
      return format(currentDate, 'MMMM yyyy')
  }
}

export function RequestsCalendar({
  events,
  counts,
  hasCatalog,
  hasItForm,
  hasMailbox,
  // Admin mode props
  isAdmin = false,
  users = [],
  showUser = false,
  storageKey = STORAGE_KEY,
}) {
  const [viewMode, setViewMode] = useState(() => {
    try { return localStorage.getItem(storageKey) || 'month' } catch { return 'month' }
  })
  const [currentDate, setCurrentDate] = useState(() => startOfMonth(new Date()))
  const [direction, setDirection] = useState(0)
  const [selectedDay, setSelectedDay] = useState(null)
  const [filters, setFilters] = useState({
    types: ['catalog', 'it', 'mailbox'],
    statuses: [],
    users: [],
  })

  // Persist view mode
  useEffect(() => {
    try { localStorage.setItem(storageKey, viewMode) } catch {}
  }, [viewMode, storageKey])

  // Build the events map for the current range and filters
  const { start: rangeStart, end: rangeEnd } = useMemo(
    () => getViewRange(currentDate, viewMode),
    [currentDate, viewMode]
  )

  const eventsMap = useMemo(
    () => expandEventsToDateMap(events, rangeStart, rangeEnd, filters),
    [events, rangeStart, rangeEnd, filters]
  )

  // Count visible events
  const visibleCount = useMemo(() => {
    let count = 0
    const seen = new Set()
    for (const dayEvents of eventsMap.values()) {
      for (const ev of dayEvents) {
        if (!seen.has(ev.id)) {
          seen.add(ev.id)
          count++
        }
      }
    }
    return count
  }, [eventsMap])

  const navigate = useCallback((dir) => {
    setDirection(dir)
    setSelectedDay(null)
    setCurrentDate((d) => {
      switch (viewMode) {
        case 'day': return dir > 0 ? addDays(d, 1) : subDays(d, 1)
        case 'week': return dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1)
        case '3month': return dir > 0 ? addMonths(d, 3) : subMonths(d, 3)
        case 'month':
        default: return dir > 0 ? addMonths(d, 1) : subMonths(d, 1)
      }
    })
  }, [viewMode])

  const goToToday = useCallback(() => {
    const today = new Date()
    const todayMonth = startOfMonth(today)
    setDirection(todayMonth > currentDate ? 1 : todayMonth < currentDate ? -1 : 0)
    setCurrentDate(viewMode === 'month' || viewMode === '3month' ? todayMonth : today)
    setSelectedDay(null)
  }, [currentDate, viewMode])

  const handleSelectDay = useCallback((day) => {
    setSelectedDay((prev) => prev && isSameDay(prev, day) ? null : day)
  }, [])

  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode)
    setSelectedDay(null)
    // Reset to proper granularity
    if (mode === 'month' || mode === '3month') {
      setCurrentDate(startOfMonth(currentDate))
    }
  }, [currentDate])

  // Allow quarter view to drill into month
  const handleQuarterDayClick = useCallback((day) => {
    setCurrentDate(startOfMonth(day))
    setViewMode('month')
    setSelectedDay(day)
  }, [])

  const titleKey = `${viewMode}-${format(currentDate, 'yyyy-MM-dd')}`
  const selectedDayKey = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null
  const selectedDayEvents = selectedDayKey ? (eventsMap.get(selectedDayKey) || []) : []

  return (
    <div className="space-y-5">
      {/* View mode selector + navigation */}
      <div className="flex flex-col gap-3">
        {/* View mode tabs */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-0.5 p-0.5 rounded-xl bg-muted/30 border border-border/30">
            {VIEW_MODES.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => handleViewModeChange(key)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200',
                  viewMode === key
                    ? 'bg-primary/15 text-primary shadow-sm'
                    : 'text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/40'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="gap-1.5 text-xs rounded-xl shrink-0"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Today
          </Button>
        </div>

        {/* Month/period navigation */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl shrink-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex-1 text-center">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.h2
                key={titleKey}
                custom={direction}
                initial={{ opacity: 0, x: direction > 0 ? 30 : -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction > 0 ? -30 : 30 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="font-display font-bold text-lg sm:text-xl tracking-tight"
              >
                {getTitle(currentDate, viewMode)}
              </motion.h2>
            </AnimatePresence>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {visibleCount} request{visibleCount !== 1 ? 's' : ''} in view
            </p>
          </div>

          <Button variant="ghost" size="icon" onClick={() => navigate(1)} className="h-9 w-9 rounded-xl shrink-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      {isAdmin ? (
        <AdminCalendarFilterBar
          filters={filters}
          onChange={setFilters}
          counts={counts}
          users={users}
        />
      ) : (
        <CalendarFilterBar
          filters={filters}
          onChange={setFilters}
          counts={counts}
          hasCatalog={hasCatalog}
          hasItForm={hasItForm}
          hasMailbox={hasMailbox}
        />
      )}

      {/* Calendar view */}
      {viewMode === 'day' && (
        <CalendarDayView
          currentDate={currentDate}
          eventsMap={eventsMap}
          showUser={showUser}
        />
      )}

      {viewMode === 'week' && (
        <CalendarWeekView
          currentDate={currentDate}
          eventsMap={eventsMap}
          selectedDay={selectedDay}
          onSelectDay={handleSelectDay}
          showUser={showUser}
        />
      )}

      {viewMode === 'month' && (
        <>
          <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm p-2 sm:p-3 overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              <CalendarGrid
                key={format(currentDate, 'yyyy-MM')}
                currentDate={currentDate}
                eventsMap={eventsMap}
                selectedDay={selectedDay}
                onSelectDay={handleSelectDay}
                direction={direction}
                showLabels
              />
            </AnimatePresence>
          </div>

          {/* Day detail popover */}
          <AnimatePresence>
            {selectedDay && selectedDayEvents.length > 0 && (
              <CalendarDayPopover
                day={selectedDay}
                events={selectedDayEvents}
                onClose={() => setSelectedDay(null)}
                showUser={showUser}
              />
            )}
          </AnimatePresence>
        </>
      )}

      {viewMode === '3month' && (
        <CalendarQuarterView
          currentDate={currentDate}
          eventsMap={eventsMap}
          onDayClick={handleQuarterDayClick}
          direction={direction}
        />
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-[10px] text-muted-foreground/50 pt-2">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary" /> Catalog
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> IT
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-violet-500" /> Mailbox
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-5 rounded-full bg-primary/50" /> Multi-day
        </span>
      </div>
    </div>
  )
}
