import { motion } from 'motion/react'

/**
 * Standard admin page header.
 *
 * Props:
 *   title       — main page title
 *   description — small subtitle / counter
 *   section     — optional uppercase eyebrow (e.g. 'Requests', 'Inventory')
 *   children    — top-right action slot
 */
export function AdminPageHeader({ title, description, section, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pt-6 pb-5 mb-6 border-b border-border/30">
      <div className="min-w-0">
        {section && (
          <motion.p
            className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {section}
          </motion.p>
        )}
        <motion.h1
          className="text-2xl sm:text-[26px] font-display font-bold tracking-tight leading-tight"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {title}
        </motion.h1>
        {description && (
          <motion.p
            className="text-muted-foreground text-sm mt-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            {description}
          </motion.p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2 shrink-0">
          {children}
        </div>
      )}
    </div>
  )
}
