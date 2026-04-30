import { useState } from 'react'
import { format } from 'date-fns'
import { Check, ShoppingCart, CreditCard, Clock, Plus } from 'lucide-react'
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

const PHONE_ROUTER_CATEGORIES = ['iphone', 'phone', 'smartphone', 'mobile', '5g router', 'router', 'modem']
const CATEGORY_CONFIG = {
  phone: { match: ['iphone', 'phone', 'smartphone', 'mobile'], planTypes: ['call', 'data', 'both'], accessories: ['Charger', 'USB-C Cable', 'Protective Case', 'Screen Protector'] },
  router: { match: ['5g router', 'router', 'modem'], planTypes: ['data'], accessories: ['Power Adapter', 'Ethernet Cable'] },
}

function getCategoryConfig(categoryName) {
  if (!categoryName) return null
  const lower = categoryName.toLowerCase()
  for (const [, config] of Object.entries(CATEGORY_CONFIG)) {
    if (config.match.some((m) => lower.includes(m))) return config
  }
  return null
}

export function needsOptions(categoryName) { return getCategoryConfig(categoryName) !== null }
export { getCategoryConfig }

function OptionsDialog({ product, open, onClose, onConfirm }) {
  const { data: allPlans = [] } = useSubscriptionPlans()
  const config = getCategoryConfig(product.category_name)
  const [selectedPlan, setSelectedPlan] = useState('')
  const [accessories, setAccessories] = useState([])
  const plans = config ? allPlans.filter((p) => config.planTypes.includes(p.type)) : allPlans
  const availableAccessories = config?.accessories || []
  const toggleAcc = (a) => setAccessories((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a])
  const typeBadge = { call: 'bg-blue-500/15 text-blue-400', data: 'bg-purple-500/15 text-purple-400', both: 'bg-cyan-500/15 text-cyan-400' }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden" size="md">
        <div className="px-6 pt-6 pb-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            {product.image_url && <img src={product.image_url} alt="" className="w-12 h-12 rounded-xl object-cover" />}
            <div>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Options</p>
              <h3 className="font-display font-bold text-base">{product.name}</h3>
            </div>
          </div>
        </div>
        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {plans.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-semibold"><CreditCard className="h-4 w-4 text-primary" /> Subscription Plan</Label>
              <div className="space-y-1.5">
                {plans.map((plan) => (
                  <button key={plan.id} type="button" onClick={() => setSelectedPlan(selectedPlan === plan.name ? '' : plan.name)}
                    className={cn('flex items-center justify-between w-full p-3 rounded-xl border-2 text-left transition-all text-sm', selectedPlan === plan.name ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30')}>
                    <div className="flex items-center gap-2"><span className="font-medium">{plan.name}</span><Badge className={cn('text-[10px]', typeBadge[plan.type])}>{plan.type}</Badge></div>
                    <div className="flex items-center gap-2"><span className="text-muted-foreground">{plan.price}</span>{selectedPlan === plan.name && <Check className="h-3.5 w-3.5 text-primary" />}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {availableAccessories.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Accessories</Label>
              {availableAccessories.map((a) => (
                <label key={a} className={cn('flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all', accessories.includes(a) ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-primary/20')}>
                  <Checkbox checked={accessories.includes(a)} onCheckedChange={() => toggleAcc(a)} /><span className="text-sm">{a}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t bg-muted/20 flex gap-3">
          <Button variant="outline" onClick={() => onConfirm({})} className="flex-1">Skip</Button>
          <Button onClick={() => { const o = { services: {}, accessories }; if (selectedPlan) o.services.subscription_plan = selectedPlan; onConfirm(o) }} className="flex-1 gap-2"><ShoppingCart className="h-4 w-4" /> Add</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function ProductCard({ product }) {
  const available = product.total_stock
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
    addToCart.mutate({ productId: product.id, quantity: 1, options }, {
      onSuccess: () => showToast(`${product.name} added to cart`),
      onError: (err) => showToast(err.message, 'error'),
    })
  }

  const handleAdd = (e) => {
    e?.preventDefault?.(); e?.stopPropagation?.()
    if (outOfStock) return
    if (showOptions && !inCart) setOptionsOpen(true)
    else doAdd()
  }

  const restockLabel = outOfStock && product.restock_date
    ? format(new Date(product.restock_date + 'T12:00:00'), 'MMM d, yyyy')
    : null

  return (
    <>
      <div className={cn(
        'group relative rounded-2xl overflow-hidden transition-all duration-300',
        'bg-card border border-border/40',
        outOfStock ? 'opacity-60' : 'hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 hover:border-primary/20'
      )}>
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-muted/50 to-muted">
          <BlurImage
            src={product.image_url || 'https://via.placeholder.com/400?text=No+Image'}
            alt={product.name}
            className={cn('transition-transform duration-500', !outOfStock && 'group-hover:scale-110')}
          />
          {outOfStock && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm">
              <span className="text-xs font-bold text-foreground bg-background/90 px-4 py-1.5 rounded-full border shadow-sm">Coming soon</span>
              {restockLabel && <span className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{restockLabel}</span>}
            </div>
          )}
          {/* Stock pill */}
          {!outOfStock && (
            <div className="absolute top-3 right-3">
              <span className={cn(
                'text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md',
                available > 3 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
              )}>
                {available} left
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">{product.category_name}</p>
          <h3 className="font-display font-bold text-[15px] mt-1 leading-tight">{product.name}</h3>

          {/* Action */}
          <div className="mt-4">
            {!outOfStock ? (
              <button
                onClick={handleAdd}
                disabled={addToCart.isPending}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
                  inCart
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'bg-foreground text-background hover:opacity-90'
                )}
              >
                {inCart ? <><Check className="h-4 w-4" /> In Cart ({cartQty})</> : <><Plus className="h-4 w-4" /> Add to Cart</>}
              </button>
            ) : (
              <div className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-muted-foreground bg-muted/50 border border-border/40">
                <Clock className="h-3.5 w-3.5" /> Unavailable
              </div>
            )}
          </div>
        </div>
      </div>

      {optionsOpen && <OptionsDialog product={product} open={optionsOpen} onClose={() => setOptionsOpen(false)} onConfirm={(o) => { setOptionsOpen(false); doAdd(o) }} />}
    </>
  )
}
