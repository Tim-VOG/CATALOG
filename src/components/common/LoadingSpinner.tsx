import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LoadingSpinner({ className, size = 24  }: any) {
  return <Loader2 className={cn('animate-spin text-muted-foreground', className)} size={size} />
}

// No motion wrapper here on purpose: the loading spinner must always be
// painted. A FadeIn (opacity:0 → 1) could leave it invisible if the JS
// animation never runs, which reads as a white screen.
export function PageLoading({ message = 'Loading...'  }: any) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <LoadingSpinner size={32} />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  )
}
