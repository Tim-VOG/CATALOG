import { useState, useMemo } from 'react'
import {
  format, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths,
  startOfWeek, startOfMonth, startOfDay,
} from 'date-fns'
import { usePlanning } from '@/hooks/use-planning'
import { PlanningTimeline } from '@/components/admin/PlanningTimeline'
import { PendingExtensionsBanner } from '@/components/admin/PendingExtensionsBanner'
import { ChevronLeft, ChevronRight, CalendarRange } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageLoading } from '@/components/common/LoadingSpinner'

const VIEW_MODES = [
  { key: '1D', label: '1 Day' },
  { key: '1W', label: '1 Week' },
  { key: '1M', label: '1 Month' },
  { key: '3M', label: '3 Months' },
]

export function AdminPlanningPage() {
  const [viewMode, setViewMode] = useState('1M')
  const [baseDate, setBaseDate] = useState(new Date())

  // Calculate start/end dates based on view mode
  const { startDate, endDate, rangeLabel } = useMemo(() => {
    const today = startOfDay(baseDate)
    let start, end, label

    switch (viewMode) {
      case '1D':
        start = today
        end = today
        label = format(today, 'EEEE, d MMMM yyyy')
        break
      case '1W':
        start = startOfWeek(today, { weekStartsOn: 1 })
        end = addDays(start, 6)
        label = `${format(start, 'd MMM')} — ${format(end, 'd MMM yyyy')}`
        break
      case '1M':
        start = startOfMonth(today)
        end = addMonths(start, 1)
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

    return {
      startDate: start,
      endDate: end,
      rangeLabel: label,
    }
  }, [viewMode, baseDate])

  const { data: planningItems = [], isLoading } = usePlanning(
    format(startDate, 'yyyy-MM-dd'),
    format(endDate, 'yyyy-MM-dd')
  )

  const navigate = (direction) => {
    setBaseDate((prev) => {
      switch (viewMode) {
        case '1D': return direction > 0 ? addDays(prev, 1) : subDays(prev, 1)
        case '1W': return direction > 0 ? addWeeks(prev, 1) : subWeeks(prev, 1)
        case '1M': return direction > 0 ? addMonths(prev, 1) : subMonths(prev, 1)
        case '3M': return direction > 0 ? addMonths(prev, 3) : subMonths(prev, 3)
        default: return prev
      }
    })
  }

  const goToToday = () => setBaseDate(new Date())

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Planning</h1>
        <p className="text-muted-foreground mt-1">Equipment reservation timeline</p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday} className="gap-1">
            <CalendarRange className="h-3.5 w-3.5" />
            Today
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium ml-2">{rangeLabel}</span>
        </div>

        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {VIEW_MODES.map(({ key, label }) => (
            <Button
              key={key}
              variant={viewMode === key ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 text-xs px-3"
              onClick={() => setViewMode(key)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <PendingExtensionsBanner />

      {isLoading ? (
        <PageLoading />
      ) : (
        <PlanningTimeline
          items={planningItems}
          viewMode={viewMode}
          startDate={startDate}
        />
      )}
    </div>
  )
}
