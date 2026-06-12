import * as React from 'react'
import { cn } from '@/lib/utils'

const Avatar = React.forwardRef<any, any>(({ className, ...props }: any, ref: any) => (
  <span ref={ref} className={cn('relative flex h-8 w-8 shrink-0 overflow-hidden rounded-full', className)} {...props} />
))
Avatar.displayName = 'Avatar'

const AvatarImage = React.forwardRef<any, any>(({ className, alt = '', ...props }: any, ref: any) => (
  <img ref={ref} alt={alt} className={cn('aspect-square h-full w-full', className)} {...props} />
))
AvatarImage.displayName = 'AvatarImage'

const AvatarFallback = React.forwardRef<any, any>(({ className, ...props }: any, ref: any) => (
  <span ref={ref} className={cn('flex h-full w-full items-center justify-center rounded-full bg-muted text-xs font-medium', className)} {...props} />
))
AvatarFallback.displayName = 'AvatarFallback'

export { Avatar, AvatarImage, AvatarFallback }
