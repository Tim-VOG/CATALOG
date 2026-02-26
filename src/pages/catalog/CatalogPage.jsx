import { useState } from 'react'
import { useProducts, useReservationsInRange } from '@/hooks/use-products'
import { useCategories } from '@/hooks/use-categories'
import { useSubscriptionPlans } from '@/hooks/use-subscription-plans'
import { useProductOptions } from '@/hooks/use-product-options'
import { useCartStore } from '@/stores/cart-store'
import { useUIStore } from '@/stores/ui-store'
import { ProductCard } from '@/components/catalog/ProductCard'
import { DateRangeCalendar } from '@/components/catalog/DateRangeCalendar'
import { Search, CalendarRange } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/common/EmptyState'
import { PageLoading } from '@/components/common/LoadingSpinner'

export function CatalogPage() {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  const { data: products = [], isLoading: productsLoading } = useProducts()
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

  // Fetch reservations overlapping the selected date range
  const { data: reservedByProduct = {} } = useReservationsInRange(startDate, endDate)

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

  const handleDatesChange = (start, end) => {
    setDates(start, end)
  }

  if (productsLoading) return <PageLoading message="Loading catalog..." />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Equipment Catalog</h1>
        <p className="text-muted-foreground mt-1">Browse and reserve equipment for your projects</p>
      </div>

      {/* Calendar + Search + Filters row */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Left: Calendar */}
        <Card className="h-fit lg:sticky lg:top-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <CalendarRange className="h-4 w-4" />
              Loan Period
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <DateRangeCalendar
              startDate={startDate}
              endDate={endDate}
              onChange={handleDatesChange}
            />
          </CardContent>
        </Card>

        {/* Right: Search + Filters + Grid */}
        <div className="space-y-5">
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  cart={cartItems}
                  onAddToCart={handleAddToCart}
                  subscriptionPlans={subscriptionPlans}
                  productOptions={productOptions}
                  reservedQty={reservedByProduct[product.id] || 0}
                  datesSelected={!!(startDate && endDate)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
