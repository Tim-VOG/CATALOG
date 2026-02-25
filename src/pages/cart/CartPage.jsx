import { Link, useNavigate } from 'react-router-dom'
import { useCartStore } from '@/stores/cart-store'
import { useLoans } from '@/hooks/use-loans'
import { useProducts } from '@/hooks/use-products'
import { useAuth } from '@/lib/auth'
import { ShoppingCart, Minus, Plus, Trash2, Calendar, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/common/EmptyState'
import { cn } from '@/lib/utils'

export function CartPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { items, startDate, endDate, setDates, updateQuantity, removeItem } = useCartStore()
  const { data: loans = [] } = useLoans()
  const { data: products = [] } = useProducts()

  const checkAvailability = (productId, qty) => {
    if (!startDate || !endDate) return true
    const overlaps = loans.filter(
      (l) =>
        l.product_id === productId &&
        (l.status === 'active' || l.status === 'pending') &&
        !(endDate < l.pickup_date || startDate > l.return_date)
    )
    const borrowed = overlaps.reduce((s, l) => s + l.quantity, 0)
    const product = products.find((p) => p.id === productId)
    return product && product.total_stock - borrowed >= qty
  }

  const allAvailable = items.every((i) => checkAvailability(i.product.id, i.quantity))
  const canProceed = items.length > 0 && startDate && endDate && allAvailable

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Loan Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Pickup Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setDates(e.target.value, endDate)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-1">
              <Label>Return Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setDates(startDate, e.target.value)}
                min={startDate || new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
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
                      {isAvailable ? 'Available' : 'Not available'}
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
