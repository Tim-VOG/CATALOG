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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={cn('flex flex-col items-center justify-center py-16 gap-5 text-center rounded-2xl relative overflow-hidden', className)}
    >
      {/* Decorative background */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 to-transparent pointer-events-none rounded-2xl" />

      {Icon && (
        <motion.div
          className="relative flex items-center justify-center h-24 w-24"
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* Gradient circle behind icon */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/10 to-accent/5" />
          <div className="absolute inset-1 rounded-full bg-card/80" />
          <Icon className="relative h-10 w-10 text-muted-foreground/60" />
        </motion.div>
      )}
      <div className="relative">
        <h2 className="text-2xl font-display font-semibold text-foreground">{title}</h2>
        {description && <p className="text-muted-foreground mt-1.5 max-w-sm">{description}</p>}
      </div>
      {action && (
        <Button onClick={action.onClick} className="gap-2 relative">
          {action.label}
        </Button>
      )}
      {children && <div className="relative">{children}</div>}
    </motion.div>
  )
}
