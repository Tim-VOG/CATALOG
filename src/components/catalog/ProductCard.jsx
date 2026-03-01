import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Plus, Check, WifiOff, AlertTriangle, ShoppingCart, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DeviceIcon } from '@/components/common/DeviceIcon'
import { ProductConfigModal } from './ProductConfigModal'
import { cn } from '@/lib/utils'

export function ProductCard({ product, cart, onAddToCart, subscriptionPlans, productOptions, reservedQty = 0, datesSelected = false }) {
  const [showConfig, setShowConfig] = useState(false)

  const inCart = cart.find((c) => c.product.id === product.id)?.quantity || 0
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
      <Card
        spotlight={!isUnavailable}
        className={cn(
          'overflow-hidden group transition-all duration-300 h-full flex flex-col border-border/40',
          isUnavailable
            ? 'opacity-50 grayscale'
            : 'hover:-translate-y-2 hover:shadow-elevated hover:border-primary/25'
        )}
      >
        {/* Icon header area */}
        <Link to={`/catalog/${product.id}`} className="block">
          <div className="relative px-6 pt-8 pb-4 flex flex-col items-center">
            {/* Ambient background */}
            <div className="absolute inset-0 bg-gradient-to-b from-muted/40 via-muted/20 to-transparent pointer-events-none" />

            {/* Category badge — top-left */}
            <div className="absolute top-3 left-3 z-10">
              <Badge variant="soft" className="text-[10px] font-semibold tracking-wide uppercase backdrop-blur-sm">
                {product.category_name}
                {product.sub_type && ` · ${product.sub_type}`}
              </Badge>
            </div>

            {/* Availability indicator — top-right */}
            <div className="absolute top-3 right-3 z-10">
              <div
                className={cn(
                  'flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full',
                  available > 3
                    ? 'bg-success/15 text-success'
                    : available > 0
                    ? 'bg-warning/15 text-warning'
                    : 'bg-destructive/15 text-destructive'
                )}
              >
                <span className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  available > 3 ? 'bg-success' : available > 0 ? 'bg-warning' : 'bg-destructive'
                )} />
                {available > 0 ? `${Math.max(available, 0)} avail.` : 'Unavail.'}
              </div>
            </div>

            {/* Device icon */}
            <DeviceIcon
              name={product.name}
              category={product.category_name}
              subType={product.sub_type}
              size="lg"
              animated={!isUnavailable}
            />

            {/* Quick add — appears on hover */}
            {!isUnavailable && (
              <motion.div
                className="absolute bottom-2 right-3 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200"
                initial={false}
              >
                <Button
                  size="sm"
                  variant="gradient"
                  className="rounded-full shadow-float gap-1 h-7 text-[10px] px-3"
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

            {/* Unavailable overlay */}
            {isUnavailable && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[2px]">
                <span className="text-xs font-semibold text-destructive bg-background/80 px-3 py-1 rounded-full border border-destructive/20">
                  Unavailable
                </span>
              </div>
            )}
          </div>
        </Link>

        {/* Content area */}
        <CardContent className="px-5 pb-5 pt-2 flex-1 flex flex-col gap-2">
          <Link to={`/catalog/${product.id}`}>
            <h3 className="font-semibold text-sm leading-snug hover:text-primary transition-colors line-clamp-2">
              {product.name}
            </h3>
          </Link>

          {product.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}

          {/* Includes chips */}
          {product.includes?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {product.includes.slice(0, 3).map((item, i) => (
                <span key={i} className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5">
                  <Check className="h-2.5 w-2.5 text-success" />
                  {item}
                </span>
              ))}
              {product.includes.length > 3 && (
                <span className="text-[10px] text-muted-foreground/60">
                  +{product.includes.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Warnings */}
          {(product.wifi_only || product.printer_info) && (
            <div className="flex flex-wrap gap-2">
              {product.wifi_only && (
                <div className="flex items-center gap-1 text-[10px] text-warning">
                  <WifiOff className="h-3 w-3" /> WiFi only
                </div>
              )}
              {product.printer_info && (
                <div className="flex items-center gap-1 text-[10px] text-warning">
                  <AlertTriangle className="h-3 w-3" /> B&W Laser
                </div>
              )}
            </div>
          )}

          {/* Spacer to push footer down */}
          <div className="flex-1" />

          {/* Footer: Stock + action */}
          <div className="flex items-center justify-between pt-3 border-t border-border/20 mt-1">
            <div className="flex items-baseline gap-1">
              <span
                className={cn(
                  'font-bold text-lg tabular-nums',
                  available > 3 ? 'text-success' : available > 0 ? 'text-warning' : 'text-destructive'
                )}
              >
                {Math.max(available, 0)}
              </span>
              <span className="text-muted-foreground text-[10px]">/ {product.total_stock}</span>
            </div>
            <Button
              size="sm"
              variant={needsConfig ? 'outline' : 'default'}
              onClick={handleAdd}
              disabled={isUnavailable}
              className="gap-1 h-8 text-xs rounded-lg"
            >
              {needsConfig ? (
                <>Configure <ChevronRight className="h-3 w-3" /></>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </>
              )}
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
