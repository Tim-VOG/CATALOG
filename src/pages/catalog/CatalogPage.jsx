import { useState } from 'react'
import { useProducts } from '@/hooks/use-products'
import { useCategories } from '@/hooks/use-categories'
import { useLoans } from '@/hooks/use-loans'
import { useSubscriptionPlans } from '@/hooks/use-subscription-plans'
import { useProductOptions } from '@/hooks/use-product-options'
import { useCartStore } from '@/stores/cart-store'
import { useUIStore } from '@/stores/ui-store'
import { ProductCard } from '@/components/catalog/ProductCard'
import { Search, Package } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { PageLoading } from '@/components/common/LoadingSpinner'

export function CatalogPage() {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  const { data: products = [], isLoading: productsLoading } = useProducts()
  const { data: categories = [] } = useCategories()
  const { data: loans = [] } = useLoans()
  const { data: subscriptionPlans = [] } = useSubscriptionPlans()
  const { data: productOptions = [] } = useProductOptions()
  const addItem = useCartStore((s) => s.addItem)
  const cartItems = useCartStore((s) => s.items)
  const showToast = useUIStore((s) => s.showToast)

  const filtered = products.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase())
    const matchesCategory =
      selectedCategory === 'All' || p.category_name === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleAddToCart = (product, qty, options) => {
    addItem(product, qty, options)
    showToast(`${product.name} added to cart`)
  }

  if (productsLoading) return <PageLoading message="Loading catalog..." />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Equipment Catalog</h1>
        <p className="text-muted-foreground mt-1">Browse and reserve equipment for your projects</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search equipment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === 'All' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('All')}
        >
          All
        </Button>
        {categories.map((c) => (
          <Button
            key={c.id}
            variant={selectedCategory === c.name ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(c.name)}
          >
            {c.name}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No equipment found"
          description={search ? `No results for "${search}"` : 'No products in this category'}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              loans={loans}
              cart={cartItems}
              onAddToCart={handleAddToCart}
              subscriptionPlans={subscriptionPlans}
              productOptions={productOptions}
            />
          ))}
        </div>
      )}
    </div>
  )
}
