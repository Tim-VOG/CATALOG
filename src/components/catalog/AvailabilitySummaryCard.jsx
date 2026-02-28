import { CalendarDays, ShoppingCart, Settings2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function AvailabilitySummaryCard({
  available,
  totalStock,
  onAddToCart,
  onConfigure,
  needsConfig = false,
  disabled = false,
}) {
  const stockVariant = available > 1
    ? 'success'
    : available === 1
      ? 'warning'
      : 'destructive'

  const stockLabel = available > 0
    ? `${available} / ${totalStock} available`
    : 'Out of stock'

  const handleCTA = () => {
    if (needsConfig) {
      onConfigure?.()
    } else {
      onAddToCart?.()
    }
  }

  const scrollToCalendar = () => {
    document.getElementById('availability-calendar')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  return (
    <Card variant="glass" spotlight className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Availability</span>
          <Badge variant={stockVariant} className="text-[11px]">
            {stockLabel}
          </Badge>
        </div>

        {/* Microcopy */}
        <p className="text-xs text-muted-foreground">
          Choose your dates in the calendar below to check availability for your period.
        </p>

        {/* View calendar link */}
        <button
          type="button"
          onClick={scrollToCalendar}
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <CalendarDays className="h-3.5 w-3.5" />
          View calendar
        </button>

        {/* CTA */}
        <Button
          className={cn(
            'w-full gap-2 rounded-full font-semibold',
            available > 0 && !needsConfig && 'bg-primary hover:bg-primary/90',
          )}
          onClick={handleCTA}
          disabled={disabled || available <= 0}
        >
          {available <= 0 ? (
            'Unavailable'
          ) : needsConfig ? (
            <>
              <Settings2 className="h-4 w-4" />
              Configure & Reserve
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4" />
              Add to Cart
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
