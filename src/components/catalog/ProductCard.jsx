import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Plus, Check, WifiOff, AlertTriangle, ShoppingCart } from 'lucide-react'
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
        'overflow-hidden group transition-all duration-300 h-full flex flex-col',
        isUnavailable
          ? 'opacity-50 grayscale'
          : 'hover:-translate-y-1.5 hover:shadow-elevated hover:border-primary/30 active:scale-[0.98]'
      )}>
        <Link to={`/catalog/${product.id}`}>
          <div className="relative aspect-[4/3] overflow-hidden bg-muted">
            <BlurImage
              src={product.image_url || 'https://via.placeholder.com/400x250?text=No+Image'}
              alt={product.name}
              className={cn(
                'transition-transform duration-500',
                !isUnavailable && 'group-hover:scale-110'
              )}
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent pointer-events-none" />
            <CategoryBadge
              className="absolute top-3 left-3"
              name={product.category_name}
              color={product.category_color}
              subType={product.sub_type}
            />

            {/* Quick add button revealed on hover */}
            {!isUnavailable && (
              <motion.div
                className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                initial={false}
              >
                <Button
                  size="sm"
                  className="rounded-full shadow-float gap-1.5 h-8 text-xs"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleAdd()
                  }}
                >
                  <ShoppingCart className="h-3 w-3" />
                  Quick Add
                </Button>
              </motion.div>
            )}

            {isUnavailable && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
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
                <span key={i} className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/80 rounded-full px-2 py-0.5">
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

          <div className="flex items-center justify-between pt-3 border-t border-border/30 mt-auto">
            <div className="text-sm">
              <span
                className={cn(
                  'font-bold text-base',
                  available > 3 ? 'text-success' : available > 0 ? 'text-warning' : 'text-destructive'
                )}
              >
                {Math.max(available, 0)}
              </span>
              <span className="text-muted-foreground text-xs"> / {product.total_stock}</span>
            </div>
            <Button size="sm" onClick={handleAdd} disabled={isUnavailable} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
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
