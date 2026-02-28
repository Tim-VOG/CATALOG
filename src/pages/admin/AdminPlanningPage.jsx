import { useState, useMemo } from 'react'
import {
  format, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths,
  startOfWeek, startOfMonth, startOfDay,
} from 'date-fns'
import { usePlanning } from '@/hooks/use-planning'
import { useProducts } from '@/hooks/use-products'
import { PlanningTimeline } from '@/components/admin/PlanningTimeline'
import { PendingExtensionsBanner } from '@/components/admin/PendingExtensionsBanner'
import { ChevronLeft, ChevronRight, CalendarRange } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { cn } from '@/lib/utils'

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

  const { data: planningItems = [], isLoading: planningLoading, isError } = usePlanning(
    format(startDate, 'yyyy-MM-dd'),
    format(endDate, 'yyyy-MM-dd')
  )

  // Always fetch products so we can show them even without reservations
  const { data: allProducts = [], isLoading: productsLoading } = useProducts()

  const isLoading = planningLoading || productsLoading

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
      <AdminPageHeader title="Planning" description="Equipment reservation timeline" />

      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)} aria-label="Previous period">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday} className="gap-1.5">
            <CalendarRange className="h-3.5 w-3.5" />
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigate(1)} aria-label="Next period">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold ml-3">{rangeLabel}</span>
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

      <PendingExtensionsBanner />

      {isLoading ? (
        <PageLoading />
      ) : isError ? (
        <div className="text-center py-16 text-muted-foreground">
          <p>Failed to load planning data. Try adjusting the date range or refreshing the page.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={goToToday}>Reset to Today</Button>
        </div>
      ) : (
        <PlanningTimeline
          items={planningItems}
          allProducts={allProducts}
          viewMode={viewMode}
          startDate={startDate}
        />
      )}
    </div>
  )
}
