import { motion } from 'motion/react'

export function AdminPageHeader({ title, description, children }) {
  return (
    <div className="sticky top-0 z-20 -mx-6 px-6 pt-6 pb-4 lg:-mx-10 lg:px-10 bg-background/60 backdrop-blur-xl backdrop-saturate-150 border-b border-primary/10 shadow-[0_1px_3px_0_rgb(var(--color-primary)/0.06)] mb-8 after:absolute after:bottom-0 after:inset-x-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-primary/20 after:to-transparent">
      <div className="flex items-center justify-between">
        <div>
          <motion.h1
            className="text-3xl font-display font-bold tracking-tight text-gradient-primary"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {title}
          </motion.h1>
          {description && (
            <motion.p
              className="text-muted-foreground mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.4 }}
            >
              {description}
            </motion.p>
          )}
          <motion.div
            className="mt-3 h-1 w-20 rounded-full bg-gradient-to-r from-primary to-accent"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{ originX: 0 }}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {children}
        </div>
      </div>
    </div>
  )
}
