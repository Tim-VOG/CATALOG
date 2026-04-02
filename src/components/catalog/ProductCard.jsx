import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { Check, WifiOff, AlertTriangle, ShoppingCart, Plus, CreditCard, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { CategoryBadge } from '@/components/common/CategoryBadge'
import { BlurImage } from '@/components/common/BlurImage'
import { useCart, useAddToCart } from '@/hooks/use-cart'
import { useSubscriptionPlans } from '@/hooks/use-subscription-plans'
import { useUIStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'

const PHONE_ROUTER_CATEGORIES = ['iphone', 'phone', 'smartphone', 'mobile', '5g router', 'router', 'modem']
const ACCESSORY_OPTIONS = ['Protective Case', 'Fast Charger', 'Screen Protector', 'Car Charger']

function needsOptions(categoryName) {
  if (!categoryName) return false
  return PHONE_ROUTER_CATEGORIES.some((c) => categoryName.toLowerCase().includes(c))
}

// ── Options Dialog (phone/router only) ──
function OptionsDialog({ product, open, onClose, onConfirm }) {
  const { data: plans = [] } = useSubscriptionPlans()
  const [selectedPlan, setSelectedPlan] = useState('')
  const [insurance, setInsurance] = useState(false)
  const [accessories, setAccessories] = useState([])

  const toggleAccessory = (acc) => {
    setAccessories((prev) => prev.includes(acc) ? prev.filter((a) => a !== acc) : [...prev, acc])
  }

  const handleConfirm = () => {
    const options = { specifications: {}, services: {}, accessories }
    if (selectedPlan) options.services.subscription_plan = selectedPlan
    if (insurance) options.services.insurance = true
    onConfirm(options)
  }

  const typeBadge = { call: 'bg-blue-500/20 text-blue-400', data: 'bg-purple-500/20 text-purple-400', both: 'bg-cyan-500/20 text-cyan-400' }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Options — {product.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-sm font-semibold">
              <CreditCard className="h-3.5 w-3.5 text-muted-foreground" /> Subscription Plan
            </Label>
            {plans.length > 0 ? (
              <div className="space-y-1.5">
                {plans.map((plan) => {
                  const isSelected = selectedPlan === plan.name
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlan(isSelected ? '' : plan.name)}
                      className={cn(
                        'flex items-center justify-between w-full p-3 rounded-xl border text-left transition-all text-sm',
                        isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{plan.name}</span>
                        <Badge className={cn('text-[10px]', typeBadge[plan.type] || '')}>{plan.type}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{plan.price}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No plans available.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Accessories</Label>
            <div className="grid grid-cols-2 gap-2">
              {ACCESSORY_OPTIONS.map((acc) => (
                <label key={acc} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg border hover:bg-muted/30 transition-colors">
                  <Checkbox checked={accessories.includes(acc)} onCheckedChange={() => toggleAccessory(acc)} />
                  {acc}
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={insurance} onCheckedChange={setInsurance} />
            Insurance coverage
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Skip</Button>
          <Button onClick={handleConfirm} className="gap-2">
            <ShoppingCart className="h-4 w-4" /> Add to Cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Product Card ──
export function ProductCard({ product, reservedQty = 0 }) {
  const available = product.total_stock - reservedQty
  const outOfStock = available <= 0
  const { data: cartItems = [] } = useCart()
  const addToCart = useAddToCart()
  const showToast = useUIStore((s) => s.showToast)
  const inCart = cartItems.some((i) => i.product_id === product.id)
  const showOptions = needsOptions(product.category_name)
  const [optionsOpen, setOptionsOpen] = useState(false)

  const doAdd = (options = {}) => {
    addToCart.mutate(
      { productId: product.id, quantity: 1, options },
      {
        onSuccess: () => showToast(`${product.name} added to cart`),
        onError: (err) => showToast(err.message, 'error'),
      }
    )
  }

  const handleAddToCart = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (outOfStock) return
    if (showOptions && !inCart) {
      setOptionsOpen(true)
    } else {
      doAdd()
    }
  }

  const handleOptionsConfirm = (options) => {
    setOptionsOpen(false)
    doAdd(options)
  }

  // Restock date formatting
  const restockLabel = outOfStock && product.restock_date
    ? `Available ${format(new Date(product.restock_date + 'T12:00:00'), 'MMM d, yyyy')}`
    : null

  return (
    <>
      <Link to={`/catalog/${product.id}`} className="block h-full">
        <Card spotlight={!outOfStock} className={cn(
          'overflow-hidden group transition-all duration-200 h-full flex flex-col',
          outOfStock
            ? 'grayscale-[60%] opacity-70'
            : 'hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/50 active:scale-[0.98]'
        )}>
          <div className="relative aspect-[4/3] overflow-hidden bg-muted">
            <BlurImage
              src={product.image_url || 'https://via.placeholder.com/400x250?text=No+Image'}
              alt={product.name}
              className={cn('transition-transform duration-300', !outOfStock && 'group-hover:scale-105')}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
            <CategoryBadge className="absolute top-3 left-3" name={product.category_name} color={product.category_color} subType={product.sub_type} />

            {/* Out of stock overlay */}
            {outOfStock && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50">
                <span className="text-sm font-bold text-foreground bg-background/90 px-4 py-1.5 rounded-full border border-border shadow-sm">
                  Coming soon
                </span>
                {restockLabel && (
                  <span className="mt-2 text-xs text-muted-foreground bg-background/80 px-3 py-1 rounded-full flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {restockLabel}
                  </span>
                )}
              </div>
            )}

            {/* Add to cart hover button (desktop) — only when in stock */}
            {!outOfStock && (
              <div className="absolute bottom-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  className={cn(
                    'h-8 gap-1.5 rounded-full shadow-lg text-xs font-semibold',
                    inCart ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-primary hover:bg-primary/90'
                  )}
                  onClick={handleAddToCart}
                  disabled={addToCart.isPending}
                >
                  {inCart ? <><Check className="h-3 w-3" /> In Cart</> : <><Plus className="h-3 w-3" /> Add</>}
                </Button>
              </div>
            )}
          </div>

          <CardContent className="p-5 space-y-3 flex-1 flex flex-col">
            <h3 className="font-semibold text-base leading-tight group-hover:text-primary transition-colors">{product.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>

            {product.includes?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {product.includes.map((item, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted rounded px-2 py-0.5">
                    <Check className="h-3 w-3 text-success" />{item}
                  </span>
                ))}
              </div>
            )}

            {product.wifi_only && (
              <div className="flex items-center gap-1 text-xs text-warning"><WifiOff className="h-3 w-3" /> WiFi only</div>
            )}
            {product.printer_info && (
              <div className="flex items-center gap-1 text-xs text-warning"><AlertTriangle className="h-3 w-3" /> B&W Laser</div>
            )}

            {/* Stock + Add to Cart footer */}
            <div className="pt-3 border-t mt-auto space-y-2.5">
              {/* Stock display */}
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  {outOfStock ? (
                    <span className="font-bold text-destructive">Out of stock</span>
                  ) : (
                    <>
                      <span className={cn('font-bold', available > 3 ? 'text-success' : 'text-warning')}>
                        {available}
                      </span>
                      <span className="text-muted-foreground"> in stock</span>
                    </>
                  )}
                </div>
              </div>

              {/* Always-visible Add to Cart button */}
              {!outOfStock ? (
                <Button
                  size="sm"
                  className={cn(
                    'w-full gap-2 rounded-lg text-xs font-semibold h-9',
                    inCart
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      : ''
                  )}
                  onClick={handleAddToCart}
                  disabled={addToCart.isPending}
                >
                  {inCart ? (
                    <><Check className="h-3.5 w-3.5" /> In Cart</>
                  ) : (
                    <><ShoppingCart className="h-3.5 w-3.5" /> Add to Cart</>
                  )}
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="w-full gap-2 rounded-lg text-xs h-9" disabled>
                  <Clock className="h-3.5 w-3.5" /> Unavailable
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>

      {optionsOpen && (
        <OptionsDialog
          product={product}
          open={optionsOpen}
          onClose={() => setOptionsOpen(false)}
          onConfirm={handleOptionsConfirm}
        />
      )}
    </>
  )
}
