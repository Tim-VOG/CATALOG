import * as React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const cardVariants = cva(
  'rounded-lg text-card-foreground',
  {
    variants: {
      variant: {
        default: 'border bg-card shadow',
        glass: 'bg-card/60 backdrop-blur-lg border border-white/10 shadow-lg',
        elevated: 'bg-card border-0 shadow-card',
        gradient: 'border bg-gradient-surface shadow',
        interactive: 'border bg-card shadow hover-glow transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated hover:border-primary/20 active:scale-[0.98]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

const Card = React.forwardRef(({ className, variant, hoverable, spotlight, tilt, ...props }, ref) => {
  const innerRef = React.useRef(null)
  const cardRef = ref || innerRef

  const handleMouseMove = React.useCallback((e) => {
    const el = cardRef.current || e.currentTarget
    const rect = el.getBoundingClientRect()

    if (spotlight) {
      el.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`)
      el.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`)
    }

    if (tilt) {
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const centerX = rect.width / 2
      const centerY = rect.height / 2
      const rotateX = ((y - centerY) / centerY) * -4
      const rotateY = ((x - centerX) / centerX) * 4
      el.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`
    }
  }, [spotlight, tilt, cardRef])

  const handleMouseLeave = React.useCallback(() => {
    if (tilt) {
      const el = cardRef.current
      if (el) el.style.transform = ''
    }
  }, [tilt, cardRef])

  return (
    <div
      ref={cardRef}
      onMouseMove={(spotlight || tilt) ? handleMouseMove : undefined}
      onMouseLeave={tilt ? handleMouseLeave : undefined}
      className={cn(
        cardVariants({ variant }),
        hoverable && 'transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 active:scale-[0.98]',
        spotlight && 'hover-glow',
        tilt && 'transition-transform duration-200 ease-out will-change-transform',
        className
      )}
      {...props}
    />
  )
})
Card.displayName = 'Card'

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
))
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn('font-semibold leading-none tracking-tight', className)} {...props} />
))
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
))
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
))
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
))
CardFooter.displayName = 'CardFooter'

export { Card, cardVariants, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
