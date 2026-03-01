import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="flex items-center justify-center min-h-[70vh] relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-dot-grid opacity-20 pointer-events-none" />
      <motion.div
        className="absolute top-[20%] left-[15%] w-[300px] h-[300px] rounded-full bg-primary/8 blur-[80px] pointer-events-none"
        animate={{ x: [0, 30, -20, 0], y: [0, -20, 15, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[20%] right-[15%] w-[250px] h-[250px] rounded-full bg-accent/8 blur-[70px] pointer-events-none"
        animate={{ x: [0, -20, 15, 0], y: [0, 15, -10, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex flex-col items-center text-center gap-6 relative z-10"
      >
        {/* Large 404 text */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
        >
          <span className="text-[120px] sm:text-[160px] font-display font-black leading-none text-gradient-primary opacity-80">
            404
          </span>
        </motion.div>

        {/* Icon with gradient bg */}
        <motion.div
          className="relative flex items-center justify-center h-20 w-20 -mt-4"
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/15 to-accent/10" />
          <div className="absolute inset-1 rounded-full bg-card/80" />
          <Home className="relative h-8 w-8 text-muted-foreground/60" />
        </motion.div>

        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Page not found</h1>
          <p className="text-muted-foreground mt-2 max-w-sm">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex gap-3">
          <Link to="/catalog">
            <Button variant="gradient" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Go to Catalog
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
