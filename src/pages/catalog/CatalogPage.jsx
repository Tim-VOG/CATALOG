import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useProducts, useReservationsInRange } from '@/hooks/use-products'
import { useCategories } from '@/hooks/use-categories'
import { useSubscriptionPlans } from '@/hooks/use-subscription-plans'
import { useProductOptions } from '@/hooks/use-product-options'
import { useCartStore } from '@/stores/cart-store'
import { useUIStore } from '@/stores/ui-store'
import { ProductCard } from '@/components/catalog/ProductCard'
import { CompactDateBar } from '@/components/catalog/CompactDateBar'
import { AnimateList, AnimateListItem, ScrollFadeIn } from '@/components/ui/motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CategoryBadge } from '@/components/common/CategoryBadge'
import { BlurImage } from '@/components/common/BlurImage'
import { Package, ArrowRight, Sparkles } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { QueryWrapper } from '@/components/common/QueryWrapper'
import { SkeletonCard } from '@/components/ui/skeleton'
import { useAnnounce } from '@/components/common/LiveRegion'
import { cn } from '@/lib/utils'

function HeroProduct({ product }) {
  if (!product) return null

  return (
    <ScrollFadeIn>
      <Link to={`/catalog/${product.id}`}>
        <Card
          variant="elevated"
          className="overflow-hidden group relative hover:shadow-card-hover transition-all duration-300"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 min-h-[200px]">
            {/* Left: text side */}
            <div className="p-6 md:p-8 flex flex-col justify-center relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 rounded-full px-3 py-1">
                  <Sparkles className="h-3 w-3" />
                  Featured
                </span>
                <CategoryBadge
                  name={product.category_name}
                  color={product.category_color}
                  subType={product.sub_type}
                />
              </div>
              <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight group-hover:text-primary transition-colors">
                {product.name}
              </h2>
              {product.description && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2 max-w-md">
                  {product.description}
                </p>
              )}
              <div className="mt-4">
                <Button size="sm" className="gap-2 rounded-full">
                  View Product <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Right: image side */}
            <div className="relative aspect-[16/10] md:aspect-auto overflow-hidden">
              <BlurImage
                src={product.image_url || 'https://via.placeholder.com/800x400?text=No+Image'}
                alt={product.name}
                className="transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-card via-card/40 to-transparent pointer-events-none hidden md:block" />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent pointer-events-none md:hidden" />
            </div>
          </div>
        </Card>
      </Link>
    </ScrollFadeIn>
  )
}

export function CatalogPage() {
  const [selectedCategory, setSelectedCategory] = useState('All')

  const productsQuery = useProducts()
  const products = productsQuery.data || []
  const { data: categories = [] } = useCategories()
  const { data: subscriptionPlans = [] } = useSubscriptionPlans()
  const { data: productOptions = [] } = useProductOptions()

  // Dates from cart store — persisted & shared with cart/checkout
  const startDate = useCartStore((s) => s.startDate)
  const endDate = useCartStore((s) => s.endDate)
  const setDates = useCartStore((s) => s.setDates)
  const addItem = useCartStore((s) => s.addItem)
  const cartItems = useCartStore((s) => s.items)
  const showToast = useUIStore((s) => s.showToast)
  const announce = useAnnounce()

  // Today's date for fallback availability
  const today = useMemo(() => new Date().toISOString().split('T')[0], [])
  const datesSelected = !!(startDate && endDate)

  // Fetch reservations overlapping the selected date range (or today if no dates selected)
  const queryStart = datesSelected ? startDate : today
  const queryEnd = datesSelected ? endDate : today
  const { data: reservedByProduct = {} } = useReservationsInRange(queryStart, queryEnd)

  // Featured product (first product with an image, or just the first product)
  const heroProduct = useMemo(
    () => products.find((p) => p.image_url) || products[0] || null,
    [products]
  )

  const filtered = products.filter((p) => {
    const matchesCategory =
      selectedCategory === 'All' || p.category_name === selectedCategory
    return matchesCategory
  })

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
          <div className="space-y-6">
            <div>
              <div className="h-8 w-64 bg-muted rounded animate-pulse" />
              <div className="h-4 w-96 bg-muted rounded animate-pulse mt-2" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight text-gradient-primary">Equipment Catalog</h1>
        <p className="text-muted-foreground mt-1">Browse and reserve equipment for your projects</p>
        <motion.div
          className="mt-3 h-0.5 w-16 rounded-full bg-primary/60"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ originX: 0 }}
        />
      </div>

      {/* Hero featured product */}
      {selectedCategory === 'All' && heroProduct && (
        <HeroProduct product={heroProduct} />
      )}

      {/* Compact date bar */}
      <CompactDateBar
        startDate={startDate}
        endDate={endDate}
        onChange={handleDatesChange}
      />

      {/* Category filters — animated pills */}
      <div className="flex flex-wrap gap-2">
        {[{ id: 'all', name: 'All' }, ...categories].map((c) => {
          const isActive = selectedCategory === c.name
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategory(c.name)}
              className={cn(
                'relative px-3 py-1.5 text-sm font-medium rounded-full transition-colors',
                isActive
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="category-pill"
                  className="absolute inset-0 rounded-full bg-primary"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{c.name}</span>
            </button>
          )
        })}
      </div>

      {/* Product grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No equipment found"
          description="No products in this category"
        />
      ) : (
        <ScrollFadeIn>
          <AnimateList
            key={selectedCategory}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
          >
            {filtered.map((product) => (
              <AnimateListItem key={product.id} className="h-full">
                <ProductCard
                  product={product}
                  cart={cartItems}
                  onAddToCart={handleAddToCart}
                  subscriptionPlans={subscriptionPlans}
                  productOptions={productOptions}
                  reservedQty={reservedByProduct[product.id] || 0}
                  datesSelected={datesSelected}
                />
              </AnimateListItem>
            ))}
          </AnimateList>
        </ScrollFadeIn>
      )}
    </div>
  )
}
