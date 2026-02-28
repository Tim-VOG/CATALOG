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
  ShoppingCart, Settings2, ChevronRight, Package,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { QueryWrapper } from '@/components/common/QueryWrapper'
import { CategoryBadge } from '@/components/common/CategoryBadge'
import { BlurImage } from '@/components/common/BlurImage'
import { Skeleton, SkeletonText } from '@/components/ui/skeleton'
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
  const [showConfig, setShowConfig] = useState(false)

  const product = productQuery.data

  /* ── Loading / Error ──────────────────────────────────────── */
  if (productQuery.isLoading || productQuery.isError) {
    return <QueryWrapper query={productQuery} skeleton={<ShowcaseSkeleton />} />
  }
  if (!product) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        Product not found
      </div>
    )
  }

  /* ── Derived data ─────────────────────────────────────────── */
  const activeLoans = loans.filter(
    (l) => l.product_id === product.id && (l.status === 'active' || l.status === 'pending')
  )
  const borrowed = activeLoans.reduce((sum, l) => sum + l.quantity, 0)
  const inCart = cartItems.find((c) => c.product.id === product.id)?.quantity || 0
  const available = product.total_stock - borrowed - inCart
  const hasWarnings = product.wifi_only || product.printer_info
  const needsConfig =
    product.has_accessories || product.has_software || product.has_subscription || product.has_apps

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

  const hasIncludes = product.includes?.length > 0
  const hasSpecs = product.specs && Object.keys(product.specs).length > 0

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <div className="relative overflow-hidden">
      {/* ── Back button ──────────────────────────────────────── */}
      <FadeIn className="max-w-6xl mx-auto px-4">
        <Link to="/catalog">
          <Button variant="ghost" size="sm" className="gap-2 -ml-2">
            <ArrowLeft className="h-4 w-4" />
            Back to catalog
          </Button>
        </Link>
      </FadeIn>

      {/* ══════════════════════════════════════════════════════════
          HERO — Centered showcase with orbital floating cards
         ══════════════════════════════════════════════════════════ */}
      <div className="relative mt-4">
        {/* Ambient background blobs */}
        <motion.div
          className="absolute top-[-15%] left-[10%] w-[420px] h-[420px] rounded-full bg-primary/[0.07] blur-[100px] pointer-events-none"
          animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-[5%] right-[5%] w-[350px] h-[350px] rounded-full bg-cyan-500/[0.06] blur-[90px] pointer-events-none"
          animate={{ x: [0, -30, 15, 0], y: [0, 20, -15, 0] }}
          transition={{ duration: 17, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* ── Centered title + description ───────────────────── */}
        <FadeIn delay={0.05} y={16} className="text-center max-w-2xl mx-auto px-4">
          <CategoryBadge
            name={product.category_name}
            color={product.category_color}
            subType={product.sub_type}
            className="mx-auto"
          />
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold tracking-tight mt-3 leading-[1.05]">
            {product.name}
          </h1>
          {product.description && (
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mt-3 max-w-lg mx-auto line-clamp-2">
              {product.description}
            </p>
          )}
        </FadeIn>

        {/* ── Desktop orbital: product ALWAYS centered ────────── */}
        <div className="hidden xl:grid xl:grid-cols-[1fr_auto_1fr] xl:gap-6 xl:items-start max-w-[1200px] mx-auto mt-10 px-4">
          {/* LEFT — What's included (right-aligned within column) */}
          <FadeIn delay={0.2} y={24} className="flex justify-end pt-12">
            {hasIncludes ? (
              <div className="w-full max-w-[260px]">
                <IncludesFloatingCard includes={product.includes} />
              </div>
            ) : <div />}
          </FadeIn>

          {/* CENTER — Product hero image with halo (always centered) */}
          <FadeIn delay={0.1} y={12} className="flex justify-center">
            <ProductShowcase
              src={product.image_url}
              alt={product.name}
            />
          </FadeIn>

          {/* RIGHT — Availability card (left-aligned within column) */}
          <FadeIn delay={0.25} y={24} className="pt-6">
            <div className="w-full max-w-[300px]">
              <AvailabilitySummaryCard
                available={available}
                totalStock={product.total_stock}
                reservations={reservations}
              />
            </div>
          </FadeIn>
        </div>

        {/* ── Mobile / Tablet: centered product only ─────────── */}
        <div className="xl:hidden max-w-sm mx-auto mt-8 px-4">
          <FadeIn delay={0.1}>
            <ProductShowcase
              src={product.image_url}
              alt={product.name}
            />
          </FadeIn>
        </div>
      </div>

      {/* ── CTA Button (centered, all breakpoints) ───────────── */}
      <FadeIn delay={0.3} y={10} className="flex justify-center mt-8 xl:mt-10 px-4">
        <Button
          className="rounded-full h-12 sm:h-14 px-8 sm:px-12 text-base sm:text-lg gap-2.5 font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 transition-all duration-300"
          onClick={handleAdd}
          disabled={available <= 0}
        >
          {available <= 0 ? (
            'Unavailable'
          ) : needsConfig ? (
            <>
              <Settings2 className="h-5 w-5" />
              Configure & Reserve
              <ChevronRight className="h-4 w-4" />
            </>
          ) : (
            <>
              <ShoppingCart className="h-5 w-5" />
              Reserve
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </FadeIn>

      {/* ── Warnings ─────────────────────────────────────────── */}
      {hasWarnings && (
        <FadeIn delay={0.35} className="max-w-md mx-auto mt-6 px-4">
          <div className="space-y-2 bg-warning/10 rounded-xl p-3 border border-warning/20">
            {product.wifi_only && (
              <div className="flex items-center gap-2 text-sm text-warning">
                <WifiOff className="h-4 w-4 shrink-0" /> WiFi only — No cellular
              </div>
            )}
            {product.printer_info && (
              <div className="flex items-center gap-2 text-sm text-warning">
                <AlertTriangle className="h-4 w-4 shrink-0" /> B&W Laser — Print only
              </div>
            )}
          </div>
        </FadeIn>
      )}

      {/* ── Mobile / Tablet cards (stacked) ─────────────────── */}
      <div className="xl:hidden max-w-md mx-auto mt-8 px-4 space-y-4">
        <ScrollFadeIn>
          <AvailabilitySummaryCard
            available={available}
            totalStock={product.total_stock}
            reservations={reservations}
          />
        </ScrollFadeIn>

        {hasIncludes && (
          <ScrollFadeIn>
            <IncludesFloatingCard includes={product.includes} />
          </ScrollFadeIn>
        )}
      </div>

      {/* ── Specifications ───────────────────────────────────── */}
      {hasSpecs && (
        <ScrollFadeIn className="max-w-2xl mx-auto mt-10 px-4">
          <Card variant="glass">
            <CardContent className="p-5">
              <h3 className="font-semibold text-base mb-3">Specifications</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                {Object.entries(product.specs).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-1.5 border-b border-border/20 last:border-0">
                    <dt className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</dt>
                    <dd className="font-medium text-right">{value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </ScrollFadeIn>
      )}

      {/* bottom spacing */}
      <div className="h-12" />

      {/* ── Config Modal ─────────────────────────────────────── */}
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

/* ═══════════════════════════════════════════════════════════════
   LOCAL COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

/** Product image with halo bloom + pedestal reflection */
function ProductShowcase({ src, alt }) {
  return (
    <div className="relative w-full max-w-[420px]">
      {/* Halo — radial glow behind product */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[130%] h-[130%] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.10) 0%, hsl(var(--primary) / 0.04) 40%, transparent 70%)',
        }}
      />
      {/* Secondary halo — cooler tone */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[40%] w-[110%] h-[110%] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, hsl(var(--accent) / 0.06) 0%, transparent 60%)',
        }}
      />
      {/* Pedestal / reflection */}
      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-[75%] h-5 bg-foreground/[0.04] rounded-[50%] blur-lg pointer-events-none" />

      {/* Image */}
      <div className="relative group">
        <motion.div
          whileHover={{ scale: 1.03 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <BlurImage
            src={src || 'https://via.placeholder.com/600x600?text=No+Image'}
            alt={alt}
            containerClassName="aspect-square rounded-2xl"
            className="object-contain transition-all duration-500"
          />
        </motion.div>
      </div>
    </div>
  )
}

/** Floating glass card for "What's included" */
function IncludesFloatingCard({ includes }) {
  return (
    <Card variant="glass" spotlight className="max-w-[280px]">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Package className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">What's included</h3>
        </div>
        <div className="space-y-1.5">
          {includes.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
              <Check className="h-3 w-3 text-success shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/** Loading skeleton matching the showcase layout */
function ShowcaseSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 space-y-8">
      <Skeleton className="h-8 w-32" />
      {/* Title area */}
      <div className="flex flex-col items-center space-y-3">
        <Skeleton className="h-5 w-20 rounded-md" />
        <Skeleton className="h-12 w-64" />
        <SkeletonText lines={1} className="max-w-xs" />
      </div>
      {/* Product + side cards */}
      <div className="hidden xl:grid xl:grid-cols-[1fr_auto_1fr] gap-6 items-center">
        <div className="flex justify-end"><Skeleton className="h-44 w-[260px] rounded-xl" /></div>
        <Skeleton className="aspect-square w-[420px] rounded-2xl" />
        <Skeleton className="h-72 w-[300px] rounded-xl" />
      </div>
      <div className="xl:hidden flex justify-center">
        <Skeleton className="aspect-square w-full max-w-sm rounded-2xl" />
      </div>
      {/* CTA */}
      <div className="flex justify-center">
        <Skeleton className="h-14 w-52 rounded-full" />
      </div>
    </div>
  )
}
