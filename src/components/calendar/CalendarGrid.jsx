import { useMemo } from 'react'
import { format, isSameDay, isToday as checkIsToday } from 'date-fns'
import { motion } from 'motion/react'
import { CalendarDayCell } from './CalendarDayCell'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Generate month grid with padding days from adjacent months
function getMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPad = (firstDay.getDay() + 6) % 7 // Monday = 0
  const days = []

  // Previous month padding
  for (let i = startPad - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month, -i), isCurrentMonth: false })
  }
  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: new Date(year, month, d), isCurrentMonth: true })
  }
  // Next month padding to fill 6 rows
  const remainder = days.length % 7
  if (remainder > 0) {
    const nextDays = 7 - remainder
    for (let d = 1; d <= nextDays; d++) {
      days.push({ date: new Date(year, month + 1, d), isCurrentMonth: false })
    }
  }
  return days
}

const gridVariants = {
  enter: (dir) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
}

export function CalendarGrid({ currentDate, eventsMap, selectedDay, onSelectDay, direction }) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const days = useMemo(() => getMonthGrid(year, month), [year, month])

  return (
    <motion.div
      key={`${year}-${month}`}
      custom={direction}
      variants={gridVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[10px] sm:text-xs font-semibold text-muted-foreground/60 py-1.5 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {days.map(({ date, isCurrentMonth }, i) => {
          const dateKey = format(date, 'yyyy-MM-dd')
          const dayEvents = eventsMap.get(dateKey) || []

          return (
            <CalendarDayCell
              key={`${dateKey}-${i}`}
              day={date}
              isCurrentMonth={isCurrentMonth}
              isToday={checkIsToday(date)}
              isSelected={selectedDay && isSameDay(date, selectedDay)}
              events={dayEvents}
              onSelect={onSelectDay}
            />
          )
        })}
      </div>
    </motion.div>
  )
}
