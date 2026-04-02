import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { useProducts, useReservationsInRange } from '@/hooks/use-products'
import { useCategories } from '@/hooks/use-categories'
import { ProductCard } from '@/components/catalog/ProductCard'
import { AnimateList, AnimateListItem, ScrollFadeIn } from '@/components/ui/motion'
import { Package, QrCode, ShoppingCart } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { QueryWrapper } from '@/components/common/QueryWrapper'
import { SkeletonCard } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useCartStore } from '@/stores/cart-store'
import { cn } from '@/lib/utils'

function CartBanner() {
  const { isAdmin } = useAuth()
  const itemCount = useCartStore((s) => s.getItemCount())

  if (isAdmin) {
    return (
      <Card className="p-4 border-primary/20 bg-primary/5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <QrCode className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Need to take or return equipment?</p>
              <p className="text-xs text-muted-foreground">Scan the QR code on the item to update stock automatically.</p>
            </div>
          </div>
          <Link to="/scan">
            <Button size="sm" className="gap-2 shrink-0">
              <QrCode className="h-3.5 w-3.5" />
              Scan QR
            </Button>
          </Link>
        </div>
      </Card>
    )
  }

  if (itemCount > 0) {
    return (
      <Card className="p-4 border-primary/20 bg-primary/5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <ShoppingCart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">{itemCount} item{itemCount !== 1 ? 's' : ''} in your cart</p>
              <p className="text-xs text-muted-foreground">Ready to submit your equipment request?</p>
            </div>
          </div>
          <Link to="/cart">
            <Button size="sm" className="gap-2 shrink-0">
              <ShoppingCart className="h-3.5 w-3.5" />
              View Cart
            </Button>
          </Link>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4 border-border/40 bg-muted/20">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <ShoppingCart className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold">Add equipment to your cart</p>
          <p className="text-xs text-muted-foreground">Click "Add to Cart" on any product, then submit your request when ready.</p>
        </div>
      </div>
    </Card>
  )
}

export function CatalogPage() {
  const [selectedCategory, setSelectedCategory] = useState('All')

  const productsQuery = useProducts()
  const products = productsQuery.data || []
  const { data: categories = [] } = useCategories()

  // Today's date for availability
  const today = useMemo(() => new Date().toISOString().split('T')[0], [])
  const { data: reservedByProduct = {} } = useReservationsInRange(today, today)

  const filtered = products.filter((p) => {
    return selectedCategory === 'All' || p.category_name === selectedCategory
  })

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
        <p className="text-muted-foreground mt-1">View available equipment and stock levels</p>
        <motion.div
          className="mt-3 h-0.5 w-16 rounded-full bg-primary/60"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ originX: 0 }}
        />
      </div>

      {/* Cart prompt or admin QR prompt */}
      <CartBanner />

      {/* Category filters */}
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
                  reservedQty={reservedByProduct[product.id] || 0}
                />
              </AnimateListItem>
            ))}
          </AnimateList>
        </ScrollFadeIn>
      )}
    </div>
  )
}
