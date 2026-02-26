import * as React from 'react'
import { motion, AnimatePresence, useInView, useSpring, useMotionValue, useTransform } from 'motion/react'
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

// ── ScrollFadeIn ─────────────────────────────────────────
// Like FadeIn but viewport-triggered. For content below the fold.
const ScrollFadeIn = React.forwardRef(
  ({ children, className, delay = 0, duration = 0.4, y = 12, ...props }, ref) => {
    const innerRef = React.useRef(null)
    const combinedRef = ref || innerRef
    const isInView = useInView(combinedRef, { once: true, margin: '-60px' })
    return (
      <motion.div
        ref={combinedRef}
        initial={{ opacity: 0, y }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
        transition={{ duration, delay, ease: 'easeOut' }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    )
  },
)
ScrollFadeIn.displayName = 'ScrollFadeIn'

// ── AnimatedCounter ──────────────────────────────────────
// Spring-driven number counter that animates from 0 to value.
function AnimatedCounter({ value, duration = 1.2, className }) {
  const motionValue = useMotionValue(0)
  const springValue = useSpring(motionValue, { duration: duration * 1000 })
  const display = useTransform(springValue, (v) => Math.round(v))
  const [displayValue, setDisplayValue] = React.useState(0)

  React.useEffect(() => {
    motionValue.set(value)
  }, [value, motionValue])

  React.useEffect(() => {
    const unsubscribe = display.on('change', (v) => setDisplayValue(v))
    return unsubscribe
  }, [display])

  return <span className={className}>{displayValue}</span>
}

// ── ScalePop ─────────────────────────────────────────────
// For badge/count changes. Pops with spring physics.
function ScalePop({ children, className, motionKey }) {
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={motionKey}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.5, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        className={className}
      >
        {children}
      </motion.span>
    </AnimatePresence>
  )
}

// ── PressScale ───────────────────────────────────────────
// Wrapper with press feedback for interactive elements.
const PressScale = React.forwardRef(
  ({ children, className, scale = 0.97, ...props }, ref) => (
    <motion.div
      ref={ref}
      whileTap={{ scale }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  ),
)
PressScale.displayName = 'PressScale'

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
  ScrollFadeIn,
  AnimatedCounter,
  ScalePop,
  PressScale,
}
