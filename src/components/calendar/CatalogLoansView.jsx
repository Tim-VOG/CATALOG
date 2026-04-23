import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  format, addDays, addMonths, subMonths, differenceInDays,
  startOfDay, startOfMonth, endOfMonth, eachDayOfInterval,
  eachWeekOfInterval, isToday, subWeeks, addWeeks,
} from 'date-fns'
import {
  ChevronLeft, ChevronRight, CalendarRange,
  Package, Search, Inbox,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/common/UserAvatar'
import { useBatchLoanRequestItems } from '@/hooks/use-loan-requests'
import { cn } from '@/lib/utils'

// ── Status colors for bars ──
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

const VIEW_MODES = [
  { key: '1W', label: '1 Week' },
  { key: '1M', label: '1 Month' },
  { key: '3M', label: '3 Months' },
]

const STATUS_PILLS = ['pending', 'in_progress', 'ready']

export function CatalogLoansView({ events }) {
  const [viewMode, setViewMode] = useState('1M')
  const [baseDate, setBaseDate] = useState(new Date())
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState([])

  // ── Compute time range ──
  const { startDate, endDate, rangeLabel } = useMemo(() => {
    const today = startOfDay(baseDate)
    let start, end, label

    switch (viewMode) {
      case '1W':
        start = startOfDay(today)
        end = addDays(start, 6)
        label = `${format(start, 'd MMM')} — ${format(end, 'd MMM yyyy')}`
        break
      case '1M':
        start = startOfMonth(today)
        end = endOfMonth(start)
        label = format(start, 'MMMM yyyy')
        break
      case '3M':
        start = startOfMonth(today)
        end = addMonths(start, 3)
        label = `${format(start, 'MMM yyyy')} — ${format(addMonths(start, 2), 'MMM yyyy')}`
        break
      default:
        start = today
        end = addDays(today, 7)
        label = ''
    }
    return { startDate: start, endDate: end, rangeLabel: label }
  }, [viewMode, baseDate])

  // ── Navigation ──
  const navigate = (direction) => {
    setBaseDate((prev) => {
      switch (viewMode) {
        case '1W': return direction > 0 ? addWeeks(prev, 1) : subWeeks(prev, 1)
        case '1M': return direction > 0 ? addMonths(prev, 1) : subMonths(prev, 1)
        case '3M': return direction > 0 ? addMonths(prev, 3) : subMonths(prev, 3)
        default: return prev
      }
    })
  }

  const goToToday = () => setBaseDate(new Date())

  // ── Column headers ──
  const { columns, cellWidth } = useMemo(() => {
    const start = startOfDay(startDate)
    let cols = []
    let width

    switch (viewMode) {
      case '1W': {
        const days = eachDayOfInterval({ start, end: addDays(start, 6) })
        cols = days.map((d) => ({
          key: format(d, 'yyyy-MM-dd'),
          label: format(d, 'EEE d'),
          date: d,
          isToday: isToday(d),
        }))
        width = 'min-w-[100px]'
        break
      }
      case '1M': {
        const mEnd = endOfMonth(start)
        const days = eachDayOfInterval({ start, end: mEnd })
        cols = days.map((d) => ({
          key: format(d, 'yyyy-MM-dd'),
          label: format(d, 'd'),
          sublabel: format(d, 'EEE'),
          date: d,
          isToday: isToday(d),
          isWeekend: d.getDay() === 0 || d.getDay() === 6,
        }))
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
        width = 'min-w-[80px]'
        break
      }
      default:
        break
    }
    return { columns: cols, cellWidth: width }
  }, [viewMode, startDate])

  // ── Filter catalog events that overlap the timeline ──
  const catalogEvents = useMemo(() => {
    let result = events.filter((ev) => {
      if (ev.type !== 'catalog') return false
      if (!ev.startDate || !ev.endDate) return false
      const evStart = startOfDay(ev.startDate)
      const evEnd = startOfDay(ev.endDate)
      const rangeStart = startOfDay(startDate)
      const rangeEnd = startOfDay(endDate)
      return evStart <= rangeEnd && evEnd >= rangeStart
    })
    if (statusFilter.length > 0) {
      result = result.filter((ev) => statusFilter.includes(ev.status))
    }
    return result
  }, [events, startDate, endDate, statusFilter])

  // ── Build event lookup by request ID ──
  const eventByRequestId = useMemo(() => {
    const map = new Map()
    for (const ev of catalogEvents) {
      if (ev.original?.id) map.set(ev.original.id, ev)
    }
    return map
  }, [catalogEvents])

  // ── Fetch items for visible catalog requests ──
  const requestIds = useMemo(
    () => catalogEvents.map((ev) => ev.original?.id).filter(Boolean),
    [catalogEvents],
  )
  const { data: rawItems = [] } = useBatchLoanRequestItems(requestIds)

  // ── Merge items with request/event data and apply search ──
  const itemEvents = useMemo(() => {
    let merged = rawItems.map((item) => {
      const ev = eventByRequestId.get(item.request_id)
      return {
        itemId: item.id,
        productId: item.product_id,
        productName: item.product_name || 'Unknown',
        categoryName: item.category_name || '',
        categoryColor: item.category_color || '#6b7280',
        quantity: item.quantity,
        startDate: ev?.startDate,
        endDate: ev?.endDate,
        status: ev?.status || 'pending',
        userName: ev?.userName || 'Unknown',
        userAvatar: ev?.userAvatar,
        adminLinkTo: ev?.adminLinkTo || (ev?.original?.id ? `/admin/requests/${ev.original.id}` : '#'),
        requestId: item.request_id,
        projectName: ev?.title || '',
      }
    }).filter((item) => item.startDate && item.endDate)

    if (search) {
      const q = search.toLowerCase()
      merged = merged.filter(
        (item) =>
          item.productName.toLowerCase().includes(q) ||
          item.userName.toLowerCase().includes(q) ||
          item.categoryName.toLowerCase().includes(q) ||
          item.projectName.toLowerCase().includes(q),
      )
    }
    return merged
  }, [rawItems, eventByRequestId, search])

  // ── Group by product ──
  const productRows = useMemo(() => {
    const map = new Map()
    for (const item of itemEvents) {
      if (!map.has(item.productId)) {
        map.set(item.productId, {
          productId: item.productId,
          productName: item.productName,
          categoryName: item.categoryName,
          categoryColor: item.categoryColor,
          reservations: [],
        })
      }
      map.get(item.productId).reservations.push(item)
    }
    return Array.from(map.values()).sort((a, b) => a.productName.localeCompare(b.productName))
  }, [itemEvents])

  // ── Bar position calculation ──
  const getBarStyle = (pickupDate, returnDate) => {
    const timelineStart = startOfDay(startDate)
    let timelineEnd

    switch (viewMode) {
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
    const width = Math.max(((endOffset - startOffset) / totalDays) * 100, 2)

    return { left: `${left}%`, width: `${width}%` }
  }

  // ── Today line ──
  const todayPosition = useMemo(() => {
    const timelineStart = startOfDay(startDate)
    const today = startOfDay(new Date())
    let timelineEnd

    switch (viewMode) {
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

  const getRowHeight = (reservations) => Math.max(56, 14 + reservations.length * 36)

  const toggleStatus = (status) => {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    )
  }

  const totalLoans = catalogEvents.length

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="h-8 w-8 rounded-lg">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday} className="gap-1.5 text-xs">
            <CalendarRange className="h-3.5 w-3.5" />
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigate(1)} className="h-8 w-8 rounded-lg">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold ml-2">{rangeLabel}</span>
        </div>

        <div className="flex gap-1 bg-muted/40 rounded-full p-1 border">
          {VIEW_MODES.map(({ key, label }) => (
            <Button
              key={key}
              variant={viewMode === key ? 'default' : 'ghost'}
              size="sm"
              className={cn('h-7 text-xs px-3 rounded-full', viewMode === key && 'shadow-sm')}
              onClick={() => setViewMode(key)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Search + Status Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/20 border border-border/30 flex-1 max-w-md">
          <Search className="h-4 w-4 text-muted-foreground/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products, users..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_PILLS.map((status) => {
          const isActive = statusFilter.includes(status)
          const barColor = STATUS_COLORS[status] || ''
          return (
            <button
              key={status}
              onClick={() => toggleStatus(status)}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all duration-200',
                isActive
                  ? 'bg-foreground/10 text-foreground border-foreground/20 shadow-sm'
                  : 'bg-transparent text-muted-foreground/50 border-transparent hover:text-muted-foreground hover:bg-muted/30'
              )}
            >
              <span className={cn('h-2 w-2 rounded-full', barColor.split(' ')[0])} />
              {STATUS_LABELS[status]}
            </button>
          )
        })}
        {statusFilter.length > 0 && (
          <button
            onClick={() => setStatusFilter([])}
            className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground underline underline-offset-2 transition-colors ml-1"
          >
            Clear
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {totalLoans} loan{totalLoans !== 1 ? 's' : ''} &middot; {productRows.length} product{productRows.length !== 1 ? 's' : ''}
      </p>

      {/* Timeline */}
      <div className="border rounded-xl overflow-hidden bg-card shadow-card">
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-5 py-2.5 border-b bg-muted/20 text-xs">
          {Object.entries(STATUS_COLORS).filter(([k]) => ['pending', 'approved', 'picked_up', 'returned', 'completed'].includes(k)).map(([status, color]) => (
            <div key={status} className="flex items-center gap-2">
              <div className={cn('h-2.5 w-2.5 rounded-full', color.split(' ')[0])} />
              <span className="text-muted-foreground font-medium">{STATUS_LABELS[status]}</span>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto relative after:absolute after:right-0 after:top-0 after:bottom-0 after:w-8 after:bg-gradient-to-l after:from-background after:to-transparent after:pointer-events-none after:md:hidden after:z-10">
          <div className="min-w-[800px]">
            {/* Header row */}
            <div className="flex border-b bg-muted/10 sticky top-0 z-10">
              <div className="w-64 shrink-0 px-5 py-2.5 font-semibold text-xs text-muted-foreground uppercase tracking-wider border-r flex items-center gap-2">
                <Package className="h-3.5 w-3.5" />
                Product
              </div>
              <div className="flex-1 flex">
                {columns.map((col) => (
                  <div
                    key={col.key}
                    className={cn(
                      'flex-1 text-center text-[11px] py-2.5 border-r last:border-r-0 transition-colors',
                      col.isToday && 'bg-primary/10 font-bold',
                      col.isWeekend && 'bg-muted/30',
                      cellWidth,
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
              <div className="py-16 text-center">
                <Inbox className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No catalog loans in this period</p>
              </div>
            ) : (
              productRows.map((row, rowIndex) => {
                const rowHeight = getRowHeight(row.reservations)
                return (
                  <div
                    key={row.productId}
                    className={cn(
                      'flex border-b last:border-b-0 group/row hover:bg-muted/8 transition-colors',
                      rowIndex % 2 === 1 && 'bg-muted/5',
                    )}
                  >
                    {/* Product label (like PlanningTimeline) */}
                    <div className="w-64 shrink-0 px-5 py-3 border-r flex items-start gap-3">
                      <div
                        className="h-2 w-2 rounded-full mt-1.5 shrink-0"
                        style={{ backgroundColor: row.categoryColor }}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{row.productName}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{row.categoryName}</div>
                        <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                          {row.reservations.length} reservation{row.reservations.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    {/* Timeline area */}
                    <div className="flex-1 relative" style={{ minHeight: `${rowHeight}px` }}>
                      {/* Today line */}
                      {todayPosition && (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-red-500/50 z-20"
                          style={{ left: todayPosition }}
                        >
                          <div className="absolute -top-0 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                        </div>
                      )}

                      {/* Reservation bars — person names on bars */}
                      {row.reservations.map((item, i) => {
                        const barStyle = getBarStyle(item.startDate, item.endDate)
                        const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS.pending

                        return (
                          <Link
                            key={item.itemId}
                            to={item.adminLinkTo}
                            className={cn(
                              'absolute h-8 rounded-lg flex items-center px-2.5 gap-1.5 text-[10px] text-white font-medium',
                              'shadow-sm transition-all duration-150 cursor-pointer hover:scale-[1.02] hover:shadow-md',
                              statusColor,
                            )}
                            style={{
                              ...barStyle,
                              top: `${10 + i * 36}px`,
                            }}
                            title={`${item.userName} — ${item.productName}\n${format(item.startDate, 'dd MMM')} → ${format(item.endDate, 'dd MMM yyyy')}\nStatus: ${item.status}${item.projectName ? `\nProject: ${item.projectName}` : ''}`}
                          >
                            {item.userAvatar && (
                              <UserAvatar
                                avatarUrl={item.userAvatar}
                                firstName={item.userName?.split(' ')[0]}
                                lastName={item.userName?.split(' ')[1]}
                                size="sm"
                                className="h-5 w-5 text-[7px] shrink-0 ring-1 ring-white/30"
                              />
                            )}
                            <span className="truncate">
                              {item.userName}
                            </span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
