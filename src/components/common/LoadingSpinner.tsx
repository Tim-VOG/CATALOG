// @ts-nocheck — Phase-3 typing follow-up; remove this and fix once the surrounding API/component types stabilise.
import { Loader2 } from 'lucide-react'
import { FadeIn } from '@/components/ui/motion'
import { cn } from '@/lib/utils'

export function LoadingSpinner({ className, size = 24 }) {
  return <Loader2 className={cn('animate-spin text-muted-foreground', className)} size={size} />
}

export function PageLoading({ message = 'Loading...' }) {
  return (
    <FadeIn>
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <LoadingSpinner size={32} />
        <p className="text-muted-foreground text-sm">{message}</p>
      </div>
    </FadeIn>
  )
}
