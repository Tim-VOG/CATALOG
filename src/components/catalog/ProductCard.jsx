import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Check, WifiOff, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CategoryBadge } from '@/components/common/CategoryBadge'
import { BlurImage } from '@/components/common/BlurImage'
import { ProductConfigModal } from './ProductConfigModal'
import { cn } from '@/lib/utils'

export function ProductCard({ product, cart, onAddToCart, subscriptionPlans, productOptions, reservedQty = 0, datesSelected = false }) {
  const [showConfig, setShowConfig] = useState(false)

  const inCart = cart.find((c) => c.product.id === product.id)?.quantity || 0
  // Always compute availability from reservedQty (today or selected range)
  const available = product.total_stock - reservedQty - inCart
  const needsConfig = product.has_accessories || product.has_software || product.has_subscription || product.has_apps
  const isUnavailable = available <= 0

  const handleAdd = () => {
    if (needsConfig) setShowConfig(true)
    else onAddToCart(product, 1, {})
  }

  const handleConfirm = (opts) => {
    onAddToCart(product, 1, opts)
    setShowConfig(false)
  }

  return (
    <>
      <Card spotlight={!isUnavailable} className={cn(
        'overflow-hidden group transition-all duration-200 h-full flex flex-col',
        isUnavailable
          ? 'opacity-50 grayscale'
          : 'hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/50 active:scale-[0.98]'
      )}>
        <Link to={`/catalog/${product.id}`}>
          <div className="relative aspect-[4/3] overflow-hidden bg-muted">
            <BlurImage
              src={product.image_url || 'https://via.placeholder.com/400x250?text=No+Image'}
              alt={product.name}
              className={cn(
                'transition-transform duration-300',
                !isUnavailable && 'group-hover:scale-105'
              )}
            />
            {/* Subtle gradient overlay for text legibility */}
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
        </Link>

        <CardContent className="p-5 space-y-3 flex-1 flex flex-col">
          <Link to={`/catalog/${product.id}`}>
            <h3 className="font-semibold text-base leading-tight hover:text-primary transition-colors">
              {product.name}
            </h3>
          </Link>
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

          <div className="flex items-center justify-between pt-2 border-t mt-auto">
            <div className="text-sm">
              <span
                className={cn(
                  'font-bold',
                  available > 3 ? 'text-success' : available > 0 ? 'text-warning' : 'text-destructive'
                )}
              >
                {Math.max(available, 0)}
              </span>
              <span className="text-muted-foreground"> / {product.total_stock} available</span>
            </div>
            <Button size="sm" onClick={handleAdd} disabled={isUnavailable}>
              <Plus className="h-4 w-4" />
              {needsConfig ? 'Configure' : 'Add'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {showConfig && (
        <ProductConfigModal
          product={product}
          subscriptionPlans={subscriptionPlans}
          productOptions={productOptions}
          onConfirm={handleConfirm}
          onClose={() => setShowConfig(false)}
        />
      )}
    </>
  )
}
