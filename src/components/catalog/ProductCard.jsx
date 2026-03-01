import { useState } from 'react'
import { motion } from 'motion/react'
import { Check, WifiOff, AlertTriangle, ChevronRight, Settings2, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DeviceIcon } from '@/components/common/DeviceIcon'
import { ProductConfigModal } from './ProductConfigModal'
import { APPLE_DEVICE_ICONS } from '@/lib/apple-device-icons'
import { cn } from '@/lib/utils'

/** Map icon_size → Tailwind class for the floating icon on the card */
const CARD_ICON_SIZES = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
  xl: 'h-20 w-20',
}

export function ProductCard({ product, cart, onAddToCart, subscriptionPlans, productOptions, reservedQty = 0, datesSelected = false, showAvailability = true, showIncludes = true }) {
  const [showConfig, setShowConfig] = useState(false)

  const inCart = cart.find((c) => c.product.id === product.id)?.quantity || 0
  const available = product.total_stock - reservedQty - inCart
  const needsConfig = product.has_accessories || product.has_software || product.has_subscription || product.has_apps
  const isUnavailable = available <= 0

  // Display settings from DB (visual builder)
  const ds = product.display_settings || {}

  // Resolve device type for icon color + card background
  const { Icon, gradient } = DeviceIcon.resolve(product.name, product.category_name, product.sub_type)

  // Custom icon: check for apple SVG, custom lucide, or auto
  const hasCustomIcon = !!ds.icon_name
  const isAppleSvg = hasCustomIcon && !!APPLE_DEVICE_ICONS[ds.icon_name]
  const customLucideIcon = hasCustomIcon && !isAppleSvg ? DeviceIcon.resolveLucideIcon(ds.icon_name) : null
  const EffectiveIcon = customLucideIcon || Icon

  // Custom card background (inline style for runtime hex values)
  const hasCustomCardBg = !!ds.card_bg
  const hasCustomGradient = ds.gradient_from || ds.gradient_to
  const cardBgStyle = hasCustomCardBg
    ? { background: ds.card_bg }
    : hasCustomGradient
      ? { background: `linear-gradient(to bottom right, ${ds.gradient_from || 'transparent'}12, ${ds.gradient_to || 'transparent'}08)` }
      : {}
  const useCustomCardStyle = hasCustomCardBg || hasCustomGradient

  // Custom icon color
  const iconColorStyle = ds.icon_color ? { color: ds.icon_color } : {}
  const hasCustomIconColor = !!ds.icon_color

  // Icon size from display_settings (default 'md')
  const iconSizeClass = CARD_ICON_SIZES[ds.icon_size] || CARD_ICON_SIZES.md

  // Icon offset (pixel-precise positioning)
  const iconOffsetStyle = (ds.icon_offset_x || ds.icon_offset_y)
    ? { transform: `translate(${ds.icon_offset_x || 0}px, ${ds.icon_offset_y || 0}px)` }
    : {}

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
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10" style={iconOffsetStyle}>
          <motion.div
            whileHover={!isUnavailable ? { scale: 1.15, y: -4 } : undefined}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className={cn(isUnavailable && 'opacity-40 grayscale')}
          >
            {ds.custom_image_url ? (
              <img
                src={ds.custom_image_url}
                alt={product.name}
                className={cn(iconSizeClass, 'object-contain drop-shadow-md')}
              />
            ) : isAppleSvg ? (
              <div
                className={cn(iconSizeClass, 'drop-shadow-md', !hasCustomIconColor && gradient.icon)}
                style={iconColorStyle}
                dangerouslySetInnerHTML={{ __html: APPLE_DEVICE_ICONS[ds.icon_name].svg }}
              />
            ) : (
              <EffectiveIcon
                className={cn(iconSizeClass, 'drop-shadow-md', !hasCustomIconColor && gradient.icon)}
                style={iconColorStyle}
                strokeWidth={1.5}
              />
            )}
          </motion.div>
        </div>

        {/* Card body — gradient bg matching icon color, no border, shadow */}
        <div
          className={cn(
            'relative rounded-2xl pt-10 pb-5 px-5 flex-1 flex flex-col',
            !useCustomCardStyle && 'bg-gradient-to-br',
            !useCustomCardStyle && gradient.cardBg,
            'shadow-[0_2px_20px_-4px_rgba(0,0,0,0.12)] transition-all duration-300',
            isUnavailable
              ? 'opacity-60'
              : 'hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.2)] hover:-translate-y-1'
          )}
          style={useCustomCardStyle ? cardBgStyle : undefined}
        >
          {/* Badge from display settings */}
          {ds.badge_text && (
            <span
              className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
              style={{ background: ds.badge_color || '#f97316' }}
            >
              {ds.badge_text}
            </span>
          )}

          {/* Category + Availability — top row */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              {product.category_name}
              {product.sub_type && <span className="text-muted-foreground/50"> · {product.sub_type}</span>}
            </span>

            {showAvailability && (
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
            )}
          </div>

          {/* Title */}
          <h3 className="font-display font-semibold text-[15px] leading-snug line-clamp-2">
            {product.name}
          </h3>

          {/* Description */}
          {product.description && (
            <p className="text-xs text-muted-foreground/70 line-clamp-2 mt-1.5 leading-relaxed">
              {product.description}
            </p>
          )}

          {/* Spacer to push bottom content down */}
          <div className="flex-1 min-h-3" />

          {/* Includes chips */}
          {showIncludes && product.includes?.length > 0 && (
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
