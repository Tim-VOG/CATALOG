import { useState } from 'react'
import { Package } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * BlurImage — progressive image loading with blur-up effect.
 * Shows a blurred, slightly scaled placeholder that transitions
 * to the sharp image on load. Falls back to an icon on error.
 */
export function BlurImage({ src, alt, className, containerClassName, ...props }) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  if (!src || errored) {
    return (
      <div className={cn('overflow-hidden bg-muted flex items-center justify-center', containerClassName)}>
        <Package className="h-6 w-6 text-muted-foreground/50" />
      </div>
    )
  }

  return (
    <div className={cn('overflow-hidden bg-muted', containerClassName)}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        width={props.width || 400}
        height={props.height || 300}
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        className={cn(
          'w-full h-full object-cover transition-all duration-700 ease-out',
          loaded ? 'blur-0 scale-100' : 'blur-xl scale-110',
          className
        )}
        {...props}
      />
    </div>
  )
}
