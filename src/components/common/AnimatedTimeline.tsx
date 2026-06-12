import { motion } from 'motion/react'
import { Clock } from 'lucide-react'

const formatDateTime = (d) =>
  new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/**
 * AnimatedTimeline — staggered animated timeline with nodes and connecting lines.
 *
 * Props:
 *   events: Array<{ label: string, date: string, icon?: LucideIcon }>
 */
export function AnimatedTimeline({ events = [] }) {
  if (events.length === 0) return null

  return (
    <div className="space-y-0">
      {events.map((event, i) => {
        const Icon = event.icon || Clock
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.1, ease: 'easeOut' }}
            className="flex items-start gap-3"
          >
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: i * 0.1 }}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary"
              >
                <Icon className="h-3 w-3" />
              </motion.div>
              {i < events.length - 1 && (
                <motion.div
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.3, delay: i * 0.1 + 0.15 }}
                  style={{ originY: 0 }}
                  className="w-px h-4 bg-border"
                />
              )}
            </div>
            <div className="text-sm pb-4 last:pb-0">
              <p className="font-medium">{event.label}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(event.date)}</p>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
