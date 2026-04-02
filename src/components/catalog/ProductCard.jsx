import { Link } from 'react-router-dom'
import { Check, WifiOff, AlertTriangle, ShoppingCart, Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CategoryBadge } from '@/components/common/CategoryBadge'
import { BlurImage } from '@/components/common/BlurImage'
import { useCartStore } from '@/stores/cart-store'
import { useUIStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'

export function ProductCard({ product, reservedQty = 0 }) {
  const available = product.total_stock - reservedQty
  const isUnavailable = available <= 0
  const addItem = useCartStore((s) => s.addItem)
  const hasItem = useCartStore((s) => s.hasItem)
  const showToast = useUIStore((s) => s.showToast)
  const inCart = hasItem(product.id)

  const handleAddToCart = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (isUnavailable) return
    addItem(product)
    showToast(`${product.name} added to cart`)
  }

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
          {/* Add to cart hover button */}
          {!isUnavailable && (
            <div className="absolute bottom-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                className={cn(
                  'h-8 gap-1.5 rounded-full shadow-lg text-xs font-semibold',
                  inCart
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : 'bg-primary hover:bg-primary/90'
                )}
                onClick={handleAddToCart}
              >
                {inCart ? (
                  <><Check className="h-3 w-3" /> In Cart</>
                ) : (
                  <><Plus className="h-3 w-3" /> Add to Cart</>
                )}
              </Button>
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

          <div className="pt-2 border-t mt-auto flex items-center justify-between">
            <div className="text-sm">
              <span
                className={cn(
                  'font-bold',
                  available > 3 ? 'text-success' : available > 0 ? 'text-warning' : 'text-destructive'
                )}
              >
                {Math.max(available, 0)}
              </span>
              <span className="text-muted-foreground"> / {product.total_stock}</span>
            </div>
            {/* Mobile add to cart button (always visible) */}
            {!isUnavailable && (
              <Button
                size="icon"
                variant={inCart ? 'default' : 'outline'}
                className={cn(
                  'h-7 w-7 sm:hidden shrink-0',
                  inCart && 'bg-emerald-500 hover:bg-emerald-600 border-emerald-500'
                )}
                onClick={handleAddToCart}
              >
                {inCart ? <Check className="h-3.5 w-3.5" /> : <ShoppingCart className="h-3.5 w-3.5" />}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
