import { useParams, Link } from 'react-router-dom'
import { useProduct, useProductReservations } from '@/hooks/use-products'
import { useLoans } from '@/hooks/use-loans'
import { useCartStore } from '@/stores/cart-store'
import { useUIStore } from '@/stores/ui-store'
import { ArrowLeft, Plus, Check, WifiOff, AlertTriangle, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { AvailabilityCalendar } from '@/components/calendar/AvailabilityCalendar'
import { cn } from '@/lib/utils'

export function ProductDetailPage() {
  const { productId } = useParams()
  const { data: product, isLoading } = useProduct(productId)
  const { data: loans = [] } = useLoans()
  const { data: reservations = [] } = useProductReservations(productId)
  const addItem = useCartStore((s) => s.addItem)
  const cartItems = useCartStore((s) => s.items)
  const showToast = useUIStore((s) => s.showToast)

  if (isLoading) return <PageLoading />
  if (!product) return <div className="text-center py-16 text-muted-foreground">Product not found</div>

  const activeLoans = loans.filter(
    (l) => l.product_id === product.id && (l.status === 'active' || l.status === 'pending')
  )
  const borrowed = activeLoans.reduce((sum, l) => sum + l.quantity, 0)
  const inCart = cartItems.find((c) => c.product.id === product.id)?.quantity || 0
  const available = product.total_stock - borrowed - inCart

  const handleAdd = () => {
    addItem(product, 1, {})
    showToast(`${product.name} added to cart`)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link to="/catalog">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to catalog
        </Button>
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <div className="aspect-[4/3] rounded-lg overflow-hidden bg-muted">
            <img
              src={product.image_url || 'https://via.placeholder.com/600x400?text=No+Image'}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Badge style={{ backgroundColor: product.category_color || '#6b7280' }}>
              {product.category_name}
              {product.sub_type && ` - ${product.sub_type}`}
            </Badge>
            <h1 className="text-2xl font-display font-bold mt-2">{product.name}</h1>
            <p className="text-muted-foreground mt-2">{product.description}</p>
          </div>

          {product.includes?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Included</h3>
              <div className="flex flex-wrap gap-2">
                {product.includes.map((item, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-xs bg-muted rounded px-2 py-1">
                    <Check className="h-3 w-3 text-success" />{item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {product.wifi_only && (
            <div className="flex items-center gap-2 text-sm text-warning">
              <WifiOff className="h-4 w-4" /> WiFi only - No cellular
            </div>
          )}

          {product.printer_info && (
            <div className="flex items-center gap-2 text-sm text-warning">
              <AlertTriangle className="h-4 w-4" /> B&W Laser - Print only
            </div>
          )}

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">Current availability</span>
                <span className={cn(
                  'font-bold text-lg',
                  available > 3 ? 'text-success' : available > 0 ? 'text-warning' : 'text-destructive'
                )}>
                  {available} / {product.total_stock}
                </span>
              </div>
              <Button className="w-full gap-2" onClick={handleAdd} disabled={available <= 0}>
                <Plus className="h-4 w-4" />
                Add to Cart
              </Button>
            </CardContent>
          </Card>

          {product.specs && Object.keys(product.specs).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Specifications</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2 text-sm">
                  {Object.entries(product.specs).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <dt className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</dt>
                      <dd className="font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Availability Calendar — full width below the 2-column grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Availability Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AvailabilityCalendar
            reservations={reservations}
            totalStock={product.total_stock}
          />
        </CardContent>
      </Card>
    </div>
  )
}
