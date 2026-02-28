import { useMemo } from 'react'
import { addMonths, format, isToday as checkIsToday, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const TYPE_DOTS = {
  catalog: 'bg-primary',
  it: 'bg-amber-500',
  mailbox: 'bg-violet-500',
}

function getMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPad = (firstDay.getDay() + 6) % 7
  const days = []

  for (let i = startPad - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month, -i), isCurrentMonth: false })
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: new Date(year, month, d), isCurrentMonth: true })
  }
  const remainder = days.length % 7
  if (remainder > 0) {
    const nextDays = 7 - remainder
    for (let d = 1; d <= nextDays; d++) {
      days.push({ date: new Date(year, month + 1, d), isCurrentMonth: false })
    }
  }
  return days
}

function MiniMonth({ monthDate, eventsMap, onDayClick }) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const days = useMemo(() => getMonthGrid(year, month), [year, month])

  return (
    <div className="flex-1 min-w-[220px]">
      <h3 className="font-display font-bold text-sm text-center mb-2">
        {format(monthDate, 'MMMM yyyy')}
      </h3>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-0.5">
        {DAYS.map((d, i) => (
          <div key={i} className="text-center text-[8px] font-semibold text-muted-foreground/50 uppercase">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map(({ date, isCurrentMonth }, i) => {
          const dateKey = format(date, 'yyyy-MM-dd')
          const dayEvents = eventsMap.get(dateKey) || []
          const isToday = checkIsToday(date)

          // Collect unique type dots
          const types = new Set()
          for (const ev of dayEvents) types.add(ev.type)

          return (
            <button
              key={`${dateKey}-${i}`}
              onClick={() => isCurrentMonth && onDayClick(date)}
              disabled={!isCurrentMonth}
              className={cn(
                'relative flex flex-col items-center justify-center rounded-md h-7 sm:h-8 transition-all duration-150',
                isCurrentMonth ? 'hover:bg-muted/40 cursor-pointer' : 'opacity-20 cursor-default',
                isToday && 'ring-1 ring-primary/40 bg-primary/5',
              )}
            >
              <span className={cn(
                'text-[10px] font-medium leading-none',
                isToday ? 'text-primary font-bold' : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground',
              )}>
                {date.getDate()}
              </span>

              {/* Event dots */}
              {types.size > 0 && (
                <div className="flex items-center gap-px mt-0.5">
                  {[...types].slice(0, 3).map((type) => (
                    <span
                      key={type}
                      className={cn('h-1 w-1 rounded-full', TYPE_DOTS[type] || 'bg-primary')}
                    />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function CalendarQuarterView({ currentDate, eventsMap, onDayClick, direction }) {
  const months = useMemo(() => [
    startOfMonth(currentDate),
    startOfMonth(addMonths(currentDate, 1)),
    startOfMonth(addMonths(currentDate, 2)),
  ], [currentDate])

  return (
    <motion.div
      key={format(currentDate, 'yyyy-MM')}
      initial={{ opacity: 0, x: direction > 0 ? 40 : -40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm p-3 sm:p-5"
    >
      {months.map((m) => (
        <MiniMonth
          key={format(m, 'yyyy-MM')}
          monthDate={m}
          eventsMap={eventsMap}
          onDayClick={onDayClick}
        />
      ))}
    </motion.div>
  )
}
