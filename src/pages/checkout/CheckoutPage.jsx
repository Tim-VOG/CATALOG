import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '@/lib/auth'
import { useCartStore } from '@/stores/cart-store'
import { useLocations } from '@/hooks/use-locations'
import { useCreateLoanRequest } from '@/hooks/use-loan-requests'
import { useActiveFormFields } from '@/hooks/use-form-fields'
import { useUIStore } from '@/stores/ui-store'
import { useAppSettings } from '@/hooks/use-settings'
import { validateCheckoutFields, buildLoanRequestPayload, sendCheckoutEmails } from '@/services/checkout-service'
import { ArrowLeft, ArrowRight, Check, ClipboardList, Send, Plus, X as XIcon, Mail } from 'lucide-react'
import { DynamicField } from '@/components/checkout/DynamicField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/EmptyState'
import { cn } from '@/lib/utils'

const STEPS = ['Project Details', 'Review & Submit']

// Priority options for the priority system field
const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

export function CheckoutPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { items, startDate, endDate, clearCart } = useCartStore()
  const { data: locations = [] } = useLocations()
  const createRequest = useCreateLoanRequest()
  const { data: activeFields = [] } = useActiveFormFields()
  const showToast = useUIStore((s) => s.showToast)
  const { data: settings } = useAppSettings()
  const [step, setStep] = useState(0)
  const [fieldValues, setFieldValues] = useState({
    priority: 'normal',
    terms_accepted: false,
    responsibility_accepted: false,
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [ccEmails, setCcEmails] = useState([])

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Nothing to checkout"
        description="Add items to your cart first"
      >
        <Link to="/catalog"><Button>Browse Catalog</Button></Link>
      </EmptyState>
    )
  }

  if (!startDate || !endDate) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Dates required"
        description="Please set pickup and return dates in your cart"
      >
        <Link to="/cart"><Button>Back to Cart</Button></Link>
      </EmptyState>
    )
  }

  const setFieldValue = (key, val) => {
    setFieldValues((prev) => ({ ...prev, [key]: val }))
  }

  const validateFields = () => {
    const { valid, errors } = validateCheckoutFields(fieldValues, activeFields, ccEmails)
    setFieldErrors(errors)
    return valid
  }

  const handleStepNext = () => {
    if (validateFields()) {
      setStep(1)
    }
  }

  // Render a system field with special UI
  const renderSystemField = (field) => {
    const key = field.field_key
    const error = fieldErrors[key]

    if (key === 'location_id') {
      return (
        <div key={field.id} className="space-y-1">
          <Label htmlFor={key}>{field.label} {field.is_required && '*'}</Label>
          <Select
            id={key}
            value={fieldValues[key] || ''}
            onChange={(e) => setFieldValue(key, e.target.value)}
          >
            <option value="">Select location...</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </Select>
          {error && <p className="text-xs text-destructive">{error}</p>}
          {fieldValues.location_id && locations.find((l) => l.id === fieldValues.location_id)?.name?.includes('Remote') && (
            <div className="space-y-1 mt-2">
              <Label htmlFor="location_other">Shipping Address</Label>
              <Textarea
                id="location_other"
                value={fieldValues.location_other || ''}
                onChange={(e) => setFieldValue('location_other', e.target.value)}
                placeholder="Full delivery address..."
                rows={2}
              />
            </div>
          )}
        </div>
      )
    }

    if (key === 'priority') {
      return (
        <div key={field.id} className="space-y-1">
          <Label htmlFor={key}>{field.label}</Label>
          <Select
            id={key}
            value={fieldValues[key] || 'normal'}
            onChange={(e) => setFieldValue(key, e.target.value)}
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </div>
      )
    }

    // project_name, project_description, justification — render as standard text/textarea
    if (field.field_type === 'textarea') {
      return (
        <div key={field.id} className="space-y-1">
          <Label htmlFor={key}>{field.label} {field.is_required && '*'}</Label>
          <Textarea
            id={key}
            value={fieldValues[key] || ''}
            onChange={(e) => setFieldValue(key, e.target.value)}
            placeholder={field.placeholder || ''}
            rows={3}
          />
          {field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )
    }

    // Default text input for system fields
    return (
      <div key={field.id} className="space-y-1">
        <Label htmlFor={key}>{field.label} {field.is_required && '*'}</Label>
        <Input
          id={key}
          value={fieldValues[key] || ''}
          onChange={(e) => setFieldValue(key, e.target.value)}
          placeholder={field.placeholder || ''}
        />
        {field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    )
  }

  const renderField = (field) => {
    if (field.is_system) {
      return renderSystemField(field)
    }
    // Custom fields use DynamicField
    return (
      <DynamicField
        key={field.id}
        field={field}
        value={fieldValues[field.field_key]}
        onChange={(val) => setFieldValue(field.field_key, val)}
        error={fieldErrors[field.field_key]}
      />
    )
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!fieldValues.terms_accepted || !fieldValues.responsibility_accepted) {
      setFieldErrors((prev) => ({
        ...prev,
        terms_accepted: !fieldValues.terms_accepted ? 'You must accept the terms' : undefined,
        responsibility_accepted: !fieldValues.responsibility_accepted ? 'You must accept responsibility for the equipment' : undefined,
      }))
      return
    }

    const { request: payload, items: payloadItems, validCcEmails } = buildLoanRequestPayload({
      user, fieldValues, activeFields, items, startDate, endDate, ccEmails,
    })

    try {
      await createRequest.mutateAsync({ request: payload, items: payloadItems })
      clearCart()
      showToast('Request submitted successfully!')

      // Send emails (fire and forget — don't block navigation)
      sendCheckoutEmails({
        fieldValues, items, startDate, endDate,
        profile, user, settings, locations, ccEmails,
      })

      navigate('/requests')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  const selectedLocation = locations.find((l) => l.id === fieldValues.location_id)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link to="/cart">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Cart
        </Button>
      </Link>

      <div>
        <h1 className="text-3xl font-display font-bold">Checkout</h1>
        <p className="text-muted-foreground mt-1">Complete your equipment request</p>
      </div>

      {/* Animated Stepper */}
      <div className="flex items-center gap-2 sm:gap-4">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <motion.div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold shrink-0'
              )}
              animate={{
                backgroundColor: i <= step ? 'var(--color-primary)' : 'var(--color-muted)',
                color: i <= step ? 'var(--color-primary-foreground)' : 'var(--color-muted-foreground)',
                scale: i === step ? 1.1 : 1,
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </motion.div>
            <span className={cn('text-xs sm:text-sm font-medium', i <= step ? 'text-foreground' : 'text-muted-foreground')}>
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className="w-8 sm:w-12 h-px bg-border shrink-0 overflow-hidden relative">
                <motion.div
                  className="absolute inset-y-0 left-0 w-full bg-primary"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: step > i ? 1 : 0 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  style={{ originX: 0 }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={onSubmit}>
        <AnimatePresence mode="wait">
        {/* Step 1: Project Details — all fields from DB */}
        {step === 0 && (
          <motion.div
            key="step-0"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeFields.map((field) => renderField(field))}

              {/* CC Email Recipients */}
              <div className="space-y-2 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    CC Recipients
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 h-7 text-xs"
                    onClick={() => setCcEmails((prev) => [...prev, ''])}
                  >
                    <Plus className="h-3 w-3" /> Add
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Add email addresses that should also receive notifications about this request.</p>
                {ccEmails.map((email, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        const updated = [...ccEmails]
                        updated[i] = e.target.value
                        setCcEmails(updated)
                        // Clear error on edit
                        if (fieldErrors[`cc_email_${i}`]) {
                          setFieldErrors((prev) => { const next = { ...prev }; delete next[`cc_email_${i}`]; return next })
                        }
                      }}
                      placeholder="colleague@company.com"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        setCcEmails((prev) => prev.filter((_, j) => j !== i))
                        setFieldErrors((prev) => { const next = { ...prev }; delete next[`cc_email_${i}`]; return next })
                      }}
                      aria-label="Remove CC email"
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                    {fieldErrors[`cc_email_${i}`] && (
                      <p className="text-xs text-destructive shrink-0">{fieldErrors[`cc_email_${i}`]}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <Button type="button" className="gap-2" onClick={handleStepNext}>
                  Review <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
          </motion.div>
        )}

        {/* Step 2: Review & Submit */}
        {step === 1 && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Request Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Requester</span>
                    <p className="font-medium">{profile?.first_name} {profile?.last_name}</p>
                    <p className="text-muted-foreground">{user?.email}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Loan Period</span>
                    <p className="font-medium">{formatDate(startDate)} &rarr; {formatDate(endDate)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Project</span>
                    <p className="font-medium">{fieldValues.project_name || '—'}</p>
                  </div>
                  {selectedLocation && (
                    <div>
                      <span className="text-muted-foreground">Location</span>
                      <p className="font-medium">{selectedLocation.name}</p>
                    </div>
                  )}
                </div>
                {fieldValues.project_description && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Description</span>
                    <p>{fieldValues.project_description}</p>
                  </div>
                )}
                {/* Show custom field values */}
                {activeFields.filter((f) => !f.is_system && fieldValues[f.field_key]).map((field) => (
                  <div key={field.id} className="text-sm">
                    <span className="text-muted-foreground">{field.label}</span>
                    <p>{String(fieldValues[field.field_key])}</p>
                  </div>
                ))}
                {ccEmails.filter((e) => e.trim()).length > 0 && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">CC Recipients</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {ccEmails.filter((e) => e.trim()).map((email, i) => (
                        <Badge key={i} variant="secondary" className="font-normal">{email}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Items ({items.length})</CardTitle>
              </CardHeader>
              <CardContent className="divide-y">
                {items.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                    <div className="h-12 w-12 rounded overflow-hidden bg-muted shrink-0">
                      <img src={item.product.image_url} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">{item.product.category_name}</p>
                    </div>
                    <span className="text-sm font-medium">&times; {item.quantity}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox
                      checked={fieldValues.terms_accepted}
                      onCheckedChange={(v) => setFieldValue('terms_accepted', v)}
                    />
                    <span className="text-sm">
                      I accept the terms of use and understand that equipment must be returned in good condition by the agreed date.
                    </span>
                  </label>
                  {fieldErrors.terms_accepted && <p className="text-xs text-destructive ml-7">{fieldErrors.terms_accepted}</p>}

                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox
                      checked={fieldValues.responsibility_accepted}
                      onCheckedChange={(v) => setFieldValue('responsibility_accepted', v)}
                    />
                    <span className="text-sm">
                      I accept personal responsibility for the borrowed equipment during the loan period.
                    </span>
                  </label>
                  {fieldErrors.responsibility_accepted && <p className="text-xs text-destructive ml-7">{fieldErrors.responsibility_accepted}</p>}
                </div>

                <div className="flex justify-between">
                  <Button type="button" variant="outline" className="gap-2" onClick={() => setStep(0)}>
                    <ArrowLeft className="h-4 w-4" /> Edit Details
                  </Button>
                  <Button type="submit" className="gap-2" disabled={createRequest.isPending}>
                    <Send className="h-4 w-4" />
                    {createRequest.isPending ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          </motion.div>
        )}
        </AnimatePresence>
      </form>
    </div>
  )
}
