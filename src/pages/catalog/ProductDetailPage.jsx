import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useProduct, useProductReservations } from '@/hooks/use-products'
import { useLoans } from '@/hooks/use-loans'
import { useSubscriptionPlans } from '@/hooks/use-subscription-plans'
import { useProductOptions } from '@/hooks/use-product-options'
import { useCartStore } from '@/stores/cart-store'
import { useUIStore } from '@/stores/ui-store'
import {
  ArrowLeft, Check, WifiOff, AlertTriangle,
  CalendarDays, Maximize2, Minimize2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { QueryWrapper } from '@/components/common/QueryWrapper'
import { CategoryBadge } from '@/components/common/CategoryBadge'
import { BlurImage } from '@/components/common/BlurImage'
import { Skeleton, SkeletonText } from '@/components/ui/skeleton'
import { AvailabilityCalendar } from '@/components/calendar/AvailabilityCalendar'
import { AvailabilitySummaryCard } from '@/components/catalog/AvailabilitySummaryCard'
import { ProductConfigModal } from '@/components/catalog/ProductConfigModal'
import { FadeIn, ScrollFadeIn } from '@/components/ui/motion'
import { cn } from '@/lib/utils'

export function ProductDetailPage() {
  const { productId } = useParams()
  const productQuery = useProduct(productId)
  const { data: loans = [] } = useLoans()
  const { data: reservations = [] } = useProductReservations(productId)
  const { data: subscriptionPlans = [] } = useSubscriptionPlans()
  const { data: productOptions = [] } = useProductOptions()
  const addItem = useCartStore((s) => s.addItem)
  const cartItems = useCartStore((s) => s.items)
  const showToast = useUIStore((s) => s.showToast)
  const [calendarCompact, setCalendarCompact] = useState(true)
  const [showConfig, setShowConfig] = useState(false)

  const product = productQuery.data

  // ── Loading / Error states ──────────────────────────────────
  if (productQuery.isLoading || productQuery.isError) {
    return (
      <QueryWrapper
        query={productQuery}
        skeleton={<HeroSkeleton />}
      />
    )
  }
  if (!product) return <div className="text-center py-16 text-muted-foreground">Product not found</div>

  // ── Derived data ────────────────────────────────────────────
  const activeLoans = loans.filter(
    (l) => l.product_id === product.id && (l.status === 'active' || l.status === 'pending')
  )
  const borrowed = activeLoans.reduce((sum, l) => sum + l.quantity, 0)
  const inCart = cartItems.find((c) => c.product.id === product.id)?.quantity || 0
  const available = product.total_stock - borrowed - inCart
  const hasWarnings = product.wifi_only || product.printer_info
  const needsConfig = product.has_accessories || product.has_software || product.has_subscription || product.has_apps

  const handleAdd = () => {
    if (needsConfig) {
      setShowConfig(true)
    } else {
      addItem(product, 1, {})
      showToast(`${product.name} added to cart`)
    }
  }

  const handleConfigConfirm = (opts) => {
    addItem(product, 1, opts)
    setShowConfig(false)
    showToast(`${product.name} added to cart`)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {/* Back button */}
      <FadeIn>
        <Link to="/catalog">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to catalog
          </Button>
        </Link>
      </FadeIn>

      {/* ── HERO SECTION ─────────────────────────────────────── */}
      <FadeIn delay={0.05} y={20}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-start">

          {/* ── Mobile: Title above image ──────────────────── */}
          <div className="md:hidden space-y-2">
            <CategoryBadge
              name={product.category_name}
              color={product.category_color}
              subType={product.sub_type}
            />
            <h1 className="text-3xl font-display font-bold tracking-tight">{product.name}</h1>
            {product.description && (
              <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
                {product.description}
              </p>
            )}
          </div>

          {/* ── Left: Hero Image with decorative blobs ─────── */}
          <FadeIn delay={0.1}>
            <div className="relative">
              {/* Decorative gradient blobs */}
              <motion.div
                className="absolute -top-12 -left-12 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none"
                animate={{
                  x: [0, 30, -15, 0],
                  y: [0, -20, 15, 0],
                }}
                transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className="absolute -bottom-8 -right-8 w-56 h-56 rounded-full bg-cyan-500/8 blur-3xl pointer-events-none"
                animate={{
                  x: [0, -20, 10, 0],
                  y: [0, 15, -10, 0],
                }}
                transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Image */}
              <div className="relative group rounded-2xl overflow-hidden">
                <BlurImage
                  src={product.image_url || 'https://via.placeholder.com/600x450?text=No+Image'}
                  alt={product.name}
                  containerClassName="aspect-[4/3] rounded-2xl"
                  className="transition-transform duration-700 group-hover:scale-105"
                />
              </div>
            </div>
          </FadeIn>

          {/* ── Right: Product info stack ──────────────────── */}
          <div className="space-y-5">
            {/* Desktop: Title (hidden on mobile, shown above image there) */}
            <FadeIn delay={0.15} className="hidden md:block">
              <div className="space-y-3">
                <CategoryBadge
                  name={product.category_name}
                  color={product.category_color}
                  subType={product.sub_type}
                />
                <h1 className="text-4xl lg:text-5xl font-display font-bold tracking-tight leading-[1.1]">
                  {product.name}
                </h1>
                {product.description && (
                  <p className="text-muted-foreground text-base leading-relaxed line-clamp-3 max-w-lg">
                    {product.description}
                  </p>
                )}
              </div>
            </FadeIn>

            {/* What's included */}
            {product.includes?.length > 0 && (
              <FadeIn delay={0.2}>
                <div>
                  <h3 className="text-sm font-semibold mb-2">What's included</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.includes.map((item, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 text-xs bg-muted rounded-md px-2.5 py-1.5">
                        <Check className="h-3 w-3 text-success" />{item}
                      </span>
                    ))}
                  </div>
                </div>
              </FadeIn>
            )}

            {/* Warnings */}
            {hasWarnings && (
              <FadeIn delay={0.22}>
                <div className="space-y-2 bg-warning/10 rounded-lg p-3">
                  {product.wifi_only && (
                    <div className="flex items-center gap-2 text-sm text-warning">
                      <WifiOff className="h-4 w-4 shrink-0" /> WiFi only - No cellular
                    </div>
                  )}
                  {product.printer_info && (
                    <div className="flex items-center gap-2 text-sm text-warning">
                      <AlertTriangle className="h-4 w-4 shrink-0" /> B&W Laser - Print only
                    </div>
                  )}
                </div>
              </FadeIn>
            )}

            {/* ── Availability Summary Card ────────────────── */}
            <FadeIn delay={0.25}>
              <AvailabilitySummaryCard
                available={available}
                totalStock={product.total_stock}
                needsConfig={needsConfig}
                onAddToCart={handleAdd}
                onConfigure={() => setShowConfig(true)}
              />
            </FadeIn>
          </div>
        </div>
      </FadeIn>

      {/* ── CALENDAR SECTION ─────────────────────────────────── */}
      <ScrollFadeIn>
        <div id="availability-calendar">
          <Card variant="glass" className="overflow-hidden">
            <CardContent className={cn('p-5', calendarCompact && 'p-4')}>
              <AvailabilityCalendar
                reservations={reservations}
                totalStock={product.total_stock}
                compact={calendarCompact}
                headerExtra={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 text-xs text-muted-foreground"
                    onClick={() => setCalendarCompact((c) => !c)}
                  >
                    {calendarCompact ? (
                      <>
                        <Maximize2 className="h-3 w-3" /> Full view
                      </>
                    ) : (
                      <>
                        <Minimize2 className="h-3 w-3" /> Compact
                      </>
                    )}
                  </Button>
                }
              />
            </CardContent>
          </Card>
        </div>
      </ScrollFadeIn>

      {/* ── SPECIFICATIONS ────────────────────────────────────── */}
      {product.specs && Object.keys(product.specs).length > 0 && (
        <ScrollFadeIn>
          <Card variant="glass">
            <CardContent className="p-5">
              <h3 className="font-semibold text-base mb-3">Specifications</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                {Object.entries(product.specs).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-1 border-b border-border/30 last:border-0">
                    <dt className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</dt>
                    <dd className="font-medium text-right">{value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </ScrollFadeIn>
      )}

      {/* ── Config Modal ──────────────────────────────────────── */}
      {showConfig && (
        <ProductConfigModal
          product={product}
          subscriptionPlans={subscriptionPlans}
          productOptions={productOptions}
          onConfirm={handleConfigConfirm}
          onClose={() => setShowConfig(false)}
        />
      )}
    </div>
  )
}

// ── Hero Loading Skeleton ────────────────────────────────────
function HeroSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <Skeleton className="h-8 w-32" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
        {/* Image skeleton */}
        <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
        {/* Info skeleton */}
        <div className="space-y-5">
          <div className="space-y-3">
            <Skeleton className="h-5 w-20 rounded-md" />
            <Skeleton className="h-10 w-4/5" />
            <SkeletonText lines={2} className="max-w-md" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-7 w-20 rounded-md" />
            <Skeleton className="h-7 w-24 rounded-md" />
          </div>
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  )
}
