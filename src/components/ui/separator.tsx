import * as React from 'react'
import { cn } from '@/lib/utils'

const Separator = React.forwardRef<any, any>(({ className, orientation = 'horizontal', decorative = true, ...props }: any, ref: any) => (
  <div
    ref={ref}
    role={decorative ? 'none' : 'separator'}
    aria-orientation={orientation}
    className={cn(
      'shrink-0 bg-border',
      orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
      className
    )}
    {...props}
  />
))
Separator.displayName = 'Separator'

export { Separator }
