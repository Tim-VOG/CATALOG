import { MapPin, Navigation } from 'lucide-react'
import { useAppSettings } from '@/hooks/use-settings'
import { cn } from '@/lib/utils'

/**
 * Shows where to pick up / return equipment: a name, written
 * directions and (if configured) a floor-plan image with a pulsing
 * pin. Reads the app-wide pickup point from app_settings. Renders
 * nothing if nothing has been configured yet.
 *
 * `compact` drops the heading for embedding inside another card.
 */
export function PickupPointMap({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { data: settings } = useAppSettings()

  const name = settings?.pickup_location_name
  const directions = settings?.pickup_directions
  const mapUrl = settings?.pickup_map_url
  const pinX = settings?.pickup_pin_x
  const pinY = settings?.pickup_pin_y

  // Nothing configured → render nothing (callers can place it freely).
  if (!name && !directions && !mapUrl) return null

  return (
    <div className={cn('rounded-2xl border border-border/50 bg-card overflow-hidden', className)}>
      {!compact && (
        <div className="flex items-center gap-2 px-5 pt-5 pb-1">
          <MapPin className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">Where to pick up</h3>
        </div>
      )}

      <div className="p-5 pt-3 space-y-3">
        {name && (
          <p className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            {name}
          </p>
        )}

        {mapUrl && (
          <div className="relative rounded-xl overflow-hidden border border-border/50 bg-muted/30">
            <img src={mapUrl} alt="Floor plan" className="w-full block" />
            {pinX != null && pinY != null && (
              <span
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${pinX}%`, top: `${pinY}%` }}
              >
                <span className="relative flex h-5 w-5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-primary/50 animate-ping" />
                  <span className="relative inline-flex h-5 w-5 rounded-full bg-primary border-2 border-white shadow items-center justify-center">
                    <MapPin className="h-3 w-3 text-white" />
                  </span>
                </span>
              </span>
            )}
          </div>
        )}

        {directions && (
          <p className="text-xs text-muted-foreground flex items-start gap-2 leading-relaxed">
            <Navigation className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span className="whitespace-pre-line">{directions}</span>
          </p>
        )}
      </div>
    </div>
  )
}
