import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

/**
 * EmptyState — shown when a list/page has no data.
 *
 * Props:
 *   icon       — Lucide icon component
 *   title      — Heading text
 *   description — Subtitle text
 *   action     — { label: string, onClick: fn } — optional CTA button
 *   children   — fallback for custom content below the description
 */
export function EmptyState({ icon: Icon, title, description, action, children, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 gap-4 text-center', className)}>
      {Icon && (
        <div className="flex items-center justify-center h-20 w-20 rounded-full bg-muted/50">
          <Icon className="h-10 w-10 text-muted-foreground/60" />
        </div>
      )}
      <div>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        {description && <p className="text-muted-foreground mt-1 max-w-sm">{description}</p>}
      </div>
      {action && (
        <Button onClick={action.onClick} className="gap-2">
          {action.label}
        </Button>
      )}
      {children}
    </div>
  )
}
