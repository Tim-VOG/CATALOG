import { DeviceIcon } from '@/components/common/DeviceIcon'
import { Check, Eye } from 'lucide-react'
import { APPLE_DEVICE_ICONS } from '@/lib/apple-device-icons'
import { cn } from '@/lib/utils'

/** Map icon_size → Tailwind class for the preview floating icon */
const PREVIEW_ICON_SIZES = {
  sm: 'h-10 w-10',
  md: 'h-16 w-16',
  lg: 'h-20 w-20',
  xl: 'h-24 w-24',
}

/**
 * LivePreview — Real-time preview of how a product card will look
 * with the current display_settings being edited.
 */
export function LivePreview({ product, displaySettings }) {
  const ds = displaySettings || {}
  const { Icon, gradient } = DeviceIcon.resolve(
    product?.name || '',
    product?.category_name || '',
    product?.sub_type || ''
  )

  const hasCustomCardBg = !!ds.card_bg
  const hasCustomGradient = ds.gradient_from || ds.gradient_to
  const useCustomStyle = hasCustomCardBg || hasCustomGradient
  const cardStyle = hasCustomCardBg
    ? { background: ds.card_bg }
    : hasCustomGradient
      ? { background: `linear-gradient(to bottom right, ${ds.gradient_from || 'transparent'}12, ${ds.gradient_to || 'transparent'}08)` }
      : {}

  const isAppleSvg = ds.icon_name && !!APPLE_DEVICE_ICONS[ds.icon_name]
  const customLucide = ds.icon_name && !isAppleSvg ? DeviceIcon.resolveLucideIcon(ds.icon_name) : null
  const EffectiveIcon = customLucide || Icon
  const iconColorStyle = ds.icon_color ? { color: ds.icon_color } : {}
  const hasCustomIconColor = !!ds.icon_color

  // Icon size from display_settings
  const iconSizeClass = PREVIEW_ICON_SIZES[ds.icon_size] || PREVIEW_ICON_SIZES.md

  // Icon offset (pixel-precise positioning)
  const iconOffsetStyle = (ds.icon_offset_x || ds.icon_offset_y)
    ? { transform: `translate(${ds.icon_offset_x || 0}px, ${ds.icon_offset_y || 0}px)` }
    : {}

  if (!product) {
    return (
      <div className="rounded-xl border border-dashed border-border/40 bg-muted/10 p-8 flex flex-col items-center justify-center text-center min-h-[280px]">
        <Eye className="h-8 w-8 text-muted-foreground/20 mb-3" />
        <p className="text-sm text-muted-foreground">Select a product to preview</p>
        <p className="text-[10px] text-muted-foreground/50 mt-1">Changes appear here in real-time</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Live Preview</h3>
      </div>

      {/* Card preview */}
      <div className="bg-muted/10 rounded-xl border border-border/30 p-5 flex justify-center">
        <div className="w-full max-w-[280px]">
          <div className="relative pt-12">
            {/* Floating icon */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10" style={iconOffsetStyle}>
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
            </div>

            {/* Card body */}
            <div
              className={cn(
                'relative rounded-2xl pt-12 pb-5 px-5',
                !useCustomStyle && 'bg-gradient-to-br',
                !useCustomStyle && gradient.cardBg,
                'shadow-[0_2px_20px_-4px_rgba(0,0,0,0.12)]'
              )}
              style={useCustomStyle ? cardStyle : undefined}
            >
              {/* Badge */}
              {ds.badge_text && (
                <span
                  className="absolute top-3 right-3 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full text-white"
                  style={{ background: ds.badge_color || '#f97316' }}
                >
                  {ds.badge_text}
                </span>
              )}

              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                  {product.category_name}
                </span>
                <div className="flex items-center gap-1 text-[10px] font-bold text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                  {product.total_stock}/{product.total_stock}
                </div>
              </div>

              <h3 className="font-display font-semibold text-sm leading-snug line-clamp-2">
                {product.name}
              </h3>

              {product.description && (
                <p className="text-[11px] text-muted-foreground/70 line-clamp-2 mt-1.5">
                  {product.description}
                </p>
              )}

              {product.includes?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {product.includes.slice(0, 3).map((item, i) => (
                    <span key={i} className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground bg-background/60 rounded-full px-2 py-0.5">
                      <Check className="h-2.5 w-2.5 text-success/70" />
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Settings summary */}
      <div className="text-[10px] text-muted-foreground space-y-0.5 bg-muted/10 rounded-lg p-3">
        <p className="font-medium text-muted-foreground mb-1">Active customizations:</p>
        {ds.icon_name && <p>Icon: <span className="font-mono text-foreground">{ds.icon_name}</span></p>}
        {ds.icon_color && <p>Icon color: <span className="font-mono text-foreground">{ds.icon_color}</span></p>}
        {ds.icon_size && ds.icon_size !== 'md' && <p>Icon size: <span className="font-mono text-foreground">{ds.icon_size}</span></p>}
        {(ds.icon_offset_x || ds.icon_offset_y) && <p>Icon offset: <span className="font-mono text-foreground">{ds.icon_offset_x || 0}px, {ds.icon_offset_y || 0}px</span></p>}
        {ds.gradient_from && <p>Gradient: <span className="font-mono text-foreground">{ds.gradient_from} → {ds.gradient_to}</span></p>}
        {ds.card_bg && <p>Card BG: <span className="font-mono text-foreground">{ds.card_bg}</span></p>}
        {ds.badge_text && <p>Badge: <span className="font-mono text-foreground">{ds.badge_text}</span></p>}
        {ds.custom_image_url && <p>Custom image: <span className="text-foreground">yes</span></p>}
        {!ds.icon_name && !ds.icon_color && !ds.gradient_from && !ds.card_bg && !ds.badge_text && !ds.custom_image_url && (
          <p className="text-muted-foreground/50 italic">Using auto-detected settings</p>
        )}
      </div>
    </div>
  )
}
