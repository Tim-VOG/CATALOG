import { motion } from 'motion/react'
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
    <div className={cn('flex flex-col items-center justify-center py-16 gap-5 text-center bg-muted/20 rounded-xl', className)}>
      {Icon && (
        <motion.div
          className="flex items-center justify-center h-24 w-24 rounded-full bg-muted/50"
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Icon className="h-12 w-12 text-muted-foreground/60" />
        </motion.div>
      )}
      <div>
        <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
        {description && <p className="text-muted-foreground mt-1.5 max-w-sm">{description}</p>}
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
