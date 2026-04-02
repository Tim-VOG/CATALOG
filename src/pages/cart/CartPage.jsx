import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '@/lib/auth'
import { useUIStore } from '@/stores/ui-store'
import { useCart, useUpdateCartItem, useRemoveFromCart, useCheckoutCart } from '@/hooks/use-cart'
import { useSubscriptionPlans } from '@/hooks/use-subscription-plans'
import { useLocations } from '@/hooks/use-locations'
import {
  ShoppingCart, Trash2, Plus, Minus, ArrowLeft, ArrowRight,
  Send, Loader2, Package, Check, CreditCard, MessageSquare,
  Calendar, MapPin, CheckCircle, Settings2, ChevronDown, ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import { cn } from '@/lib/utils'

const STEPS = [
  { id: 'cart', label: 'Cart', icon: ShoppingCart },
  { id: 'details', label: 'Details', icon: Calendar },
  { id: 'review', label: 'Review', icon: CheckCircle },
]

function StepProgress({ currentStep }) {
  return (
    <div className="flex items-center gap-1 mb-8">
      {STEPS.map((step, idx) => {
        const Icon = step.icon
        const isActive = idx === currentStep
        const isDone = idx < currentStep
        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div className={cn(
                'h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-300',
                isActive ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-110'
                  : isDone ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
              )}>
                {isDone ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <span className={cn('text-[10px] font-medium', isActive ? 'text-primary' : isDone ? 'text-primary/70' : 'text-muted-foreground')}>
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={cn('flex-1 h-0.5 mx-2 mt-[-18px] rounded-full', isDone ? 'bg-primary/40' : 'bg-muted')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Item Options Editor (structured JSON) ──
function ItemOptionsEditor({ item, onSave }) {
  const [open, setOpen] = useState(false)
  const options = item.options || {}
  const specs = options.specifications || {}
  const services = options.services || {}
  const accessories = options.accessories || []

  const [color, setColor] = useState(specs.color || '')
  const [storage, setStorage] = useState(specs.storage || '')
  const [subscriptionPlan, setSubscriptionPlan] = useState(services.subscription_plan || '')
  const [insurance, setInsurance] = useState(services.insurance || false)
  const [accessoryList, setAccessoryList] = useState(accessories.join(', '))

  const handleSave = () => {
    const newOptions = {
      specifications: {},
      services: {},
      accessories: [],
    }
    if (color) newOptions.specifications.color = color
    if (storage) newOptions.specifications.storage = storage
    if (subscriptionPlan) newOptions.services.subscription_plan = subscriptionPlan
    if (insurance) newOptions.services.insurance = true
    if (accessoryList.trim()) {
      newOptions.accessories = accessoryList.split(',').map((s) => s.trim()).filter(Boolean)
    }
    onSave(newOptions)
    setOpen(false)
  }

  const hasOptions = item.has_subscription || item.has_apps

  if (!hasOptions) return null

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[11px] text-primary hover:underline"
      >
        <Settings2 className="h-3 w-3" />
        Configure options
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-2 p-3 rounded-lg border bg-muted/20 space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px]">Color</Label>
              <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="e.g. Space Gray" className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Storage</Label>
              <Input value={storage} onChange={(e) => setStorage(e.target.value)} placeholder="e.g. 256GB" className="h-8 text-xs" />
            </div>
          </div>

          {item.has_subscription && (
            <div className="space-y-1">
              <Label className="text-[11px]">Subscription Plan</Label>
              <Input value={subscriptionPlan} onChange={(e) => setSubscriptionPlan(e.target.value)} placeholder="e.g. Data 20GB" className="h-8 text-xs" />
            </div>
          )}

          <label className="flex items-center gap-2 text-xs">
            <Checkbox checked={insurance} onCheckedChange={setInsurance} />
            Insurance
          </label>

          <div className="space-y-1">
            <Label className="text-[11px]">Accessories (comma-separated)</Label>
            <Input value={accessoryList} onChange={(e) => setAccessoryList(e.target.value)} placeholder="e.g. USB-C Hub, Screen Protector" className="h-8 text-xs" />
          </div>

          <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave}>
            <Check className="h-3 w-3" /> Apply
          </Button>
        </motion.div>
      )}

      {/* Show configured options summary */}
      {!open && (Object.keys(specs).length > 0 || Object.keys(services).length > 0 || accessories.length > 0) && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {Object.entries(specs).map(([k, v]) => (
            <Badge key={k} variant="secondary" className="text-[9px]">{v}</Badge>
          ))}
          {services.subscription_plan && (
            <Badge variant="secondary" className="text-[9px] bg-purple-500/10 text-purple-400">{services.subscription_plan}</Badge>
          )}
          {services.insurance && (
            <Badge variant="secondary" className="text-[9px] bg-emerald-500/10 text-emerald-400">Insured</Badge>
          )}
          {accessories.map((a, i) => (
            <Badge key={i} variant="secondary" className="text-[9px]">{a}</Badge>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Cart Page ──
export function CartPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const showToast = useUIStore((s) => s.showToast)

  const { data: items = [], isLoading } = useCart()
  const updateItem = useUpdateCartItem()
  const removeItem = useRemoveFromCart()
  const checkout = useCheckoutCart()

  const { data: subscriptionPlans = [] } = useSubscriptionPlans()
  const { data: locations = [] } = useLocations()

  const [step, setStep] = useState(0)
  const [pickupDate, setPickupDate] = useState('')
  const [returnDate, setReturnDate] = useState('')
  const [locationId, setLocationId] = useState('')
  const [projectName, setProjectName] = useState('')
  const [globalComment, setGlobalComment] = useState('')

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)
  const needsSubscription = items.some((i) => i.has_subscription)

  const handleQuantityChange = (item, delta) => {
    const newQty = item.quantity + delta
    if (newQty <= 0) {
      removeItem.mutate(item.id)
    } else {
      updateItem.mutate({ id: item.id, quantity: newQty })
    }
  }

  const handleOptionsUpdate = (item, options) => {
    updateItem.mutate({ id: item.id, options })
  }

  const handleCheckout = async () => {
    try {
      await checkout.mutateAsync({
        userId: user.id,
        projectName: projectName || 'Equipment Request',
        projectDescription: null,
        globalComment: globalComment || null,
        pickupDate,
        returnDate: returnDate || null,
        locationId: locationId || null,
        priority: 'normal',
      })
      navigate('/my-requests')
      setTimeout(() => showToast('Request submitted successfully!'), 100)
    } catch (err) {
      showToast(err.message || 'Failed to submit request', 'error')
    }
  }

  const canGoToDetails = items.length > 0
  const canGoToReview = pickupDate && returnDate && new Date(returnDate) > new Date(pickupDate)

  if (isLoading) return <PageLoading />

  if (items.length === 0 && step === 0) {
    return (
      <div className="max-w-2xl mx-auto py-10 px-4">
        <EmptyState icon={ShoppingCart} title="Your cart is empty" description="Browse the catalog and add equipment to your cart.">
          <Link to="/catalog">
            <Button className="gap-2"><Package className="h-4 w-4" /> Browse Catalog</Button>
          </Link>
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      {/* Header */}
      <motion.div className="text-center mb-6" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Badge variant="outline" className="mb-3 text-xs">{totalItems} item{totalItems !== 1 ? 's' : ''}</Badge>
        <h1 className="text-3xl font-display font-bold tracking-tight text-gradient-primary">Equipment Request</h1>
        <p className="text-muted-foreground mt-2">Review your selection and submit your request.</p>
      </motion.div>

      <StepProgress currentStep={step} />

      <AnimatePresence mode="wait">
        {/* ═══ STEP 0: Cart ═══ */}
        {step === 0 && (
          <motion.div key="cart" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            {items.map((item) => (
              <Card key={item.id} variant="elevated">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {item.product_image ? (
                      <img src={item.product_image} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center shrink-0">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{item.product_name}</h3>
                      <p className="text-xs text-muted-foreground">{item.category_name}</p>
                      {item.product_includes?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.product_includes.map((inc, j) => (
                            <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{inc}</span>
                          ))}
                        </div>
                      )}
                      {/* Structured options editor */}
                      <ItemOptionsEditor
                        item={item}
                        onSave={(options) => handleOptionsUpdate(item, options)}
                      />
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleQuantityChange(item, -1)} disabled={updateItem.isPending}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleQuantityChange(item, 1)} disabled={updateItem.isPending}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground hover:text-destructive gap-1" onClick={() => removeItem.mutate(item.id)}>
                        <Trash2 className="h-3 w-3" /> Remove
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Global comment */}
            <Card>
              <CardContent className="p-4 space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                  Comment (optional)
                </Label>
                <Textarea value={globalComment} onChange={(e) => setGlobalComment(e.target.value)} placeholder="Any notes for the IT team..." rows={2} />
              </CardContent>
            </Card>

            <div className="flex items-center justify-between pt-2">
              <Link to="/catalog">
                <Button variant="ghost" className="gap-2"><ArrowLeft className="h-4 w-4" /> Continue Shopping</Button>
              </Link>
              <Button onClick={() => setStep(1)} disabled={!canGoToDetails} className="gap-2">
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* ═══ STEP 1: Details ═══ */}
        {step === 1 && (
          <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <Card variant="elevated">
              <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                  <Label>Project / Reason *</Label>
                  <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g. Client presentation, New hire setup..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pickup Date *</Label>
                    <Input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Return Date *</Label>
                    <Input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
                  </div>
                </div>
                {locations.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Pickup Location</Label>
                    <Select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                      <option value="">Select location...</option>
                      {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                    </Select>
                  </div>
                )}
                {/* Subscription plan selector for items that need it */}
                {needsSubscription && subscriptionPlans.length > 0 && (
                  <div className="space-y-3 border-t pt-4">
                    <Label className="flex items-center gap-2">
                      <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                      Subscription Plan
                    </Label>
                    <p className="text-xs text-muted-foreground">Select a plan for items that require a subscription (phone, router).</p>
                    <div className="space-y-2">
                      {subscriptionPlans.map((plan) => {
                        const typeBadge = { call: 'bg-blue-500/20 text-blue-400', data: 'bg-purple-500/20 text-purple-400', both: 'bg-cyan-500/20 text-cyan-400' }
                        return (
                          <div key={plan.id} className="flex items-center justify-between p-3 rounded-xl border hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-3">
                              <div>
                                <span className="text-sm font-medium">{plan.name}</span>
                                <Badge className={cn('ml-2 text-[10px]', typeBadge[plan.type] || '')}>{plan.type}</Badge>
                                {plan.description && <p className="text-[11px] text-muted-foreground">{plan.description}</p>}
                              </div>
                            </div>
                            <span className="text-sm font-semibold text-primary">{plan.price}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" className="gap-2" onClick={() => setStep(0)}><ArrowLeft className="h-4 w-4" /> Back</Button>
              <Button onClick={() => setStep(2)} disabled={!canGoToReview} className="gap-2">Review <ArrowRight className="h-4 w-4" /></Button>
            </div>
          </motion.div>
        )}

        {/* ═══ STEP 2: Review ═══ */}
        {step === 2 && (
          <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <Card variant="elevated">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold text-base">Request Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Requester</span>
                    <p className="font-medium">{profile?.first_name} {profile?.last_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Project</span>
                    <p className="font-medium">{projectName || '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pickup</span>
                    <p className="font-medium">{pickupDate}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Return</span>
                    <p className="font-medium">{returnDate}</p>
                  </div>
                </div>
                {globalComment && (
                  <div className="text-sm border-t pt-3">
                    <span className="text-muted-foreground">Comment</span>
                    <p>{globalComment}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card variant="elevated">
              <CardContent className="p-6">
                <h3 className="font-semibold text-base mb-3">Items ({totalItems})</h3>
                <div className="divide-y">
                  {items.map((item) => {
                    const opts = item.options || {}
                    const hasOpts = Object.keys(opts.specifications || {}).length > 0 ||
                      Object.keys(opts.services || {}).length > 0 ||
                      (opts.accessories || []).length > 0
                    return (
                      <div key={item.id} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          {item.product_image ? (
                            <img src={item.product_image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <Package className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.product_name}</p>
                            <p className="text-xs text-muted-foreground">{item.category_name}</p>
                          </div>
                          <span className="text-sm font-medium">&times; {item.quantity}</span>
                        </div>
                        {hasOpts && (
                          <div className="flex flex-wrap gap-1 mt-2 ml-13">
                            {Object.entries(opts.specifications || {}).map(([k, v]) => (
                              <Badge key={k} variant="outline" className="text-[9px]">{k}: {v}</Badge>
                            ))}
                            {opts.services?.subscription_plan && (
                              <Badge variant="outline" className="text-[9px] text-purple-400">{opts.services.subscription_plan}</Badge>
                            )}
                            {opts.services?.insurance && (
                              <Badge variant="outline" className="text-[9px] text-emerald-400">Insured</Badge>
                            )}
                            {(opts.accessories || []).map((a, i) => (
                              <Badge key={i} variant="outline" className="text-[9px]">{a}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" className="gap-2" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4" /> Edit</Button>
              <Button onClick={handleCheckout} disabled={checkout.isPending} className="gap-2">
                {checkout.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit Request
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
