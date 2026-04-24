import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useUIStore } from '@/stores/ui-store'
import { useProducts } from '@/hooks/use-products'
import { useSubscriptionPlans } from '@/hooks/use-subscription-plans'
import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/api/send-email'
import { motion, AnimatePresence } from 'motion/react'
import {
  User, Calendar, Monitor, CheckCircle, CreditCard,
  ArrowRight, ArrowLeft, Send, Loader2, Package,
  Laptop, Smartphone, Tablet, Tv, Apple,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'

// ── Step definitions ──
const STEP_DEFS = [
  { id: 'requester', label: 'Requester', icon: User },
  { id: 'event', label: 'Event', icon: Calendar },
  { id: 'equipment', label: 'Equipment', icon: Monitor },
  { id: 'subscription', label: 'Plan', icon: CreditCard },
  { id: 'review', label: 'Review', icon: CheckCircle },
]

// ── Equipment items ──
const EQUIPMENT_ITEMS = [
  { id: 'PC', label: 'PC', icon: Laptop, category: 'pc' },
  { id: 'SCREEN', label: 'Screen', icon: Tv, category: 'screen' },
  { id: 'TABLET', label: 'Tablet', icon: Tablet, category: 'tablet' },
  { id: 'PHONE', label: 'Phone', icon: Smartphone, category: 'phone' },
]

// ── Step progress bar ──
function StepProgress({ currentStep, steps }) {
  return (
    <div className="flex items-center gap-1 mb-8">
      {steps.map((step, idx) => {
        const Icon = step.icon
        const isActive = idx === currentStep
        const isDone = idx < currentStep
        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 relative">
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-110'
                    : isDone
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isDone ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <span
                className={`text-[10px] font-medium transition-colors ${
                  isActive ? 'text-primary' : isDone ? 'text-primary/70' : 'text-muted-foreground'
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 mt-[-18px] rounded-full transition-colors duration-300 ${
                  isDone ? 'bg-primary/40' : 'bg-muted'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Step 1: Requester ──
function StepRequester({ form, setField }) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>
          Requested By <span className="text-destructive ml-1">*</span>
        </Label>
        <Input
          value={form.requested_by}
          onChange={(e) => setField('requested_by', e.target.value)}
          placeholder="Your full name"
        />
      </div>
      <div className="space-y-2">
        <Label>
          From Company <span className="text-destructive ml-1">*</span>
        </Label>
        <Input
          value={form.from_company}
          onChange={(e) => setField('from_company', e.target.value)}
          placeholder="Company name"
        />
      </div>
    </div>
  )
}

// ── Step 2: Event ──
function StepEvent({ form, setField }) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>
          Event Name <span className="text-destructive ml-1">*</span>
        </Label>
        <Input
          value={form.event_name}
          onChange={(e) => setField('event_name', e.target.value)}
          placeholder="Name of the event"
        />
      </div>
      <div className="space-y-2">
        <Label>Job</Label>
        <Input
          value={form.job}
          onChange={(e) => setField('job', e.target.value)}
          placeholder="Job reference"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>
            Pick Up <span className="text-destructive ml-1">*</span>
          </Label>
          <Input
            type="date"
            value={form.pick_up}
            onChange={(e) => setField('pick_up', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>
            Deposit <span className="text-destructive ml-1">*</span>
          </Label>
          <Input
            type="date"
            value={form.deposit}
            onChange={(e) => setField('deposit', e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}

// ── Step 3: Equipment (with stock awareness) ──
function StepEquipment({ form, setField, productsByCategory }) {
  const selected = form.equipment_needed || []

  const toggleEquipment = (id) => {
    if (selected.includes(id)) {
      setField('equipment_needed', selected.filter((s) => s !== id))
      // Clear sub-selections when deselecting
      if (id === 'PC') setField('pc_type', '')
      if (id === 'SCREEN') setField('screen_model', '')
      if (id === 'TABLET') setField('tablet_model', '')
      if (id === 'PHONE') setField('phone_model', '')
    } else {
      setField('equipment_needed', [...selected, id])
    }
  }

  // Get available models for each equipment type
  const screenModels = productsByCategory.screen || []
  const tabletModels = productsByCategory.tablet || []
  const phoneModels = productsByCategory.phone || []

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>I need for my event</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {EQUIPMENT_ITEMS.map((item) => {
            const Icon = item.icon
            const checked = selected.includes(item.id)
            // Check availability for screen/tablet/phone
            const categoryProducts = productsByCategory[item.category] || []
            const hasAvailable = item.category === 'pc' || categoryProducts.some(p => p.total_stock > 0)
            const isDisabled = !hasAvailable && item.category !== 'pc'

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => !isDisabled && toggleEquipment(item.id)}
                disabled={isDisabled}
                className={`relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all duration-200 ${
                  isDisabled
                    ? 'border-border/30 bg-muted/20 opacity-50 cursor-not-allowed'
                    : checked
                    ? 'border-primary bg-primary/5 shadow-md shadow-primary/10 cursor-pointer'
                    : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30 cursor-pointer'
                }`}
              >
                {checked && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                  </div>
                )}
                {isDisabled && (
                  <Badge variant="outline" className="absolute top-2 right-2 text-[8px] text-muted-foreground">
                    Out of stock
                  </Badge>
                )}
                <div
                  className={`h-12 w-12 rounded-xl flex items-center justify-center transition-colors ${
                    isDisabled
                      ? 'bg-muted/50 text-muted-foreground/50'
                      : checked ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <span
                  className={`text-sm font-medium transition-colors ${
                    isDisabled ? 'text-muted-foreground/50' : checked ? 'text-primary' : 'text-foreground'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* PC Type selection: Apple or Windows */}
      {selected.includes('PC') && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          <Label>PC Type <span className="text-destructive ml-1">*</span></Label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'apple', label: 'Apple (Mac)', icon: Apple },
              { value: 'windows', label: 'Windows', icon: Laptop },
            ].map((opt) => {
              const Icon = opt.icon
              const isSelected = form.pc_type === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setField('pc_type', opt.value)}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
                  }`}
                >
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${isSelected ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                    {opt.label}
                  </span>
                  {isSelected && <CheckCircle className="h-4 w-4 text-primary ml-auto" />}
                </button>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Screen model selection */}
      {selected.includes('SCREEN') && screenModels.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          <Label>Select Screen</Label>
          <div className="space-y-2">
            {screenModels.map((product) => {
              const isAvailable = product.total_stock > 0
              const isSelected = form.screen_model === product.id
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => isAvailable && setField('screen_model', product.id)}
                  disabled={!isAvailable}
                  className={`flex items-center gap-3 w-full p-3 rounded-xl border transition-all text-left ${
                    !isAvailable
                      ? 'border-border/30 bg-muted/20 opacity-40 cursor-not-allowed'
                      : isSelected
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-muted-foreground/30 cursor-pointer'
                  }`}
                >
                  {product.image_url ? (
                    <img src={product.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Tv className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {isAvailable ? `${product.total_stock} available` : 'Out of stock'}
                    </p>
                  </div>
                  {isSelected && <CheckCircle className="h-4 w-4 text-primary shrink-0" />}
                  {!isAvailable && (
                    <Badge variant="outline" className="text-[9px] text-muted-foreground shrink-0">Unavailable</Badge>
                  )}
                </button>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Tablet model selection */}
      {selected.includes('TABLET') && tabletModels.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          <Label>Select Tablet</Label>
          <div className="space-y-2">
            {tabletModels.map((product) => {
              const isAvailable = product.total_stock > 0
              const isSelected = form.tablet_model === product.id
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => isAvailable && setField('tablet_model', product.id)}
                  disabled={!isAvailable}
                  className={`flex items-center gap-3 w-full p-3 rounded-xl border transition-all text-left ${
                    !isAvailable
                      ? 'border-border/30 bg-muted/20 opacity-40 cursor-not-allowed'
                      : isSelected
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-muted-foreground/30 cursor-pointer'
                  }`}
                >
                  {product.image_url ? (
                    <img src={product.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Tablet className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {isAvailable ? `${product.total_stock} available` : 'Out of stock'}
                    </p>
                  </div>
                  {isSelected && <CheckCircle className="h-4 w-4 text-primary shrink-0" />}
                  {!isAvailable && (
                    <Badge variant="outline" className="text-[9px] text-muted-foreground shrink-0">Unavailable</Badge>
                  )}
                </button>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Phone model selection */}
      {selected.includes('PHONE') && phoneModels.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          <Label>Select Phone Model</Label>
          <div className="space-y-2">
            {phoneModels.map((product) => {
              const isAvailable = product.total_stock > 0
              const isSelected = form.phone_model === product.id
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => isAvailable && setField('phone_model', product.id)}
                  disabled={!isAvailable}
                  className={`flex items-center gap-3 w-full p-3 rounded-xl border transition-all text-left ${
                    !isAvailable
                      ? 'border-border/30 bg-muted/20 opacity-40 cursor-not-allowed'
                      : isSelected
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-muted-foreground/30 cursor-pointer'
                  }`}
                >
                  {product.image_url ? (
                    <img src={product.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {isAvailable ? `${product.total_stock} available` : 'Out of stock'}
                    </p>
                  </div>
                  {isSelected && <CheckCircle className="h-4 w-4 text-primary shrink-0" />}
                  {!isAvailable && (
                    <Badge variant="outline" className="text-[9px] text-muted-foreground shrink-0">Unavailable</Badge>
                  )}
                </button>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Additional notes */}
      <div className="space-y-2">
        <Label>Additional notes</Label>
        <Textarea
          value={form.additional_notes}
          onChange={(e) => setField('additional_notes', e.target.value)}
          placeholder="Any specific requirements or details..."
          rows={3}
        />
      </div>
    </div>
  )
}

// ── Step: Subscription Plan (for phone/router) ──
function StepSubscription({ form, setField, subscriptionPlans }) {
  const [filterType, setFilterType] = useState('all')

  const needsSubscription = (form.equipment_needed || []).some((id) => id === 'PHONE') ||
    (form.equipment_needed || []).some((id) => id === 'ROUTER')

  if (!needsSubscription) {
    return (
      <div className="text-center py-8">
        <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">
          No subscription plan needed for your selected equipment.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Subscription plans are available for phones and routers.
        </p>
      </div>
    )
  }
  const filteredPlans = subscriptionPlans.filter(
    (p) => filterType === 'all' || p.type === filterType || p.type === 'both'
  )

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground mb-4">
          Select a subscription plan for your phone or router. This will be included with your equipment request.
        </p>

        {/* Type filter */}
        <div className="flex gap-2 mb-4">
          {[
            { value: 'all', label: 'All Plans' },
            { value: 'call', label: 'Call' },
            { value: 'data', label: 'Data' },
            { value: 'both', label: 'Call + Data' },
          ].map((opt) => (
            <Button
              key={opt.value}
              type="button"
              variant={filterType === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType(opt.value)}
              className="text-xs"
            >
              {opt.label}
            </Button>
          ))}
        </div>

        {/* Plan list */}
        <div className="space-y-2">
          {filteredPlans.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No plans available for this filter.</p>
          ) : (
            filteredPlans.map((plan) => {
              const isSelected = form.subscription_plan_id === plan.id
              const typeColors = {
                call: 'border-blue-500/30 bg-blue-500/5',
                data: 'border-purple-500/30 bg-purple-500/5',
                both: 'border-cyan-500/30 bg-cyan-500/5',
              }
              const typeBadgeColors = {
                call: 'bg-blue-500/20 text-blue-400',
                data: 'bg-purple-500/20 text-purple-400',
                both: 'bg-cyan-500/20 text-cyan-400',
              }
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setField('subscription_plan_id', isSelected ? '' : plan.id)}
                  className={`flex items-center gap-3 w-full p-4 rounded-xl border-2 transition-all text-left cursor-pointer ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : `border-border hover:${typeColors[plan.type] || 'border-muted-foreground/30'}`
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{plan.name}</span>
                      <Badge className={`text-[10px] ${typeBadgeColors[plan.type] || ''}`}>
                        {plan.type === 'call' ? 'Call' : plan.type === 'data' ? 'Data' : 'Call + Data'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-semibold text-primary">{plan.price}</span>
                      {plan.description && (
                        <span className="text-xs text-muted-foreground">— {plan.description}</span>
                      )}
                    </div>
                  </div>
                  {isSelected && <CheckCircle className="h-5 w-5 text-primary shrink-0" />}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* No plan option */}
      <button
        type="button"
        onClick={() => setField('subscription_plan_id', '')}
        className={`w-full p-3 rounded-xl border-2 text-center text-sm transition-all cursor-pointer ${
          !form.subscription_plan_id
            ? 'border-muted-foreground/40 bg-muted/20'
            : 'border-border hover:border-muted-foreground/30 text-muted-foreground'
        }`}
      >
        No subscription plan needed
      </button>
    </div>
  )
}

function StepReview({ form, productsByCategory, subscriptionPlans }) {
  const equipmentLabels = (form.equipment_needed || [])
    .map((id) => EQUIPMENT_ITEMS.find((e) => e.id === id)?.label || id)
    .join(', ')

  // Resolve product names for selected models
  const resolveProductName = (category, productId) => {
    if (!productId) return null
    const products = productsByCategory[category] || []
    const product = products.find(p => p.id === productId)
    return product?.name || productId
  }

  const rows = [
    { label: 'Requested By', value: form.requested_by },
    { label: 'From Company', value: form.from_company },
    { label: 'Event Name', value: form.event_name },
    { label: 'Job', value: form.job },
    { label: 'Pick Up', value: form.pick_up },
    { label: 'Deposit', value: form.deposit },
    { label: 'Equipment Needed', value: equipmentLabels },
    ...(form.pc_type ? [{ label: 'PC Type', value: form.pc_type === 'apple' ? 'Apple (Mac)' : 'Windows' }] : []),
    ...(form.screen_model ? [{ label: 'Screen', value: resolveProductName('screen', form.screen_model) }] : []),
    ...(form.tablet_model ? [{ label: 'Tablet', value: resolveProductName('tablet', form.tablet_model) }] : []),
    ...(form.phone_model ? [{ label: 'Phone', value: resolveProductName('phone', form.phone_model) }] : []),
    ...(form.subscription_plan_id ? [{ label: 'Subscription Plan', value: (() => { const plan = subscriptionPlans.find(p => p.id === form.subscription_plan_id); return plan ? `${plan.name} (${plan.price})` : '—' })() }] : []),
    ...(form.additional_notes ? [{ label: 'Notes', value: form.additional_notes }] : []),
  ]

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Please review the information below before submitting.
      </p>
      <div className="rounded-xl border bg-card overflow-hidden">
        {rows.map(({ label, value }, idx) => (
          <div
            key={label}
            className={`flex items-start gap-4 px-5 py-3 ${
              idx < rows.length - 1 ? 'border-b border-border/50' : ''
            }`}
          >
            <span className="text-xs font-semibold text-muted-foreground w-36 shrink-0 pt-0.5 uppercase tracking-wider">
              {label}
            </span>
            <span className="text-sm text-foreground break-all">
              {value || '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main page ──
export function EquipmentRequestPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const showToast = useUIStore((s) => s.showToast)
  const { data: allProducts = [] } = useProducts()
  const { data: subscriptionPlans = [] } = useSubscriptionPlans()

  const [currentStep, setCurrentStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    requested_by: '',
    from_company: '',
    event_name: '',
    job: '',
    pick_up: '',
    deposit: '',
    equipment_needed: [],
    pc_type: '',
    screen_model: '',
    tablet_model: '',
    phone_model: '',
    subscription_plan_id: '',
    additional_notes: '',
  })

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  // Group products by category name (case-insensitive matching)
  const productsByCategory = useMemo(() => {
    const result = { pc: [], screen: [], tablet: [], phone: [] }
    for (const product of allProducts) {
      const cat = (product.category_name || '').toLowerCase()
      if (cat.includes('screen') || cat.includes('monitor') || cat.includes('display')) {
        result.screen.push(product)
      } else if (cat.includes('tablet') || cat.includes('ipad')) {
        result.tablet.push(product)
      } else if (cat.includes('phone') || cat.includes('mobile') || cat.includes('iphone') || cat.includes('smartphone')) {
        result.phone.push(product)
      } else if (cat.includes('pc') || cat.includes('laptop') || cat.includes('computer') || cat.includes('macbook')) {
        result.pc.push(product)
      }
    }
    return result
  }, [allProducts])

  // Auto-fill requester name from profile
  useEffect(() => {
    if (profile) {
      const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ')
      setForm((prev) => ({
        ...prev,
        requested_by: prev.requested_by || fullName,
      }))
    }
  }, [profile])

  // Check if subscription step is relevant (phone or router selected)
  const needsSubscription = (form.equipment_needed || []).includes('PHONE')

  // Validation per step
  const canGoNext = useMemo(() => {
    const step = STEP_DEFS[currentStep]
    if (!step) return true

    switch (step.id) {
      case 'requester':
        return !!(form.requested_by.trim() && form.from_company.trim())
      case 'event':
        return !!(form.event_name.trim() && form.pick_up && form.deposit)
      case 'equipment':
        if (form.equipment_needed.length === 0) return false
        // If PC is selected, pc_type must be chosen
        if (form.equipment_needed.includes('PC') && !form.pc_type) return false
        return true
      case 'subscription':
        return true // Optional step
      case 'review':
        return true
      default:
        return true
    }
  }, [currentStep, form])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const submitterName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')

      // Note: Stock is NOT decremented here — it only decrements on QR scan
      // Resolve subscription plan name for the stored data
      const selectedPlan = form.subscription_plan_id
        ? subscriptionPlans.find(p => p.id === form.subscription_plan_id)
        : null

      const { error } = await supabase.from('it_requests').insert({
        type: 'equipment',
        requester_id: user.id,
        requester_email: user.email,
        requester_name: submitterName,
        data: {
          ...form,
          subscription_plan_name: selectedPlan?.name || null,
          subscription_plan_price: selectedPlan?.price || null,
          submitted_at: new Date().toISOString(),
        },
        status: 'pending',
      })
      if (error) throw error

      // Confirmation email to user
      sendEmail({
        to: user.email,
        subject: 'Your equipment request has been received',
        body: `<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:520px;margin:0 auto;">
          <h2 style="color:#1e293b;">Request received</h2>
          <p style="color:#64748b;font-size:15px;">Hi ${submitterName},</p>
          <p style="color:#64748b;font-size:15px;">Your <strong>equipment</strong> request for <strong>${form.event_name}</strong> has been received and will be processed by the IT team.</p>
          <div style="background:#fffbeb;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
            <p style="margin:0;font-size:13px;color:#fbbf24;">STATUS</p>
            <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#f59e0b;">Pending</p>
          </div>
        </div>`,
        isHtml: true,
      })

      // Notify admin
      sendEmail({
        to: 'admin@vo-group.be',
        subject: `Equipment Request: ${form.event_name}`,
        body: `<p><strong>${submitterName}</strong> submitted an equipment request for event <strong>${form.event_name}</strong>.</p>`,
      })

      navigate('/')
      setTimeout(() => showToast('Equipment request submitted successfully!'), 100)
    } catch (err) {
      showToast(err.message || 'Failed to submit request', 'error')
    }
    setSubmitting(false)
  }

  const currentStepDef = STEP_DEFS[currentStep]
  const isReview = currentStepDef?.id === 'review'

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      {/* Header */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Badge variant="outline" className="mb-3 text-xs">
          IT Equipment
        </Badge>
        <h1 className="text-3xl font-display font-bold tracking-tight text-gradient-primary">
          Request IT Equipment
        </h1>
        <p className="text-muted-foreground mt-2">
          Please note that your request will depend on available stocks.
        </p>
      </motion.div>

      {/* Step progress */}
      <StepProgress currentStep={currentStep} steps={STEP_DEFS} />

      {/* Step content */}
      <Card variant="elevated" className="mb-6">
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-6">
            {(() => {
              const StepIcon = currentStepDef.icon
              return <StepIcon className="h-5 w-5 text-primary" />
            })()}
            <h2 className="text-lg font-display font-bold">
              {currentStepDef.label}
            </h2>
            <span className="text-xs text-muted-foreground ml-auto">
              Step {currentStep + 1} of {STEP_DEFS.length}
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {currentStepDef.id === 'requester' && (
                <StepRequester form={form} setField={setField} />
              )}
              {currentStepDef.id === 'event' && (
                <StepEvent form={form} setField={setField} />
              )}
              {currentStepDef.id === 'equipment' && (
                <StepEquipment form={form} setField={setField} productsByCategory={productsByCategory} />
              )}
              {currentStepDef.id === 'subscription' && (
                <StepSubscription form={form} setField={setField} subscriptionPlans={subscriptionPlans} />
              )}
              {isReview && <StepReview form={form} productsByCategory={productsByCategory} subscriptionPlans={subscriptionPlans} />}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => currentStep === 0 ? navigate('/') : setCurrentStep((s) => s - 1)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {currentStep === 0 ? 'Cancel' : 'Back'}
        </Button>

        {currentStep < STEP_DEFS.length - 1 ? (
          <Button
            onClick={() => setCurrentStep((s) => s + 1)}
            disabled={!canGoNext}
            className="gap-2"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="gap-2"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Submit Request
          </Button>
        )}
      </div>
    </div>
  )
}
