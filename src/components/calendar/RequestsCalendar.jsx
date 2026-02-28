import { useState, useMemo, useCallback } from 'react'
import { addMonths, subMonths, startOfMonth, format, isSameDay } from 'date-fns'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { expandEventsToDateMap } from '@/hooks/use-calendar-requests'
import { CalendarFilterBar } from './CalendarFilterBar'
import { CalendarGrid } from './CalendarGrid'
import { CalendarDayPopover } from './CalendarDayPopover'

export function RequestsCalendar({ events, counts, hasCatalog, hasItForm, hasMailbox }) {
  const [currentDate, setCurrentDate] = useState(() => startOfMonth(new Date()))
  const [direction, setDirection] = useState(0)
  const [selectedDay, setSelectedDay] = useState(null)
  const [filters, setFilters] = useState({
    types: ['catalog', 'it', 'mailbox'],
    statuses: [],
  })

  // Build the events map for the current month and filters
  const eventsMap = useMemo(
    () => expandEventsToDateMap(events, currentDate, filters),
    [events, currentDate, filters]
  )

  // Count visible events this month
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

  const goToPrevMonth = useCallback(() => {
    setDirection(-1)
    setCurrentDate((d) => subMonths(d, 1))
    setSelectedDay(null)
  }, [])

  const goToNextMonth = useCallback(() => {
    setDirection(1)
    setCurrentDate((d) => addMonths(d, 1))
    setSelectedDay(null)
  }, [])

  const goToToday = useCallback(() => {
    const today = startOfMonth(new Date())
    setDirection(today > currentDate ? 1 : today < currentDate ? -1 : 0)
    setCurrentDate(today)
    setSelectedDay(null)
  }, [currentDate])

  const handleSelectDay = useCallback((day) => {
    setSelectedDay((prev) => prev && isSameDay(prev, day) ? null : day)
  }, [])

  const monthKey = format(currentDate, 'yyyy-MM')
  const selectedDayKey = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null
  const selectedDayEvents = selectedDayKey ? (eventsMap.get(selectedDayKey) || []) : []

  return (
    <div className="space-y-5">
      {/* Month navigation */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={goToPrevMonth} className="h-9 w-9 rounded-xl shrink-0">
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 text-center">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.h2
              key={monthKey}
              custom={direction}
              initial={{ opacity: 0, x: direction > 0 ? 30 : -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -30 : 30 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="font-display font-bold text-lg sm:text-xl tracking-tight"
            >
              {format(currentDate, 'MMMM yyyy')}
            </motion.h2>
          </AnimatePresence>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {visibleCount} request{visibleCount !== 1 ? 's' : ''} this month
          </p>
        </div>

        <Button variant="ghost" size="icon" onClick={goToNextMonth} className="h-9 w-9 rounded-xl shrink-0">
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={goToToday}
          className="gap-1.5 text-xs rounded-xl shrink-0 hidden sm:flex"
        >
          <CalendarDays className="h-3.5 w-3.5" />
          Today
        </Button>
      </div>

      {/* Filter bar */}
      <CalendarFilterBar
        filters={filters}
        onChange={setFilters}
        counts={counts}
        hasCatalog={hasCatalog}
        hasItForm={hasItForm}
        hasMailbox={hasMailbox}
      />

      {/* Calendar grid */}
      <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm p-2 sm:p-3 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <CalendarGrid
            key={monthKey}
            currentDate={currentDate}
            eventsMap={eventsMap}
            selectedDay={selectedDay}
            onSelectDay={handleSelectDay}
            direction={direction}
          />
        </AnimatePresence>
      </div>

      {/* Mobile: Today button */}
      <div className="flex justify-center sm:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={goToToday}
          className="gap-1.5 text-xs rounded-xl"
        >
          <CalendarDays className="h-3.5 w-3.5" />
          Today
        </Button>
      </div>

      {/* Day detail popover */}
      <AnimatePresence>
        {selectedDay && selectedDayEvents.length > 0 && (
          <CalendarDayPopover
            day={selectedDay}
            events={selectedDayEvents}
            onClose={() => setSelectedDay(null)}
          />
        )}
      </AnimatePresence>

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
