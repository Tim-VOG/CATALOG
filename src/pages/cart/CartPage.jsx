import { Link, useNavigate } from 'react-router-dom'
import { useCartStore } from '@/stores/cart-store'
import { useReservationsInRange } from '@/hooks/use-products'
import { useProducts } from '@/hooks/use-products'
import { useAuth } from '@/lib/auth'
import { ShoppingCart, Minus, Plus, Trash2, CalendarRange, ArrowRight, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/common/EmptyState'
import { cn } from '@/lib/utils'

export function CartPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { items, startDate, endDate, updateQuantity, removeItem } = useCartStore()
  const { data: products = [] } = useProducts()
  const { data: reservedByProduct = {} } = useReservationsInRange(startDate, endDate)

  const checkAvailability = (productId, qty) => {
    if (!startDate || !endDate) return true
    const reserved = reservedByProduct[productId] || 0
    const product = products.find((p) => p.id === productId)
    return product && product.total_stock - reserved >= qty
  }

  const allAvailable = items.every((i) => checkAvailability(i.product.id, i.quantity))
  const canProceed = items.length > 0 && startDate && endDate && allAvailable

  const formatDate = (s) => {
    if (!s) return '—'
    const d = new Date(s + 'T00:00:00')
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title="Your cart is empty"
        description="Browse the catalog to add equipment to your cart"
      >
        <Link to="/catalog">
          <Button>Browse Catalog</Button>
        </Link>
      </EmptyState>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Your Cart</h1>
        <p className="text-muted-foreground mt-1">{items.length} item{items.length > 1 ? 's' : ''}</p>
      </div>

      {/* Loan period summary — dates are set in the catalog */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarRange className="h-4 w-4" />
            Loan Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          {startDate && endDate ? (
            <div className="flex items-center justify-between">
              <p className="text-sm">
                <span className="font-medium">{formatDate(startDate)}</span>
                <span className="text-muted-foreground mx-2">→</span>
                <span className="font-medium">{formatDate(endDate)}</span>
              </p>
              <Link to="/catalog">
                <Button variant="outline" size="sm">Change dates</Button>
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-destructive">No loan period selected</p>
              <Link to="/catalog">
                <Button variant="outline" size="sm" className="gap-1">
                  <ArrowLeft className="h-3 w-3" />
                  Select dates in catalog
                </Button>
              </Link>
            </div>
          )}
          {startDate && endDate && !allAvailable && (
            <p className="text-sm text-destructive mt-3">Some items are not available for this period.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {items.map((item) => {
            const isAvailable = checkAvailability(item.product.id, item.quantity)
            return (
              <div key={item.product.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                <div className="h-16 w-16 rounded-md overflow-hidden bg-muted shrink-0">
                  <img
                    src={item.product.image_url}
                    alt={item.product.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{item.product.name}</h4>
                  <p className="text-xs text-muted-foreground">{item.product.category_name}</p>
                  {startDate && endDate && (
                    <span className={cn('text-xs', isAvailable ? 'text-success' : 'text-destructive')}>
                      {isAvailable ? 'Available' : 'Not available for this period'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center font-medium">{item.quantity}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeItem(item.product.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-4">
            Requesting as: <strong>{profile?.first_name} {profile?.last_name}</strong> ({user?.email})
          </p>
          <Button className="w-full gap-2" size="lg" disabled={!canProceed} onClick={() => navigate('/checkout')}>
            Continue to Project Form
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
