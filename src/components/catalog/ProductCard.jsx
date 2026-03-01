import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Check, WifiOff, AlertTriangle, ChevronRight, Settings2, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DeviceIcon } from '@/components/common/DeviceIcon'
import { ProductConfigModal } from './ProductConfigModal'
import { cn } from '@/lib/utils'

export function ProductCard({ product, cart, onAddToCart, subscriptionPlans, productOptions, reservedQty = 0, datesSelected = false }) {
  const [showConfig, setShowConfig] = useState(false)

  const inCart = cart.find((c) => c.product.id === product.id)?.quantity || 0
  const available = product.total_stock - reservedQty - inCart
  const needsConfig = product.has_accessories || product.has_software || product.has_subscription || product.has_apps
  const isUnavailable = available <= 0

  // Resolve device type for icon color + card background
  const { Icon, gradient } = DeviceIcon.resolve(product.name, product.category_name, product.sub_type)

  const handleAdd = (e) => {
    e?.preventDefault?.()
    e?.stopPropagation?.()
    if (needsConfig) setShowConfig(true)
    else onAddToCart(product, 1, {})
  }

  const handleConfirm = (opts) => {
    onAddToCart(product, 1, opts)
    setShowConfig(false)
  }

  return (
    <>
      <div className="relative group h-full flex flex-col pt-10">
        {/* Floating bare icon — overlaps above the card, no background */}
        <Link to={`/catalog/${product.id}`} className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
          <motion.div
            whileHover={!isUnavailable ? { scale: 1.15, y: -4 } : undefined}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className={cn(isUnavailable && 'opacity-40 grayscale')}
          >
            <Icon className={cn('h-12 w-12 drop-shadow-md', gradient.icon)} strokeWidth={1.5} />
          </motion.div>
        </Link>

        {/* Card body — gradient bg matching icon color, no border, shadow */}
        <div
          className={cn(
            'relative rounded-2xl bg-gradient-to-br pt-10 pb-5 px-5 flex-1 flex flex-col',
            gradient.cardBg,
            'shadow-[0_2px_20px_-4px_rgba(0,0,0,0.12)] transition-all duration-300',
            isUnavailable
              ? 'opacity-60'
              : 'hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.2)] hover:-translate-y-1'
          )}
        >
          {/* Category + Availability — top row */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              {product.category_name}
              {product.sub_type && <span className="text-muted-foreground/50"> · {product.sub_type}</span>}
            </span>

            <div
              className={cn(
                'flex items-center gap-1.5 text-[10px] font-bold',
                available > 3 ? 'text-success' : available > 0 ? 'text-warning' : 'text-destructive'
              )}
            >
              <span className={cn(
                'h-1.5 w-1.5 rounded-full animate-pulse',
                available > 3 ? 'bg-success' : available > 0 ? 'bg-warning' : 'bg-destructive'
              )} />
              {available > 0 ? `${Math.max(available, 0)} / ${product.total_stock}` : 'Unavailable'}
            </div>
          </div>

          {/* Title */}
          <Link to={`/catalog/${product.id}`}>
            <h3 className="font-display font-semibold text-[15px] leading-snug hover:text-primary transition-colors line-clamp-2">
              {product.name}
            </h3>
          </Link>

          {/* Description */}
          {product.description && (
            <p className="text-xs text-muted-foreground/70 line-clamp-2 mt-1.5 leading-relaxed">
              {product.description}
            </p>
          )}

          {/* Spacer to push bottom content down */}
          <div className="flex-1 min-h-3" />

          {/* Includes chips */}
          {product.includes?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {product.includes.slice(0, 3).map((item, i) => (
                <span key={i} className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground bg-background/60 rounded-full px-2 py-0.5">
                  <Check className="h-2.5 w-2.5 text-success/70" />
                  {item}
                </span>
              ))}
              {product.includes.length > 3 && (
                <span className="text-[10px] text-muted-foreground/40">+{product.includes.length - 3}</span>
              )}
            </div>
          )}

          {/* Warnings */}
          {(product.wifi_only || product.printer_info) && (
            <div className="flex flex-wrap gap-2 mt-2">
              {product.wifi_only && (
                <span className="flex items-center gap-1 text-[10px] text-warning/80">
                  <WifiOff className="h-3 w-3" /> WiFi only
                </span>
              )}
              {product.printer_info && (
                <span className="flex items-center gap-1 text-[10px] text-warning/80">
                  <AlertTriangle className="h-3 w-3" /> B&W Laser
                </span>
              )}
            </div>
          )}

          {/* Unavailable overlay */}
          {isUnavailable && (
            <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-background/30 backdrop-blur-[1px]">
              <span className="text-xs font-semibold text-destructive bg-background/90 px-3 py-1 rounded-full">
                Unavailable
              </span>
            </div>
          )}
        </div>

        {/* Unified action button — floating at bottom-right, overlapping the card */}
        {!isUnavailable && (
          <motion.div
            className="absolute -bottom-3 right-4 z-10"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Button
              size="sm"
              variant="gradient"
              className="rounded-full shadow-lg gap-1.5 h-8 text-xs px-4"
              onClick={handleAdd}
            >
              {needsConfig ? (
                <><Settings2 className="h-3 w-3" /> Configure <ChevronRight className="h-3 w-3 -mr-1" /></>
              ) : (
                <><ShoppingCart className="h-3 w-3" /> Reserve <ChevronRight className="h-3 w-3 -mr-1" /></>
              )}
            </Button>
          </motion.div>
        )}
      </div>

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
