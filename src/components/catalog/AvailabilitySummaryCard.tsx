import { useState } from 'react'
import { CalendarDays, Maximize2, Minimize2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AvailabilityCalendar } from '@/components/calendar/AvailabilityCalendar'
import { cn } from '@/lib/utils'

export function AvailabilitySummaryCard({
  available,
  totalStock,
  reservations = [],
  className,
}) {
  const [expanded, setExpanded] = useState(false)

  const stockVariant = available > 1
    ? 'success'
    : available === 1
      ? 'warning'
      : 'destructive'

  const stockLabel = available > 0
    ? `${available} / ${totalStock}`
    : 'Unavailable'

  return (
    <Card variant="glass" spotlight className={cn('overflow-hidden', className)}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Availability</span>
          </div>
          <Badge variant={stockVariant} className="text-[11px]">
            {stockLabel}
          </Badge>
        </div>

        {/* Microcopy */}
        <p className="text-xs text-muted-foreground">
          Choose your available dates to reserve
        </p>

        {/* Embedded compact calendar */}
        <div className="border-t border-border/30 pt-3">
          <AvailabilityCalendar
            reservations={reservations}
            totalStock={totalStock}
            compact={!expanded}
          />
        </div>

        {/* Toggle full view */}
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center justify-center gap-1.5 w-full text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors pt-1"
        >
          {expanded ? (
            <>
              <Minimize2 className="h-3 w-3" /> Compact view
            </>
          ) : (
            <>
              <Maximize2 className="h-3 w-3" /> Full month view
            </>
          )}
        </button>
      </CardContent>
    </Card>
  )
}
