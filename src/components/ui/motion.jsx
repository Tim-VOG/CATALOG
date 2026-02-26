import * as React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'

// ── FadeIn ────────────────────────────────────────────────
// Apparition en fondu + léger translateY. Pour sections de page.
const FadeIn = React.forwardRef(
  ({ children, className, delay = 0, duration = 0.25, y = 8, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y }}
      transition={{ duration, delay, ease: 'easeOut' }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  ),
)
FadeIn.displayName = 'FadeIn'

// ── SlideIn ───────────────────────────────────────────────
// Glissement latéral pour panneaux / drawers.
const SLIDE_OFFSETS = { left: { x: -20 }, right: { x: 20 }, top: { y: -20 }, bottom: { y: 20 } }
const SlideIn = React.forwardRef(
  ({ children, className, from = 'right', duration = 0.2, ...props }, ref) => {
    const offset = SLIDE_OFFSETS[from]
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, ...offset }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        exit={{ opacity: 0, ...offset }}
        transition={{ duration, ease: 'easeOut' }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    )
  },
)
SlideIn.displayName = 'SlideIn'

// ── ScaleIn ───────────────────────────────────────────────
// Scale 0.95→1 pour modales / dialogs.
const ScaleIn = React.forwardRef(
  ({ children, className, duration = 0.2, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration, ease: 'easeOut' }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  ),
)
ScaleIn.displayName = 'ScaleIn'

// ── AnimateList ───────────────────────────────────────────
// Animation staggered pour listes d'éléments.
function AnimateList({ children, className, stagger = 0.04, ...props }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: stagger } },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

const AnimateListItem = React.forwardRef(
  ({ children, className, ...props }, ref) => (
    <motion.div
      ref={ref}
      variants={{
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  ),
)
AnimateListItem.displayName = 'AnimateListItem'

// ── PageTransition ────────────────────────────────────────
// Wrapper pour transitions entre routes.
function PageTransition({ children, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ── Fade overlay ──────────────────────────────────────────
// Pour les overlays de dialog / dropdown.
const FadeOverlay = React.forwardRef(
  ({ className, duration = 0.15, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration }}
      className={className}
      {...props}
    />
  ),
)
FadeOverlay.displayName = 'FadeOverlay'

export {
  AnimatePresence,
  FadeIn,
  SlideIn,
  ScaleIn,
  AnimateList,
  AnimateListItem,
  PageTransition,
  FadeOverlay,
}
