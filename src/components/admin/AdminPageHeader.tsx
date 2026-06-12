import { motion } from 'motion/react'

/**
 * Admin page header — clean and simple.
 *
 * Props:
 *   title       — main page title
 *   description — small subtitle / counter
 *   section     — optional uppercase eyebrow
 *   children    — top-right action slot
 */
export function AdminPageHeader({ title, description, section, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pt-8 pb-6 mb-6">
      <div className="min-w-0">
        {section && (
          <motion.p
            className="text-xs font-medium text-muted-foreground/70 mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {section}
          </motion.p>
        )}
        <motion.h1
          className="text-3xl font-display font-semibold tracking-tight leading-tight"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {title}
        </motion.h1>
        {description && (
          <motion.p
            className="text-muted-foreground text-sm mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.25 }}
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
