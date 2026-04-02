import { useState, useMemo } from 'react'
import { useProducts, useReservationsInRange } from '@/hooks/use-products'
import { useCategories } from '@/hooks/use-categories'
import { useCart } from '@/hooks/use-cart'
import { useAuth } from '@/lib/auth'
import { ProductCard } from '@/components/catalog/ProductCard'
import { AnimateList, AnimateListItem, ScrollFadeIn } from '@/components/ui/motion'
import { Package, Search, ShoppingCart, Filter, ArrowUpDown, QrCode } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { QueryWrapper } from '@/components/common/QueryWrapper'
import { SkeletonCard } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
  { value: 'stock-desc', label: 'Stock (high to low)' },
  { value: 'stock-asc', label: 'Stock (low to high)' },
  { value: 'category', label: 'Category' },
]

function sortProducts(products, sortBy, reservedByProduct) {
  const list = [...products]
  switch (sortBy) {
    case 'name-asc': return list.sort((a, b) => a.name.localeCompare(b.name))
    case 'name-desc': return list.sort((a, b) => b.name.localeCompare(a.name))
    case 'stock-desc': return list.sort((a, b) => (b.total_stock - (reservedByProduct[b.id] || 0)) - (a.total_stock - (reservedByProduct[a.id] || 0)))
    case 'stock-asc': return list.sort((a, b) => (a.total_stock - (reservedByProduct[a.id] || 0)) - (b.total_stock - (reservedByProduct[b.id] || 0)))
    case 'category': return list.sort((a, b) => (a.category_name || '').localeCompare(b.category_name || ''))
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

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { All: products.length }
    for (const p of products) {
      const cat = p.category_name || 'Other'
      counts[cat] = (counts[cat] || 0) + 1
    }
    return counts
  }, [products])

  // Filter + sort
  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      if (selectedCategory !== 'All' && p.category_name !== selectedCategory) return false
      if (inStockOnly && (p.total_stock - (reservedByProduct[p.id] || 0)) <= 0) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        if (!p.name.toLowerCase().includes(q) && !(p.category_name || '').toLowerCase().includes(q) && !(p.description || '').toLowerCase().includes(q)) return false
      }
      return true
    })
    return sortProducts(list, sortBy, reservedByProduct)
  }, [products, selectedCategory, inStockOnly, searchQuery, sortBy, reservedByProduct])

  const totalInStock = products.filter((p) => (p.total_stock - (reservedByProduct[p.id] || 0)) > 0).length

  if (productsQuery.isLoading || productsQuery.isError) {
    return (
      <QueryWrapper
        query={productsQuery}
        skeleton={
          <div className="space-y-6">
            <div className="h-8 w-64 bg-muted rounded animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </div>
        }
      />
    )
  }

  return (
    <div className="space-y-5">
      {/* Header — compact */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Equipment Catalog</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{products.length} products available</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link to="/scan">
              <Button variant="outline" size="sm" className="gap-2">
                <QrCode className="h-3.5 w-3.5" /> Scan QR
              </Button>
            </Link>
          )}
          {cartCount > 0 && (
            <Link to="/cart">
              <Button size="sm" className="gap-2">
                <ShoppingCart className="h-3.5 w-3.5" />
                Cart ({cartCount})
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Search + Sort bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="pl-10 rounded-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-44 text-sm">
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </div>
      </div>

      {/* Filters: in-stock toggle + category pills with counts */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setInStockOnly(!inStockOnly)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full border transition-colors',
            inStockOnly
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
              : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          <Filter className="h-3 w-3" />
          In stock ({totalInStock})
        </button>

        <div className="h-5 w-px bg-border/60 mx-1" />

        {[{ id: 'all', name: 'All' }, ...categories].map((c) => {
          const isActive = selectedCategory === c.name
          const count = categoryCounts[c.name] || 0
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategory(c.name)}
              className={cn(
                'relative px-3 py-1.5 text-sm font-medium rounded-full transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {c.name} ({count})
            </button>
          )
        })}
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {products.length} product{products.length !== 1 ? 's' : ''}
        {inStockOnly && ' (in stock only)'}
        {searchQuery.trim() && ` matching "${searchQuery}"`}
      </p>

      {/* Product grid — max 3 columns */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No equipment found"
          description={searchQuery ? 'Try a different search term' : 'No products match your filters'}
        />
      ) : (
        <ScrollFadeIn>
          <AnimateList
            key={`${selectedCategory}-${sortBy}`}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
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
