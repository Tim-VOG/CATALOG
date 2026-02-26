import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useProduct, useProductReservations } from '@/hooks/use-products'
import { useLoans } from '@/hooks/use-loans'
import { useCartStore } from '@/stores/cart-store'
import { useUIStore } from '@/stores/ui-store'
import { ArrowLeft, Plus, Check, WifiOff, AlertTriangle, CalendarDays, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { QueryWrapper } from '@/components/common/QueryWrapper'
import { CategoryBadge } from '@/components/common/CategoryBadge'
import { BlurImage } from '@/components/common/BlurImage'
import { Skeleton, SkeletonText } from '@/components/ui/skeleton'
import { AvailabilityCalendar } from '@/components/calendar/AvailabilityCalendar'
import { cn } from '@/lib/utils'

export function ProductDetailPage() {
  const { productId } = useParams()
  const productQuery = useProduct(productId)
  const { data: loans = [] } = useLoans()
  const { data: reservations = [] } = useProductReservations(productId)
  const addItem = useCartStore((s) => s.addItem)
  const cartItems = useCartStore((s) => s.items)
  const showToast = useUIStore((s) => s.showToast)
  const [calendarOpen, setCalendarOpen] = useState(false)

  const product = productQuery.data

  if (productQuery.isLoading || productQuery.isError) {
    return (
      <QueryWrapper
        query={productQuery}
        skeleton={
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-8 w-32" />
            <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] gap-8">
              <Skeleton className="aspect-square w-full rounded-xl" />
              <div className="space-y-4">
                <Skeleton className="h-6 w-24 rounded-md" />
                <Skeleton className="h-8 w-3/4" />
                <SkeletonText lines={3} />
                <Skeleton className="h-32 w-full rounded-lg" />
              </div>
            </div>
          </div>
        }
      />
    )
  }
  if (!product) return <div className="text-center py-16 text-muted-foreground">Product not found</div>

  const activeLoans = loans.filter(
    (l) => l.product_id === product.id && (l.status === 'active' || l.status === 'pending')
  )
  const borrowed = activeLoans.reduce((sum, l) => sum + l.quantity, 0)
  const inCart = cartItems.find((c) => c.product.id === product.id)?.quantity || 0
  const available = product.total_stock - borrowed - inCart
  const hasWarnings = product.wifi_only || product.printer_info

  const handleAdd = () => {
    addItem(product, 1, {})
    showToast(`${product.name} added to cart`)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link to="/catalog">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to catalog
        </Button>
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] gap-8">
        {/* Product image — compact square */}
        <div className="group">
          <BlurImage
            src={product.image_url || 'https://via.placeholder.com/400x400?text=No+Image'}
            alt={product.name}
            containerClassName="aspect-square rounded-xl"
            className="transition-transform duration-500 group-hover:scale-105"
          />
        </div>

        {/* Product info */}
        <div className="space-y-5">
          <div>
            <CategoryBadge
              name={product.category_name}
              color={product.category_color}
              subType={product.sub_type}
            />
            <h1 className="text-3xl font-display font-bold mt-2 tracking-tight">{product.name}</h1>
            <p className="text-muted-foreground mt-2 leading-relaxed">{product.description}</p>
          </div>

          {product.includes?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">What's included</h3>
              <div className="flex flex-wrap gap-2">
                {product.includes.map((item, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 text-xs bg-muted rounded-md px-2.5 py-1.5">
                    <Check className="h-3 w-3 text-success" />{item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {hasWarnings && (
            <div className="space-y-2 bg-warning/10 rounded-lg p-3">
              {product.wifi_only && (
                <div className="flex items-center gap-2 text-sm text-warning">
                  <WifiOff className="h-4 w-4 shrink-0" /> WiFi only - No cellular
                </div>
              )}
              {product.printer_info && (
                <div className="flex items-center gap-2 text-sm text-warning">
                  <AlertTriangle className="h-4 w-4 shrink-0" /> B&W Laser - Print only
                </div>
              )}
            </div>
          )}

          {/* Availability + Add to cart */}
          <Card variant="elevated">
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
            <Card variant="elevated">
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

      {/* Collapsible Availability Calendar */}
      <div className="border rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setCalendarOpen(!calendarOpen)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors"
        >
          <span className="flex items-center gap-2 text-base font-semibold">
            <CalendarDays className="h-4 w-4 text-primary" />
            Availability Calendar
          </span>
          <ChevronDown className={cn(
            'h-4 w-4 text-muted-foreground transition-transform duration-200',
            calendarOpen && 'rotate-180'
          )} />
        </button>
        <AnimatePresence initial={false}>
          {calendarOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-6 pt-2 border-t">
                <AvailabilityCalendar
                  reservations={reservations}
                  totalStock={product.total_stock}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
