import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useProducts, useReservationsInRange } from '@/hooks/use-products'
import { useCategories } from '@/hooks/use-categories'
import { useSubscriptionPlans } from '@/hooks/use-subscription-plans'
import { useProductOptions } from '@/hooks/use-product-options'
import { useCartStore } from '@/stores/cart-store'
import { useUIStore } from '@/stores/ui-store'
import { useAppSettings } from '@/hooks/use-settings'
import { ProductCard } from '@/components/catalog/ProductCard'
import { CompactDateBar } from '@/components/catalog/CompactDateBar'
import { ScrollReveal, CountUp, DynamicsItem } from '@/components/ui/motion'
import { Package, Search, Layers, Box } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { QueryWrapper } from '@/components/common/QueryWrapper'
import { SkeletonCard } from '@/components/ui/skeleton'
import { useAnnounce } from '@/components/common/LiveRegion'
import { cn } from '@/lib/utils'

export function CatalogPage() {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  const productsQuery = useProducts()
  const products = productsQuery.data || []
  const { data: categories = [] } = useCategories()
  const { data: subscriptionPlans = [] } = useSubscriptionPlans()
  const { data: productOptions = [] } = useProductOptions()
  const { data: appSettings } = useAppSettings()
  const cs = appSettings?.catalog_settings || {}

  // Dates from cart store
  const startDate = useCartStore((s) => s.startDate)
  const endDate = useCartStore((s) => s.endDate)
  const setDates = useCartStore((s) => s.setDates)
  const addItem = useCartStore((s) => s.addItem)
  const cartItems = useCartStore((s) => s.items)
  const showToast = useUIStore((s) => s.showToast)
  const announce = useAnnounce()

  const today = useMemo(() => new Date().toISOString().split('T')[0], [])
  const datesSelected = !!(startDate && endDate)
  const queryStart = datesSelected ? startDate : today
  const queryEnd = datesSelected ? endDate : today
  const { data: reservedByProduct = {} } = useReservationsInRange(queryStart, queryEnd)

  // Filter products
  const filtered = products.filter((p) => {
    const matchesCategory = selectedCategory === 'All' || p.category_name === selectedCategory
    const matchesSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Stats
  const totalAvailable = products.reduce((sum, p) => {
    const reserved = reservedByProduct[p.id] || 0
    return sum + Math.max(p.total_stock - reserved, 0)
  }, 0)

  const handleAddToCart = (product, qty, options) => {
    addItem(product, qty, options)
    showToast(`${product.name} added to cart`)
    announce(`${product.name} added to cart`)
  }

  const handleDatesChange = (start, end) => {
    setDates(start, end)
  }

  if (productsQuery.isLoading || productsQuery.isError) {
    return (
      <QueryWrapper
        query={productsQuery}
        skeleton={
          <div className="space-y-8">
            {/* Hero skeleton */}
            <div className="relative rounded-2xl bg-muted/30 p-8 space-y-4">
              <div className="h-10 w-72 bg-muted rounded-lg animate-pulse" />
              <div className="h-5 w-96 bg-muted rounded animate-pulse" />
              <div className="flex gap-4 mt-6">
                <div className="h-20 w-32 bg-muted rounded-xl animate-pulse" />
                <div className="h-20 w-32 bg-muted rounded-xl animate-pulse" />
                <div className="h-20 w-32 bg-muted rounded-xl animate-pulse" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        }
      />
    )
  }

  return (
    <div className="space-y-8 pb-16">
      {/* ── Hero Section ────────────────────────────────────── */}
      <ScrollReveal direction="down">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-muted/60 via-card/40 to-muted/30 border border-border/30 p-6 sm:p-8">
          {/* Background decorations */}
          <div className="absolute inset-0 bg-dot-grid opacity-[0.04] pointer-events-none" />
          <motion.div
            className="absolute -top-20 -right-20 w-[300px] h-[300px] rounded-full bg-primary/[0.06] blur-[80px] pointer-events-none"
            animate={{ x: [0, 20, -10, 0], y: [0, -15, 10, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -bottom-16 -left-16 w-[250px] h-[250px] rounded-full bg-accent/[0.05] blur-[70px] pointer-events-none"
            animate={{ x: [0, -15, 10, 0], y: [0, 10, -8, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="relative z-10">
            {/* Title */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-gradient-primary">
                  {cs.hero_title || 'Equipment Catalog'}
                </h1>
                <p className="text-muted-foreground mt-1.5 text-sm sm:text-base max-w-lg">
                  {cs.hero_subtitle || 'Browse and reserve equipment for your projects'}
                </p>
                <motion.div
                  className="mt-3 h-1 w-16 rounded-full bg-gradient-to-r from-primary to-accent"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  style={{ originX: 0 }}
                />
              </div>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-3 mt-6">
              <StatChip
                icon={Box}
                label="Products"
                value={products.length}
                gradient="from-blue-500/15 to-cyan-500/10"
                iconColor="text-blue-400"
              />
              <StatChip
                icon={Layers}
                label="Categories"
                value={categories.length}
                gradient="from-violet-500/15 to-purple-500/10"
                iconColor="text-violet-400"
              />
              <StatChip
                icon={Package}
                label="Available"
                value={totalAvailable}
                gradient="from-emerald-500/15 to-green-500/10"
                iconColor="text-emerald-400"
              />
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* ── Date selector ───────────────────────────────────── */}
      <CompactDateBar
        startDate={startDate}
        endDate={endDate}
        onChange={handleDatesChange}
      />

      {/* ── Search + Category filters ───────────────────────── */}
      <div className="space-y-4">
        {/* Search */}
        <motion.div
          className="relative"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search equipment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full h-10 pl-10 pr-4 rounded-xl border border-border/50 bg-muted/30',
              'text-sm placeholder:text-muted-foreground/50',
              'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40',
              'transition-all duration-200'
            )}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors text-xs"
            >
              Clear
            </button>
          )}
        </motion.div>

        {/* Category pills */}
        <motion.div
          className="flex flex-wrap gap-2"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          {[{ id: 'all', name: 'All' }, ...categories].map((c) => {
            const isActive = selectedCategory === c.name
            const count = c.name === 'All'
              ? products.length
              : products.filter((p) => p.category_name === c.name).length
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(c.name)}
                className={cn(
                  'relative px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200',
                  isActive
                    ? 'text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="category-pill"
                    className="absolute inset-0 rounded-full bg-primary shadow-glow-primary"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  {c.name}
                  <span className={cn(
                    'text-[10px] tabular-nums rounded-full px-1.5 py-0.5 font-semibold',
                    isActive
                      ? 'bg-white/20 text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {count}
                  </span>
                </span>
              </button>
            )
          })}
        </motion.div>
      </div>

      {/* ── Results count ───────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
          {selectedCategory !== 'All' && ` in ${selectedCategory}`}
          {searchQuery && ` matching "${searchQuery}"`}
        </p>
      </div>

      {/* ── Product Grid ────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {filtered.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <EmptyState
              icon={Package}
              title="No equipment found"
              description={searchQuery ? `No results for "${searchQuery}"` : 'No products in this category'}
            />
          </motion.div>
        ) : (
          <motion.div
            key={`${selectedCategory}-${searchQuery}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
              (cs.cards_per_row === 5) ? 'xl:grid-cols-5' : (cs.cards_per_row === 3) ? 'xl:grid-cols-3' : 'xl:grid-cols-4'
            )}
          >
            {filtered.map((product, i) => (
              <DynamicsItem key={product.id} index={i} className="h-full">
                <ProductCard
                  product={product}
                  cart={cartItems}
                  onAddToCart={handleAddToCart}
                  subscriptionPlans={subscriptionPlans}
                  productOptions={productOptions}
                  reservedQty={reservedByProduct[product.id] || 0}
                  datesSelected={datesSelected}
                  showAvailability={cs.show_availability_badge !== false}
                  showIncludes={cs.show_includes_chips !== false}
                />
              </DynamicsItem>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Local Components ─────────────────────────────────── */

function StatChip({ icon: Icon, label, value, gradient, iconColor }) {
  return (
    <motion.div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r border border-white/[0.06] backdrop-blur-sm',
        gradient
      )}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <div className={cn('flex items-center justify-center h-9 w-9 rounded-lg bg-background/40', iconColor)}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-lg font-bold tabular-nums text-foreground">
          <CountUp value={value} />
        </div>
        <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{label}</div>
      </div>
    </motion.div>
  )
}
