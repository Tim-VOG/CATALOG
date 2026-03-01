import * as React from 'react'
import { motion, AnimatePresence, useInView, useSpring, useMotionValue, useTransform, useScroll } from 'motion/react'
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
// Wrapper pour transitions entre routes. Supporte direction forward/back.
function PageTransition({ children, className, direction = 'forward' }) {
  const yOffset = direction === 'back' ? -8 : 8
  return (
    <motion.div
      initial={{ opacity: 0, y: yOffset, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -yOffset, filter: 'blur(4px)' }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
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

// ── ScrollReveal ─────────────────────────────────────────
// Configurable scroll-triggered animation with direction, distance, scale, rotate.
const REVEAL_DIRECTIONS = {
  up: { y: 30 },
  down: { y: -30 },
  left: { x: -40 },
  right: { x: 40 },
}

const ScrollReveal = React.forwardRef(
  ({
    children,
    className,
    direction = 'up',
    distance,
    delay = 0,
    duration = 0.6,
    scale = 1,
    rotate = 0,
    once = true,
    margin = '-80px',
    ...props
  }, ref) => {
    const innerRef = React.useRef(null)
    const combinedRef = ref || innerRef
    const isInView = useInView(combinedRef, { once, margin })

    const directionOffset = REVEAL_DIRECTIONS[direction] || REVEAL_DIRECTIONS.up
    const initialState = {
      opacity: 0,
      ...directionOffset,
      ...(distance != null && direction === 'up' && { y: distance }),
      ...(distance != null && direction === 'down' && { y: -distance }),
      ...(distance != null && direction === 'left' && { x: -distance }),
      ...(distance != null && direction === 'right' && { x: distance }),
      ...(scale !== 1 && { scale }),
      ...(rotate !== 0 && { rotate }),
    }

    return (
      <motion.div
        ref={combinedRef}
        initial={initialState}
        animate={isInView ? { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 } : initialState}
        transition={{
          duration,
          delay,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    )
  },
)
ScrollReveal.displayName = 'ScrollReveal'

// ── StaggerReveal ────────────────────────────────────────
// Container that staggers its children's reveal on scroll.
function StaggerReveal({
  children,
  className,
  stagger = 0.08,
  direction = 'up',
  duration = 0.5,
  margin = '-60px',
  ...props
}) {
  const ref = React.useRef(null)
  const isInView = useInView(ref, { once: true, margin })

  const dirOffset = REVEAL_DIRECTIONS[direction] || REVEAL_DIRECTIONS.up

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger } },
      }}
      className={className}
      {...props}
    >
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child
        return (
          <motion.div
            variants={{
              hidden: { opacity: 0, ...dirOffset },
              visible: {
                opacity: 1,
                x: 0,
                y: 0,
                transition: { duration, ease: [0.25, 0.46, 0.45, 0.94] },
              },
            }}
          >
            {child}
          </motion.div>
        )
      })}
    </motion.div>
  )
}

// ── ParallaxLayer ────────────────────────────────────────
// Scroll-linked parallax effect. speed < 1 = slower, > 1 = faster.
function ParallaxLayer({ children, className, speed = 0.5, ...props }) {
  const ref = React.useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  const y = useTransform(scrollYProgress, [0, 1], [speed * -60, speed * 60])

  return (
    <motion.div ref={ref} style={{ y }} className={className} {...props}>
      {children}
    </motion.div>
  )
}

// ── Magnetic ─────────────────────────────────────────────
// Wrapper that subtly follows cursor on hover. For buttons, icons.
function Magnetic({ children, className, strength = 0.3, ...props }) {
  const ref = React.useRef(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const smoothX = useSpring(x, { stiffness: 300, damping: 20 })
  const smoothY = useSpring(y, { stiffness: 300, damping: 20 })

  const handleMouseMove = React.useCallback((e) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    x.set((e.clientX - centerX) * strength)
    y.set((e.clientY - centerY) * strength)
  }, [x, y, strength])

  const handleMouseLeave = React.useCallback(() => {
    x.set(0)
    y.set(0)
  }, [x, y])

  return (
    <motion.div
      ref={ref}
      style={{ x: smoothX, y: smoothY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// ── CountUp ──────────────────────────────────────────────
// Enhanced animated counter with formatting (separators, prefix, suffix).
function CountUp({
  value,
  duration = 1.2,
  className,
  prefix = '',
  suffix = '',
  separator = ',',
  decimals = 0,
}) {
  const ref = React.useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })
  const motionValue = useMotionValue(0)
  const springValue = useSpring(motionValue, { duration: duration * 1000 })
  const display = useTransform(springValue, (v) => {
    const fixed = v.toFixed(decimals)
    if (!separator) return `${prefix}${fixed}${suffix}`
    const [int, dec] = fixed.split('.')
    const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, separator)
    return `${prefix}${formatted}${dec ? `.${dec}` : ''}${suffix}`
  })
  const [displayValue, setDisplayValue] = React.useState(`${prefix}0${suffix}`)

  React.useEffect(() => {
    if (isInView) motionValue.set(value)
  }, [value, motionValue, isInView])

  React.useEffect(() => {
    const unsubscribe = display.on('change', (v) => setDisplayValue(v))
    return unsubscribe
  }, [display])

  return <span ref={ref} className={className}>{displayValue}</span>
}

// ── TextReveal ───────────────────────────────────────────
// Text that reveals word by word on scroll.
function TextReveal({ text, className, stagger = 0.04, ...props }) {
  const ref = React.useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })

  const words = text.split(' ')

  return (
    <motion.span
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{ visible: { transition: { staggerChildren: stagger } } }}
      className={className}
      {...props}
    >
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          className="inline-block mr-[0.25em]"
          variants={{
            hidden: { opacity: 0, y: 12, filter: 'blur(4px)' },
            visible: {
              opacity: 1,
              y: 0,
              filter: 'blur(0px)',
              transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
            },
          }}
        >
          {word}
        </motion.span>
      ))}
    </motion.span>
  )
}

// ── AnimatedCounter (legacy, kept for backward compat) ───
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
  // Core re-exports
  AnimatePresence,
  motion,
  // Original primitives
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
  // New v2 primitives
  ScrollReveal,
  StaggerReveal,
  ParallaxLayer,
  Magnetic,
  CountUp,
  TextReveal,
}
