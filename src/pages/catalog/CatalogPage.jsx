import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { useProducts, useReservationsInRange } from '@/hooks/use-products'
import { useCategories } from '@/hooks/use-categories'
import { useCart } from '@/hooks/use-cart'
import { useAuth } from '@/lib/auth'
import { ProductCard } from '@/components/catalog/ProductCard'
import { ScrollFadeIn } from '@/components/ui/motion'
import { Package, Search, ShoppingCart, SlidersHorizontal, QrCode } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { QueryWrapper } from '@/components/common/QueryWrapper'
import { SkeletonCard } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Name A-Z' },
  { value: 'name-desc', label: 'Name Z-A' },
  { value: 'stock-desc', label: 'Most stock' },
  { value: 'stock-asc', label: 'Least stock' },
]

function sortProducts(products, sortBy, reserved) {
  const list = [...products]
  switch (sortBy) {
    case 'name-asc': return list.sort((a, b) => a.name.localeCompare(b.name))
    case 'name-desc': return list.sort((a, b) => b.name.localeCompare(a.name))
    case 'stock-desc': return list.sort((a, b) => (b.total_stock - (reserved[b.id] || 0)) - (a.total_stock - (reserved[a.id] || 0)))
    case 'stock-asc': return list.sort((a, b) => (a.total_stock - (reserved[a.id] || 0)) - (b.total_stock - (reserved[b.id] || 0)))
    default: return list
  }
}

export function CatalogPage() {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [inStockOnly, setInStockOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('name-asc')

  const { isAdmin } = useAuth()
  const productsQuery = useProducts()
  const products = productsQuery.data || []
  const { data: categories = [] } = useCategories()
  const { data: cartItems = [] } = useCart()
  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0)

  const today = useMemo(() => new Date().toISOString().split('T')[0], [])
  const { data: reservedByProduct = {} } = useReservationsInRange(today, today)

  const categoryCounts = useMemo(() => {
    const counts = { All: products.length }
    for (const p of products) { counts[p.category_name || 'Other'] = (counts[p.category_name || 'Other'] || 0) + 1 }
    return counts
  }, [products])

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      if (selectedCategory !== 'All' && p.category_name !== selectedCategory) return false
      if (inStockOnly && (p.total_stock - (reservedByProduct[p.id] || 0)) <= 0) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return p.name.toLowerCase().includes(q) || (p.category_name || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)
      }
      return true
    })
    return sortProducts(list, sortBy, reservedByProduct)
  }, [products, selectedCategory, inStockOnly, searchQuery, sortBy, reservedByProduct])

  const totalInStock = products.filter((p) => (p.total_stock - (reservedByProduct[p.id] || 0)) > 0).length

  if (productsQuery.isLoading || productsQuery.isError) {
    return (
      <QueryWrapper query={productsQuery} skeleton={
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
          <div className="h-10 w-72 bg-muted rounded-xl animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      } />
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-foreground to-foreground/80 text-background px-8 py-10 mb-8">
        <div className="relative z-10">
          <motion.h1
            className="text-3xl sm:text-4xl font-display font-bold tracking-tight"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Equipment Catalog
          </motion.h1>
          <p className="text-background/60 mt-2 text-sm">
            {products.length} products · {totalInStock} in stock
          </p>

          {/* Search bar */}
          <div className="mt-6 flex gap-3 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search equipment..."
                className="pl-11 h-11 rounded-xl bg-background text-foreground border-0 shadow-lg"
              />
            </div>
            {cartCount > 0 && (
              <Link to="/cart">
                <Button size="lg" className="h-11 rounded-xl gap-2 bg-primary hover:bg-primary/90 shadow-lg">
                  <ShoppingCart className="h-4 w-4" />
                  <span className="font-bold">{cartCount}</span>
                </Button>
              </Link>
            )}
            {isAdmin && (
              <Link to="/scan">
                <Button variant="secondary" size="lg" className="h-11 rounded-xl gap-2 shadow-lg">
                  <QrCode className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-primary/5 blur-2xl" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Categories */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[{ id: 'all', name: 'All' }, ...categories].map((c) => {
            const isActive = selectedCategory === c.name
            const count = categoryCounts[c.name] || 0
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(c.name)}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200',
                  isActive
                    ? 'bg-foreground text-background shadow-md'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {c.name} <span className={cn('ml-1', isActive ? 'text-background/60' : 'text-muted-foreground/60')}>{count}</span>
              </button>
            )
          })}
        </div>

        <div className="flex-1" />

        {/* In stock toggle */}
        <button
          type="button"
          onClick={() => setInStockOnly(!inStockOnly)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
            inStockOnly
              ? 'bg-emerald-500/15 text-emerald-500 ring-1 ring-emerald-500/30'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          )}
        >
          <div className={cn('w-2 h-2 rounded-full', inStockOnly ? 'bg-emerald-500' : 'bg-muted-foreground/30')} />
          In stock
        </button>

        {/* Sort */}
        <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-1">
          <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border-0 bg-transparent text-sm h-8 w-32">
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
      </div>

      {/* Results info */}
      {(searchQuery || inStockOnly || selectedCategory !== 'All') && (
        <p className="text-xs text-muted-foreground mb-4">
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          {searchQuery && <> for "{searchQuery}"</>}
        </p>
      )}

      {/* Product grid */}
      {filtered.length === 0 ? (
        <EmptyState icon={Package} title="No equipment found" description={searchQuery ? 'Try different keywords' : 'No products match your filters'} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {filtered.map((product, i) => (
            <ScrollFadeIn key={product.id} delay={i * 0.03}>
              <ProductCard product={product} reservedQty={reservedByProduct[product.id] || 0} />
            </ScrollFadeIn>
          ))}
        </div>
      )}

      <div className="h-16" />
    </div>
  )
}
