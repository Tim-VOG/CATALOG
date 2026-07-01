import { useIsFetching } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'

/**
 * NavigationProgress — thin animated gradient bar at top of viewport.
 * Shows during React Query fetches. 2px tall, primary→accent gradient.
 */
export function NavigationProgress() {
  const isFetching = useIsFetching()

  return (
    <AnimatePresence>
      {isFetching > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed top-0 left-0 right-0 z-[100] h-[2px] overflow-hidden"
        >
          <div className="h-full w-full bg-gradient-to-r from-primary via-accent to-primary animate-progress-indeterminate" />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
