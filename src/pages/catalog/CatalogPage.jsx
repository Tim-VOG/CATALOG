import { useState, useMemo } from 'react'
import { usePageTitle } from '@/hooks/use-page-title'
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
import { Package, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/common/EmptyState'
import { QueryWrapper } from '@/components/common/QueryWrapper'
import { SkeletonCard } from '@/components/ui/skeleton'
import { useAnnounce } from '@/components/common/LiveRegion'
import { cn } from '@/lib/utils'

export function CatalogPage() {
  usePageTitle('Catalog')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

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

  const filtered = products.filter((p) => {
    const matchesCategory =
      selectedCategory === 'All' || p.category_name === selectedCategory
    const matchesSearch = !searchQuery ||
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
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

      {/* Compact date bar */}
      <CompactDateBar
        startDate={startDate}
        endDate={endDate}
        onChange={handleDatesChange}
      />

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search equipment..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 max-w-sm"
        />
      </div>

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
