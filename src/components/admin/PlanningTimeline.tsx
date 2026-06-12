import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  format, addDays, addMonths, differenceInDays,
  startOfDay, endOfMonth, eachDayOfInterval,
  eachWeekOfInterval, isToday,
} from 'date-fns'
import { Package } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_COLORS = {
  pending: 'bg-amber-500/80 hover:bg-amber-500',
  in_progress: 'bg-blue-500/80 hover:bg-blue-500',
  ready: 'bg-emerald-500/80 hover:bg-emerald-500',
}

const STATUS_LABELS = {
  pending: 'Pending',
  in_progress: 'In Progress',
  ready: 'Ready',
}

/**
 * PlanningTimeline
 * Props:
 *   items       - Array of planning items (from usePlanning)
 *   allProducts - Optional array of all products (to show empty rows)
 *   viewMode    - '1D' | '1W' | '1M' | '3M'
 *   startDate   - Date object for the start of the visible range
 */
export function PlanningTimeline({ items = [], allProducts = [], viewMode, startDate }) {
  // Calculate the date columns based on view mode
  const { columns, endDate, cellWidth } = useMemo(() => {
    const start = startOfDay(startDate)
    let cols = []
    let end
    let width

    switch (viewMode) {
      case '1D': {
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
        const days = eachDayOfInterval({ start, end: addDays(start, 6) })
        cols = days.map((d) => ({
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
        const monthEnd = endOfMonth(start)
        const days = eachDayOfInterval({ start, end: monthEnd })
        cols = days.map((d) => ({
          key: format(d, 'yyyy-MM-dd'),
          label: format(d, 'd'),
          sublabel: format(d, 'EEE'),
          date: d,
          isToday: isToday(d),
          isWeekend: d.getDay() === 0 || d.getDay() === 6,
        }))
        end = monthEnd
        width = 'min-w-[38px]'
        break
      }
      case '3M': {
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

  // Group items by product + merge with allProducts for empty rows
  const productRows = useMemo(() => {
    const map = new Map()

    // First, populate from planning items (reservations)
    items.forEach((item) => {
      const key = item.product_id
      if (!map.has(key)) {
        map.set(key, {
          productId: key,
          productName: item.product_name || 'Unknown',
          categoryName: item.category_name || '',
          categoryColor: item.category_color || '#6b7280',
          imageUrl: item.product_image_url || '',
          reservations: [],
        })
      }
      map.get(key).reservations.push(item)
    })

    // Then, add products with no reservations if allProducts provided
    if (allProducts.length > 0) {
      for (const product of allProducts) {
        if (!map.has(product.id)) {
          map.set(product.id, {
            productId: product.id,
            productName: product.name || 'Unknown',
            categoryName: product.category_name || '',
            categoryColor: product.category_color || '#6b7280',
            imageUrl: product.image_url || '',
            reservations: [],
          })
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => a.productName.localeCompare(b.productName))
  }, [items, allProducts])

  // Calculate bar position as percentage of timeline
  const getBarStyle = (pickupDate, returnDate) => {
    const timelineStart = startOfDay(startDate)
    let timelineEnd

    switch (viewMode) {
      case '1D': timelineEnd = addDays(timelineStart, 1); break
      case '1W': timelineEnd = addDays(timelineStart, 7); break
      case '1M': timelineEnd = addDays(endOfMonth(timelineStart), 1); break
      case '3M': timelineEnd = addMonths(timelineStart, 3); break
      default: timelineEnd = addDays(timelineStart, 7)
    }

    const totalDays = differenceInDays(timelineEnd, timelineStart) || 1
    const pickup = startOfDay(new Date(pickupDate))
    const returnD = startOfDay(new Date(returnDate))

    const startOffset = Math.max(0, differenceInDays(pickup, timelineStart))
    const endOffset = Math.min(totalDays, differenceInDays(returnD, timelineStart) + 1)

    const left = (startOffset / totalDays) * 100
    const width = Math.max(((endOffset - startOffset) / totalDays) * 100, 1.5)

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

  // Calculate needed row height based on max stacked reservations
  const getRowHeight = (reservations) => {
    const count = reservations.length
    return Math.max(56, 14 + count * 36)
  }

  return (
    <div className="border rounded-xl overflow-hidden bg-card shadow-card">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-5 py-3 border-b bg-muted/20 text-xs">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-2">
            <div className={cn('h-3 w-3 rounded-full', color)} />
            <span className="text-muted-foreground font-medium">{STATUS_LABELS[status]}</span>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto relative after:absolute after:right-0 after:top-0 after:bottom-0 after:w-8 after:bg-gradient-to-l after:from-background after:to-transparent after:pointer-events-none after:md:hidden after:z-10">
        <div className="min-w-[800px]">
          {/* Header row */}
          <div className="flex border-b bg-muted/10 sticky top-0 z-10">
            <div className="w-64 shrink-0 px-5 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider border-r flex items-center gap-2">
              <Package className="h-3.5 w-3.5" />
              Product
            </div>
            <div className="flex-1 flex">
              {columns.map((col) => (
                <div
                  key={col.key}
                  className={cn(
                    'flex-1 text-center text-[11px] py-3 border-r last:border-r-0 transition-colors',
                    col.isToday && 'bg-primary/10 font-bold',
                    col.isWeekend && 'bg-muted/30',
                    cellWidth
                  )}
                >
                  <div className={col.isToday ? 'text-primary' : 'text-muted-foreground'}>
                    {col.label}
                  </div>
                  {col.sublabel && (
                    <div className={cn(
                      'text-[9px] mt-0.5',
                      col.isToday ? 'text-primary/70' : 'text-muted-foreground/50'
                    )}>{col.sublabel}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Product rows */}
          {productRows.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              No products found
            </div>
          ) : (
            productRows.map((row, rowIndex) => {
              const hasReservations = row.reservations.length > 0
              const rowHeight = hasReservations ? getRowHeight(row.reservations) : 56
              return (
                <div key={row.productId} className={cn('flex border-b last:border-b-0 group/row hover:bg-muted/8 transition-colors', rowIndex % 2 === 1 && 'bg-muted/5')}>
                  <div className="w-64 shrink-0 px-5 py-3 border-r flex items-start gap-3">
                    <div
                      className="h-2 w-2 rounded-full mt-1.5 shrink-0"
                      style={{ backgroundColor: row.categoryColor }}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{row.productName}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{row.categoryName}</div>
                      {hasReservations && (
                        <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                          {row.reservations.length} reservation{row.reservations.length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 relative" style={{ minHeight: `${rowHeight}px` }}>
                    {/* Today line */}
                    {todayPosition && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500/50 z-20"
                        style={{ left: todayPosition }}
                      >
                        <div className="absolute -top-0 left-1/2 -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                      </div>
                    )}

                    {/* Reservation bars */}
                    {row.reservations.map((res, i) => {
                      const barStyle = getBarStyle(res.pickup_date, res.return_date)
                      const statusColor = STATUS_COLORS[res.request_status] || STATUS_COLORS.pending

                      return (
                        <Link
                          key={res.id || i}
                          to={res.request_id ? `/admin/requests/${res.request_id}` : '#'}
                          className={cn(
                            'absolute h-8 rounded-lg flex items-center px-2.5 text-[10px] text-white font-medium',
                            'shadow-sm transition-all duration-150 cursor-pointer hover:scale-[1.02] hover:shadow-md',
                            statusColor
                          )}
                          style={{
                            ...barStyle,
                            top: `${10 + i * 36}px`,
                          }}
                          title={`${res.request_user_name || 'Unknown'} — ${res.request_project_name || 'No project'}\n${res.pickup_date} → ${res.return_date}\nQty: ${res.quantity}`}
                        >
                          <span className="truncate">
                            {res.request_user_name || `Qty ${res.quantity}`}
                          </span>
                        </Link>
                      )
                    })}

                    {/* Empty state indicator for products without reservations */}
                    {!hasReservations && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] text-muted-foreground/30 font-medium">Available</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
