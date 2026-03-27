import { motion } from 'motion/react'

export function AdminPageHeader({ title, description, children }) {
  return (
    <div className="flex items-end justify-between pt-6 pb-6 mb-6 border-b border-border/20">
      <div>
        <motion.h1
          className="text-2xl font-display font-bold tracking-tight"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {title}
        </motion.h1>
        {description && (
          <motion.p
            className="text-muted-foreground text-sm mt-1"
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
