import { motion } from 'motion/react'

/**
 * Admin page header — futuristic look shared across every admin page.
 *
 * Props:
 *   title       — main page title
 *   description — small subtitle / counter
 *   section     — optional bracket eyebrow (e.g. 'REQUESTS', 'INVENTORY')
 *   children    — top-right action slot
 */
export function AdminPageHeader({ title, description, section, children }) {
  return (
    <div className="relative pt-7 pb-5 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="min-w-0">
          {section && (
            <motion.p
              className="text-[10px] font-mono font-semibold uppercase tracking-[0.22em] text-primary/80 mb-2"
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
            >
              <span className="text-primary/40">[</span>
              {section}
              <span className="text-primary/40">]</span>
            </motion.p>
          )}
          <motion.h1
            className="text-2xl sm:text-[28px] font-display font-bold tracking-tight leading-tight"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {title}
          </motion.h1>
          {description && (
            <motion.p
              className="text-muted-foreground text-sm mt-2"
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
      {/* Gradient bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-primary/40 via-border/40 to-transparent" />
    </div>
  )
}
