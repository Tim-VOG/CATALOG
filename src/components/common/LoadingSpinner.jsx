import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LoadingSpinner({ className, size = 24 }) {
  return <Loader2 className={cn('animate-spin text-muted-foreground', className)} size={size} />
}

export function PageLoading({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <LoadingSpinner size={32} />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  )
}
