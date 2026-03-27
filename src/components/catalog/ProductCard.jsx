import { Link } from 'react-router-dom'
import { Check, WifiOff, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { CategoryBadge } from '@/components/common/CategoryBadge'
import { BlurImage } from '@/components/common/BlurImage'
import { cn } from '@/lib/utils'

export function ProductCard({ product, reservedQty = 0 }) {
  const available = product.total_stock - reservedQty
  const isUnavailable = available <= 0

  return (
    <Link to={`/catalog/${product.id}`} className="block h-full">
      <Card spotlight={!isUnavailable} className={cn(
        'overflow-hidden group transition-all duration-200 h-full flex flex-col',
        isUnavailable
          ? 'opacity-50 grayscale'
          : 'hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/50 active:scale-[0.98]'
      )}>
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <BlurImage
            src={product.image_url || 'https://via.placeholder.com/400x250?text=No+Image'}
            alt={product.name}
            className={cn(
              'transition-transform duration-300',
              !isUnavailable && 'group-hover:scale-105'
            )}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
          <CategoryBadge
            className="absolute top-3 left-3"
            name={product.category_name}
            color={product.category_color}
            subType={product.sub_type}
          />
          {isUnavailable && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60">
              <span className="text-sm font-semibold text-destructive bg-background/80 px-3 py-1 rounded-full">
                Unavailable
              </span>
            </div>
          )}
        </div>

        <CardContent className="p-5 space-y-3 flex-1 flex flex-col">
          <h3 className="font-semibold text-base leading-tight group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>

          {product.includes?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {product.includes.map((item, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted rounded px-2 py-0.5">
                  <Check className="h-3 w-3 text-success" />
                  {item}
                </span>
              ))}
            </div>
          )}

          {product.wifi_only && (
            <div className="flex items-center gap-1 text-xs text-warning">
              <WifiOff className="h-3 w-3" /> WiFi only - No 4G/5G
            </div>
          )}

          {product.printer_info && (
            <div className="flex items-center gap-1 text-xs text-warning">
              <AlertTriangle className="h-3 w-3" /> B&W Laser - Print only
            </div>
          )}

          <div className="pt-2 border-t mt-auto">
            <div className="text-sm">
              <span
                className={cn(
                  'font-bold',
                  available > 3 ? 'text-success' : available > 0 ? 'text-warning' : 'text-destructive'
                )}
              >
                {Math.max(available, 0)}
              </span>
              <span className="text-muted-foreground"> available</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
