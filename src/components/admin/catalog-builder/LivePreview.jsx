import { useMemo } from 'react'
import { DeviceIcon } from '@/components/common/DeviceIcon'
import { Check } from 'lucide-react'
import { APPLE_DEVICE_ICONS } from '@/lib/apple-device-icons'
import { cn } from '@/lib/utils'

/**
 * LivePreview — Real-time preview of how a product card will look
 * with the current display_settings being edited.
 *
 * @param {object} product - Product data
 * @param {object} displaySettings - Current display_settings being edited
 */
export function LivePreview({ product, displaySettings }) {
  const ds = displaySettings || {}
  const { Icon, gradient } = DeviceIcon.resolve(
    product?.name || '',
    product?.category_name || '',
    product?.sub_type || ''
  )

  // Determine custom styles
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

  if (!product) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted/20 rounded-xl border border-dashed border-border/40">
        <p className="text-sm text-muted-foreground">Select a product to preview</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Live Preview</h3>

      {/* Scaled card preview */}
      <div className="bg-muted/10 rounded-xl border border-border/30 p-6 flex justify-center">
        <div className="w-[240px]">
          <div className="relative pt-10">
            {/* Floating icon */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
              {ds.custom_image_url ? (
                <img
                  src={ds.custom_image_url}
                  alt={product.name}
                  className="h-12 w-12 object-contain drop-shadow-md"
                />
              ) : isAppleSvg ? (
                <div
                  className={cn('h-12 w-12 drop-shadow-md', !hasCustomIconColor && gradient.icon)}
                  style={iconColorStyle}
                  dangerouslySetInnerHTML={{ __html: APPLE_DEVICE_ICONS[ds.icon_name].svg }}
                />
              ) : (
                <EffectiveIcon
                  className={cn('h-12 w-12 drop-shadow-md', !hasCustomIconColor && gradient.icon)}
                  style={iconColorStyle}
                  strokeWidth={1.5}
                />
              )}
            </div>

            {/* Card body */}
            <div
              className={cn(
                'relative rounded-2xl pt-10 pb-4 px-4',
                !useCustomStyle && 'bg-gradient-to-br',
                !useCustomStyle && gradient.cardBg,
                'shadow-[0_2px_20px_-4px_rgba(0,0,0,0.12)]'
              )}
              style={useCustomStyle ? cardStyle : undefined}
            >
              {/* Badge */}
              {ds.badge_text && (
                <span
                  className="absolute top-2 right-2 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full text-white"
                  style={{ background: ds.badge_color || '#f97316' }}
                >
                  {ds.badge_text}
                </span>
              )}

              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest">
                  {product.category_name}
                </span>
                <div className="flex items-center gap-1 text-[9px] font-bold text-success">
                  <span className="h-1 w-1 rounded-full bg-success animate-pulse" />
                  {product.total_stock}/{product.total_stock}
                </div>
              </div>

              <h3 className="font-display font-semibold text-[13px] leading-snug line-clamp-2">
                {product.name}
              </h3>

              {product.description && (
                <p className="text-[10px] text-muted-foreground/70 line-clamp-2 mt-1">
                  {product.description}
                </p>
              )}

              {product.includes?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {product.includes.slice(0, 2).map((item, i) => (
                    <span key={i} className="inline-flex items-center gap-0.5 text-[8px] text-muted-foreground bg-background/60 rounded-full px-1.5 py-0.5">
                      <Check className="h-2 w-2 text-success/70" />
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
      <div className="text-[10px] text-muted-foreground space-y-0.5 px-1">
        {ds.icon_name && <p>Icon: <span className="font-mono text-foreground">{ds.icon_name}</span></p>}
        {ds.icon_color && <p>Icon color: <span className="font-mono text-foreground">{ds.icon_color}</span></p>}
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
