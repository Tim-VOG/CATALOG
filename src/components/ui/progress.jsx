import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cn } from '@/lib/utils'

const Progress = React.forwardRef(({ className, value, showLabel, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      'relative h-2 w-full overflow-hidden rounded-full bg-muted',
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out relative"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    >
      {/* Shimmer overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
      {/* Glow on leading edge */}
      <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-accent/50 to-transparent blur-sm" />
    </ProgressPrimitive.Indicator>
    {showLabel && value != null && (
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-foreground mix-blend-difference">
        {Math.round(value)}%
      </span>
    )}
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
