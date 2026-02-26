import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * BlurImage — progressive image loading with blur-up effect.
 * Shows a blurred, slightly scaled placeholder that transitions
 * to the sharp image on load.
 */
export function BlurImage({ src, alt, className, containerClassName, ...props }) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className={cn('overflow-hidden bg-muted', containerClassName)}>
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
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
