import * as React from 'react'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

const Checkbox = React.forwardRef(({ className, checked, onCheckedChange, ...props }, ref) => {
  const lastClick = React.useRef(0)

  return (
    <button
      ref={ref}
      role="checkbox"
      aria-checked={checked}
      type="button"
      className={cn(
        'peer h-4 w-4 shrink-0 rounded-sm border border-input shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        checked && 'bg-primary border-primary text-primary-foreground',
        className
      )}
      onClick={(e) => {
        e.stopPropagation()
        // Guard against <label> triggering a duplicate synthetic click
        const now = Date.now()
        if (now - lastClick.current < 50) return
        lastClick.current = now
        onCheckedChange?.(!checked)
      }}
      {...props}
    >
      {checked && <Check className="h-3 w-3 mx-auto" />}
    </button>
  )
})
Checkbox.displayName = 'Checkbox'

export { Checkbox }
