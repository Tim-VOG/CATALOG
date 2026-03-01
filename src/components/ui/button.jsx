import * as React from 'react'
import { cva } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer active:scale-[0.97]',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-lg hover:shadow-destructive/20',
        outline: 'border border-input bg-transparent shadow-sm hover:bg-muted hover:text-foreground hover:border-primary/30',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'hover:bg-muted hover:text-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        success: 'bg-success text-white shadow hover:bg-success/90 hover:shadow-lg hover:shadow-success/20',
        glow: 'bg-primary text-primary-foreground shadow-glow-primary hover:shadow-[0_0_30px_rgba(249,115,22,0.25)] hover:bg-primary/90',
        gradient: 'bg-gradient-to-r from-primary to-accent text-white shadow hover:shadow-lg hover:shadow-primary/20 hover:brightness-110',
        soft: 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/10',
      },
      size: {
        default: 'h-9 px-4 py-2 max-sm:h-11 max-sm:px-5',
        sm: 'h-8 rounded-md px-3 text-xs max-sm:h-9 max-sm:px-4',
        lg: 'h-10 rounded-md px-8 max-sm:h-12',
        icon: 'h-9 w-9 max-sm:h-11 max-sm:w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, loading, children, disabled, ...props }, ref) => {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
})
Button.displayName = 'Button'

export { Button, buttonVariants }
