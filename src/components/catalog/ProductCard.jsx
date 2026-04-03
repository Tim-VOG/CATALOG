import { useState } from 'react'
import { format } from 'date-fns'
import { Check, ShoppingCart, CreditCard, Clock, Wifi, Phone, Package } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { BlurImage } from '@/components/common/BlurImage'
import { useCart, useAddToCart } from '@/hooks/use-cart'
import { useSubscriptionPlans } from '@/hooks/use-subscription-plans'
import { useUIStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'

// ── Category detection & per-category config ──
const CATEGORY_CONFIG = {
  phone: {
    match: ['iphone', 'phone', 'smartphone', 'mobile'],
    planTypes: ['call', 'data', 'both'],
    accessories: ['Charger', 'USB-C Cable', 'Protective Case', 'Screen Protector'],
    icon: Phone,
    label: 'Phone',
  },
  router: {
    match: ['5g router', 'router', 'modem'],
    planTypes: ['data'],
    accessories: ['Power Adapter', 'Ethernet Cable'],
    icon: Wifi,
    label: 'Router',
  },
}

function getCategoryConfig(categoryName) {
  if (!categoryName) return null
  const lower = categoryName.toLowerCase()
  for (const [, config] of Object.entries(CATEGORY_CONFIG)) {
    if (config.match.some((m) => lower.includes(m))) return config
  }
  return null
}

function needsOptions(categoryName) {
  return getCategoryConfig(categoryName) !== null
}

// ── Options Dialog ──
function OptionsDialog({ product, open, onClose, onConfirm }) {
  const { data: allPlans = [] } = useSubscriptionPlans()
  const config = getCategoryConfig(product.category_name)

  const [selectedPlan, setSelectedPlan] = useState('')
  const [accessories, setAccessories] = useState([])

  // Filter plans by category
  const plans = config
    ? allPlans.filter((p) => config.planTypes.includes(p.type))
    : allPlans

  const availableAccessories = config?.accessories || []

  const toggleAccessory = (acc) => {
    setAccessories((prev) => prev.includes(acc) ? prev.filter((a) => a !== acc) : [...prev, acc])
  }

  const handleConfirm = () => {
    const options = { services: {}, accessories }
    if (selectedPlan) options.services.subscription_plan = selectedPlan
    onConfirm(options)
  }

  const selectionCount = (selectedPlan ? 1 : 0) + accessories.length
  const ConfigIcon = config?.icon || Package

  const typeBadge = {
    call: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    data: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
    both: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden" size="md">
        {/* Header with product info */}
        <div className="px-6 pt-6 pb-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            {product.image_url ? (
              <img src={product.image_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                <ConfigIcon className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                {config?.label || product.category_name} Options
              </p>
              <h3 className="font-display font-bold text-base">{product.name}</h3>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Subscription Plans */}
          {plans.length > 0 && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <CreditCard className="h-4 w-4 text-primary" />
                Subscription Plan
              </Label>
              <div className="space-y-2">
                {plans.map((plan) => {
                  const isSelected = selectedPlan === plan.name
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlan(isSelected ? '' : plan.name)}
                      className={cn(
                        'flex items-center justify-between w-full p-3.5 rounded-xl border-2 text-left transition-all text-sm',
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border hover:border-primary/30 hover:bg-muted/30'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          'h-4 w-4 rounded-full border-2 flex items-center justify-center transition-all',
                          isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                        )}>
                          {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                        </div>
                        <div>
                          <span className="font-medium">{plan.name}</span>
                          {plan.description && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">{plan.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className={cn('text-[10px]', typeBadge[plan.type] || '')}>
                          {plan.type === 'both' ? 'Call + Data' : plan.type === 'call' ? 'Call' : 'Data'}
                        </Badge>
                        <span className="text-xs font-semibold text-foreground">{plan.price}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Accessories */}
          {availableAccessories.length > 0 && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <Package className="h-4 w-4 text-primary" />
                Accessories
              </Label>
              <div className="space-y-1.5">
                {availableAccessories.map((acc) => {
                  const isChecked = accessories.includes(acc)
                  return (
                    <label
                      key={acc}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
                        isChecked
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-border hover:border-primary/20 hover:bg-muted/30'
                      )}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleAccessory(acc)}
                      />
                      <span className="text-sm font-medium">{acc}</span>
                      {isChecked && <Check className="h-3.5 w-3.5 text-primary ml-auto" />}
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer with summary */}
        <div className="px-6 py-4 border-t bg-muted/20">
          {selectionCount > 0 && (
            <p className="text-xs text-muted-foreground mb-3">
              {selectionCount} option{selectionCount !== 1 ? 's' : ''} selected
              {selectedPlan && <span> — <span className="text-primary font-medium">{selectedPlan}</span></span>}
              {accessories.length > 0 && <span> — {accessories.join(', ')}</span>}
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => { onConfirm({}); }} className="flex-1">
              Skip options
            </Button>
            <Button onClick={handleConfirm} className="flex-1 gap-2">
              <ShoppingCart className="h-4 w-4" />
              Add to Cart
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Exportable helper for CartPage ──
export { getCategoryConfig, needsOptions }

// ── Product Card ──
export function ProductCard({ product, reservedQty = 0 }) {
  const available = product.total_stock - reservedQty
  const outOfStock = available <= 0
  const { data: cartItems = [] } = useCart()
  const addToCart = useAddToCart()
  const showToast = useUIStore((s) => s.showToast)
  const cartItem = cartItems.find((i) => i.product_id === product.id)
  const inCart = !!cartItem
  const cartQty = cartItem?.quantity || 0
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

  const restockLabel = outOfStock && product.restock_date
    ? `Available ${format(new Date(product.restock_date + 'T12:00:00'), 'MMM d, yyyy')}`
    : null

  return (
    <>
      <Card spotlight={!outOfStock} className={cn(
        'overflow-hidden group transition-all duration-200 h-full flex flex-col',
        outOfStock
          ? 'grayscale-[60%] opacity-70'
          : 'hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/50'
      )}>
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <BlurImage
            src={product.image_url || 'https://via.placeholder.com/400x250?text=No+Image'}
            alt={product.name}
            className={cn('transition-transform duration-300', !outOfStock && 'group-hover:scale-105')}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
          {outOfStock && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50">
              <span className="text-sm font-bold text-foreground bg-background/90 px-4 py-1.5 rounded-full border border-border shadow-sm">Coming soon</span>
              {restockLabel && (
                <span className="mt-2 text-xs text-muted-foreground bg-background/80 px-3 py-1 rounded-full flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {restockLabel}
                </span>
              )}
            </div>
          )}
        </div>

        <CardContent className="p-5 flex-1 flex flex-col">
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">{product.category_name}</p>
          <h3 className="font-semibold text-base leading-tight">{product.name}</h3>
          {product.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{product.description}</p>
          )}

          <div className="pt-3 border-t mt-auto space-y-2.5">
            <div className="text-sm">
              {outOfStock ? (
                <span className="font-bold text-destructive">Out of stock</span>
              ) : (
                <>
                  <span className={cn('font-bold', available > 3 ? 'text-success' : 'text-warning')}>{available}</span>
                  <span className="text-muted-foreground"> in stock</span>
                </>
              )}
            </div>
            {!outOfStock ? (
              <Button
                size="sm"
                className={cn('w-full gap-2 rounded-lg text-xs font-semibold h-9', inCart ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : '')}
                onClick={handleAddToCart}
                disabled={addToCart.isPending}
              >
                {inCart ? <><Check className="h-3.5 w-3.5" /> In Cart ({cartQty})</> : <><ShoppingCart className="h-3.5 w-3.5" /> Add to Cart</>}
              </Button>
            ) : (
              <Button size="sm" variant="outline" className="w-full gap-2 rounded-lg text-xs h-9" disabled>
                <Clock className="h-3.5 w-3.5" /> Unavailable
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

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
