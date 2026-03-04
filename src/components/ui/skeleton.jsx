import { cn } from '@/lib/utils'

function Skeleton({ className, variant = 'pulse', ...props }) {
  return (
    <div
      className={cn(
        'rounded-md',
        variant === 'pulse' && 'animate-shimmer',
        variant === 'wave' && 'skeleton-wave',
        variant === 'shine' && 'skeleton-shine',
        className
      )}
      {...props}
    />
  )
}

function SkeletonText({ lines = 3, className, variant }) {
  return (
    <div className={cn('space-y-2.5', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant={variant}
          className={cn(
            'h-4',
            i === lines - 1 ? 'w-3/4' : 'w-full'
          )}
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}
    </div>
  )
}

function SkeletonCard({ className, variant }) {
  return (
    <div className={cn('rounded-xl border bg-card/50 p-4 space-y-3', className)}>
      <Skeleton variant={variant} className="h-40 w-full rounded-lg" />
      <Skeleton variant={variant} className="h-4 w-3/4" style={{ animationDelay: '100ms' }} />
      <Skeleton variant={variant} className="h-4 w-1/2" style={{ animationDelay: '200ms' }} />
      <div className="flex gap-2 pt-1">
        <Skeleton variant={variant} className="h-8 w-20 rounded-lg" style={{ animationDelay: '300ms' }} />
        <Skeleton variant={variant} className="h-8 w-20 rounded-lg" style={{ animationDelay: '400ms' }} />
      </div>
    </div>
  )
}

function SkeletonAvatar({ className, variant }) {
  return (
    <Skeleton variant={variant} className={cn('h-10 w-10 rounded-full', className)} />
  )
}

function SkeletonTableRow({ cols = 4, className, variant }) {
  return (
    <div className={cn('flex items-center gap-4 py-3', className)}>
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton
          key={i}
          variant={variant}
          className={cn('h-4', i === 0 ? 'w-1/4' : 'flex-1')}
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  )
}

export { Skeleton, SkeletonText, SkeletonCard, SkeletonAvatar, SkeletonTableRow }
