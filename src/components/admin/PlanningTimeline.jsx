import { useMemo } from 'react'
import {
  format, addDays, addWeeks, addMonths, differenceInDays,
  startOfDay, startOfWeek, startOfMonth, endOfMonth, eachDayOfInterval,
  eachWeekOfInterval, isToday, isSameDay,
} from 'date-fns'
import { cn } from '@/lib/utils'

const STATUS_COLORS = {
  pending: 'bg-amber-500/70',
  approved: 'bg-blue-500/70',
  reserved: 'bg-cyan-500/70',
  picked_up: 'bg-green-500/70',
  overdue: 'bg-red-500/70',
}

const STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  reserved: 'Reserved',
  picked_up: 'Picked Up',
  overdue: 'Overdue',
}

/**
 * PlanningTimeline
 * Props:
 *   items       - Array of planning items (from usePlanning)
 *   viewMode    - '1D' | '1W' | '1M' | '3M'
 *   startDate   - Date object for the start of the visible range
 */
export function PlanningTimeline({ items = [], viewMode, startDate }) {
  // Calculate the date columns based on view mode
  const { columns, endDate, cellWidth } = useMemo(() => {
    const start = startOfDay(startDate)
    let cols = []
    let end
    let width

    switch (viewMode) {
      case '1D': {
        // 24 hours
        cols = Array.from({ length: 24 }, (_, i) => ({
          key: `h${i}`,
          label: `${i.toString().padStart(2, '0')}:00`,
          date: start,
          startFrac: i / 24,
          endFrac: (i + 1) / 24,
        }))
        end = start
        width = 'min-w-[60px]'
        break
      }
      case '1W': {
        // 7 days
        const days = eachDayOfInterval({ start, end: addDays(start, 6) })
        cols = days.map((d, i) => ({
          key: format(d, 'yyyy-MM-dd'),
          label: format(d, 'EEE d'),
          date: d,
          isToday: isToday(d),
        }))
        end = addDays(start, 6)
        width = 'min-w-[100px]'
        break
      }
      case '1M': {
        // Full month
        const monthStart = startOfMonth(start)
        const monthEnd = endOfMonth(start)
        const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
        cols = days.map((d) => ({
          key: format(d, 'yyyy-MM-dd'),
          label: format(d, 'd'),
          sublabel: format(d, 'EEE'),
          date: d,
          isToday: isToday(d),
          isWeekend: d.getDay() === 0 || d.getDay() === 6,
        }))
        end = monthEnd
        width = 'min-w-[36px]'
        break
      }
      case '3M': {
        // 3 months in weeks
        const rangeEnd = addMonths(start, 3)
        const weeks = eachWeekOfInterval({ start, end: rangeEnd }, { weekStartsOn: 1 })
        cols = weeks.map((w) => ({
          key: format(w, 'yyyy-MM-dd'),
          label: format(w, 'd MMM'),
          date: w,
          isToday: isToday(w),
        }))
        end = rangeEnd
        width = 'min-w-[80px]'
        break
      }
      default:
        end = addDays(start, 6)
    }

    return { columns: cols, endDate: end, cellWidth: width }
  }, [viewMode, startDate])

  // Group items by product
  const productRows = useMemo(() => {
    const map = new Map()
    items.forEach((item) => {
      const key = item.product_id
      if (!map.has(key)) {
        map.set(key, {
          productId: key,
          productName: item.product_name || 'Unknown',
          categoryName: item.category_name || '',
          categoryColor: item.category_color || '#6b7280',
          reservations: [],
        })
      }
      map.get(key).reservations.push(item)
    })
    return Array.from(map.values()).sort((a, b) => a.productName.localeCompare(b.productName))
  }, [items])

  // Calculate bar position as percentage of timeline
  const getBarStyle = (pickupDate, returnDate) => {
    const timelineStart = startOfDay(startDate)
    let timelineEnd

    switch (viewMode) {
      case '1D':
        timelineEnd = addDays(timelineStart, 1)
        break
      case '1W':
        timelineEnd = addDays(timelineStart, 7)
        break
      case '1M':
        timelineEnd = addDays(endOfMonth(timelineStart), 1)
        break
      case '3M':
        timelineEnd = addMonths(timelineStart, 3)
        break
      default:
        timelineEnd = addDays(timelineStart, 7)
    }

    const totalDays = differenceInDays(timelineEnd, timelineStart) || 1
    const pickup = startOfDay(new Date(pickupDate))
    const returnD = startOfDay(new Date(returnDate))

    const startOffset = Math.max(0, differenceInDays(pickup, timelineStart))
    const endOffset = Math.min(totalDays, differenceInDays(returnD, timelineStart) + 1)

    const left = (startOffset / totalDays) * 100
    const width = Math.max(((endOffset - startOffset) / totalDays) * 100, 1)

    return { left: `${left}%`, width: `${width}%` }
  }

  // Today line position
  const todayPosition = useMemo(() => {
    const timelineStart = startOfDay(startDate)
    const today = startOfDay(new Date())
    let timelineEnd

    switch (viewMode) {
      case '1D': timelineEnd = addDays(timelineStart, 1); break
      case '1W': timelineEnd = addDays(timelineStart, 7); break
      case '1M': timelineEnd = addDays(endOfMonth(timelineStart), 1); break
      case '3M': timelineEnd = addMonths(timelineStart, 3); break
      default: timelineEnd = addDays(timelineStart, 7)
    }

    const totalDays = differenceInDays(timelineEnd, timelineStart) || 1
    const offset = differenceInDays(today, timelineStart)
    if (offset < 0 || offset > totalDays) return null
    return `${(offset / totalDays) * 100}%`
  }, [viewMode, startDate])

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-b bg-muted/30 text-xs">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={cn('h-3 w-3 rounded-sm', color)} />
            <span className="text-muted-foreground">{STATUS_LABELS[status]}</span>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header row */}
          <div className="flex border-b bg-muted/20 sticky top-0 z-10">
            <div className="w-52 shrink-0 px-3 py-2 font-medium text-xs text-muted-foreground border-r">
              Product
            </div>
            <div className="flex-1 flex">
              {columns.map((col) => (
                <div
                  key={col.key}
                  className={cn(
                    'flex-1 text-center text-[11px] py-2 border-r last:border-r-0',
                    col.isToday && 'bg-primary/10 font-bold',
                    col.isWeekend && 'bg-muted/40',
                    cellWidth
                  )}
                >
                  <div className={col.isToday ? 'text-primary' : 'text-muted-foreground'}>
                    {col.label}
                  </div>
                  {col.sublabel && (
                    <div className="text-[9px] text-muted-foreground/60">{col.sublabel}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Product rows */}
          {productRows.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No reservations in this time range
            </div>
          ) : (
            productRows.map((row) => (
              <div key={row.productId} className="flex border-b last:border-b-0 hover:bg-muted/10">
                <div className="w-52 shrink-0 px-3 py-3 border-r">
                  <div className="text-sm font-medium truncate">{row.productName}</div>
                  <div className="text-[10px] text-muted-foreground">{row.categoryName}</div>
                </div>
                <div className="flex-1 relative py-1.5" style={{ minHeight: '44px' }}>
                  {/* Today line */}
                  {todayPosition && (
                    <div
                      className="absolute top-0 bottom-0 w-px bg-red-500/60 z-20"
                      style={{ left: todayPosition }}
                    />
                  )}

                  {/* Reservation bars */}
                  {row.reservations.map((res, i) => {
                    const barStyle = getBarStyle(res.pickup_date, res.return_date)
                    const statusColor = STATUS_COLORS[res.request_status] || STATUS_COLORS.pending

                    return (
                      <div
                        key={res.id || i}
                        className={cn(
                          'absolute h-7 rounded-sm flex items-center px-1.5 text-[10px] text-white font-medium cursor-default group',
                          statusColor
                        )}
                        style={{
                          ...barStyle,
                          top: `${4 + i * 32}px`,
                        }}
                        title={`${res.request_user_name || 'Unknown'} — ${res.request_project_name || 'No project'}\n${res.pickup_date} → ${res.return_date}\nQty: ${res.quantity}`}
                      >
                        <span className="truncate">
                          {res.request_user_name ? `${res.request_user_name} — ` : ''}{res.request_project_name || `Qty ${res.quantity}`}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
