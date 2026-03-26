import { useState, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { format, addDays } from 'date-fns'
import { ArrowLeft, Calendar, CheckCircle2, Package } from 'lucide-react'
import { useProduct } from '@/hooks/use-products'
import { useReservations, useCreateReservation } from '@/hooks/use-qr-reservations'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { CategoryBadge } from '@/components/common/CategoryBadge'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function ReservePage() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { data: product, isLoading } = useProduct(productId)
  const { data: existingReservations = [] } = useReservations({ productId, status: 'active' })
  const createReservation = useCreateReservation()

  const today = format(new Date(), 'yyyy-MM-dd')
  const [reserveDate, setReserveDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'))
  const [pickupBy, setPickupBy] = useState(format(addDays(new Date(), 2), 'yyyy-MM-dd'))
  const [success, setSuccess] = useState(false)

  const reservedOnDate = useMemo(() => {
    return existingReservations.filter(r => r.reserved_date === reserveDate).length
  }, [existingReservations, reserveDate])

  const available = (product?.total_stock || 0) - reservedOnDate

  const handleReserve = async () => {
    if (!reserveDate || !pickupBy) return
    try {
      const userName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
      await createReservation.mutateAsync({
        product_id: productId,
        user_id: user.id,
        user_email: user.email,
        user_name: userName || user.email,
        reserved_date: reserveDate,
        pickup_by: pickupBy,
      })
      setSuccess(true)
      toast.success('Reservation confirmed!')
    } catch (err) {
      toast.error(err.message || 'Failed to reserve')
    }
  }

  if (isLoading) return <PageLoading />
  if (!product) return <div className="text-center py-16 text-muted-foreground">Product not found</div>

  return (
    <div className="max-w-md mx-auto py-6 px-4 space-y-6">
      <Link to={`/catalog/${productId}`}>
        <Button variant="ghost" size="sm" className="gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" /> Back to product
        </Button>
      </Link>

      <div>
        <h1 className="text-2xl font-display font-bold">Reserve Equipment</h1>
        <p className="text-muted-foreground text-sm mt-1">Book in advance — scan QR to pickup on the day</p>
      </div>

      {/* Product info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {product.image_url ? (
              <img src={product.image_url} alt="" className="w-14 h-14 rounded-xl object-cover bg-muted" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div>
              <h3 className="font-semibold">{product.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                {product.category_name && <CategoryBadge name={product.category_name} color={product.category_color} />}
                <span className="text-sm text-muted-foreground">Stock: {product.total_stock}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!success ? (
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Reservation Details</span>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Reserve for date</Label>
            <input
              type="date" value={reserveDate} min={today}
              onChange={(e) => {
                setReserveDate(e.target.value)
                if (e.target.value >= pickupBy) setPickupBy(format(addDays(new Date(e.target.value + 'T12:00:00'), 1), 'yyyy-MM-dd'))
              }}
              className="w-full h-10 px-3 mt-1 text-sm rounded-lg bg-muted/40 border border-border/50 focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Must pick up by (or reservation expires)</Label>
            <input
              type="date" value={pickupBy} min={reserveDate || today}
              onChange={(e) => setPickupBy(e.target.value)}
              className="w-full h-10 px-3 mt-1 text-sm rounded-lg bg-muted/40 border border-border/50 focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10"
            />
          </div>

          <div className={cn('text-sm p-3 rounded-lg', available > 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive')}>
            {available > 0 ? `${available} available on ${format(new Date(reserveDate + 'T12:00:00'), 'MMM d, yyyy')}` : 'No units available on this date'}
          </div>

          <Button
            onClick={handleReserve}
            disabled={available <= 0 || createReservation.isPending}
            loading={createReservation.isPending}
            className="w-full"
          >
            Confirm Reservation
          </Button>
        </Card>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="p-6 text-center border-2 border-success/30 bg-success/5">
            <CheckCircle2 className="h-14 w-14 mx-auto text-success mb-3" />
            <h3 className="text-lg font-display font-bold">Reserved!</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {product.name} reserved for {format(new Date(reserveDate + 'T12:00:00'), 'MMMM d, yyyy')}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Scan the QR code on the equipment to confirm pickup by {format(new Date(pickupBy + 'T12:00:00'), 'MMM d')}.
              If not picked up, the reservation will expire automatically.
            </p>
            <div className="flex gap-3 justify-center mt-4">
              <Link to="/catalog">
                <Button variant="outline" size="sm">Back to Catalog</Button>
              </Link>
              <Link to="/my-equipment">
                <Button size="sm">My Equipment</Button>
              </Link>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
