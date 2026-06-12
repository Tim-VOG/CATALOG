import * as React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground shadow',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground shadow',
        outline: 'text-foreground',
        success: 'border-transparent bg-success text-white shadow',
        warning: 'border-transparent bg-warning text-white shadow',
        glow: 'border-transparent bg-primary text-primary-foreground shadow-glow-primary',
        'glow-success': 'border-transparent bg-success text-white shadow-[0_0_12px_rgba(16,185,129,0.3)]',
        'glow-destructive': 'border-transparent bg-destructive text-white shadow-[0_0_12px_rgba(239,68,68,0.3)]',
        'soft-primary': 'border-primary/20 bg-primary/10 text-primary',
        'soft-success': 'border-success/20 bg-success/10 text-success',
        'soft-warning': 'border-warning/20 bg-warning/10 text-warning',
        'soft-destructive': 'border-destructive/20 bg-destructive/10 text-destructive',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

function Badge({ className, variant, dot, children, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span className="relative mr-1.5 flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-40" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
        </span>
      )}
      {children}
    </div>
  )
}

export { Badge, badgeVariants }
