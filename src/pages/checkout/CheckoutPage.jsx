import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useCartStore } from '@/stores/cart-store'
import { useLocations } from '@/hooks/use-locations'
import { useCreateLoanRequest } from '@/hooks/use-loan-requests'
import { useActiveFormFields } from '@/hooks/use-form-fields'
import { useUIStore } from '@/stores/ui-store'
import { useAppSettings } from '@/hooks/use-settings'
import { sendEmail } from '@/lib/api/send-email'
import { wrapEmailHtml } from '@/lib/email-html'
import { getNotificationRecipients } from '@/lib/api/notification-recipients'
import { ArrowLeft, ArrowRight, Check, ClipboardList, Send } from 'lucide-react'
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
    const errors = {}
    activeFields.forEach((field) => {
      const val = fieldValues[field.field_key]
      if (field.is_required) {
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          errors[field.field_key] = `${field.label} is required`
        }
      }
      if (field.field_type === 'email' && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        errors[field.field_key] = 'Please enter a valid email'
      }
    })
    // Also validate project_name min length
    if (fieldValues.project_name && fieldValues.project_name.length < 3) {
      errors.project_name = 'Project name must be at least 3 characters'
    }
    if (fieldValues.project_description && fieldValues.project_description.length < 10) {
      errors.project_description = 'Please provide a brief description (min 10 characters)'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
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

    // Separate system field values from custom field values
    const systemKeys = activeFields.filter((f) => f.is_system).map((f) => f.field_key)
    const customFields = {}
    Object.entries(fieldValues).forEach(([k, v]) => {
      if (!systemKeys.includes(k) && !['terms_accepted', 'responsibility_accepted', 'location_other'].includes(k)) {
        customFields[k] = v
      }
    })

    try {
      const req = await createRequest.mutateAsync({
        request: {
          user_id: user.id,
          project_name: fieldValues.project_name || '',
          project_description: fieldValues.project_description || '',
          location_id: fieldValues.location_id || null,
          location_other: fieldValues.location_other || null,
          justification: fieldValues.justification || null,
          priority: fieldValues.priority || 'normal',
          pickup_date: startDate,
          return_date: endDate,
          terms_accepted: fieldValues.terms_accepted,
          responsibility_accepted: fieldValues.responsibility_accepted,
          custom_fields: customFields,
          status: 'pending',
        },
        items,
      })
      clearCart()
      showToast('Request submitted successfully!')

      // Send notification email (fire and forget — don't block navigation)
      const appName = settings?.app_name || 'VO Gear Hub'
      const logoUrl = settings?.logo_url || ''
      const requesterName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || user?.email
      const itemSummary = items.map((i) => `${i.product.name} x${i.quantity}`).join(', ')

      const emailBody = wrapEmailHtml(
        `New equipment request submitted by <strong>${requesterName}</strong>.\n\n` +
        `<strong>Project:</strong> ${fieldValues.project_name || '—'}\n` +
        `<strong>Priority:</strong> ${fieldValues.priority || 'normal'}\n` +
        `<strong>Period:</strong> ${formatDate(startDate)} → ${formatDate(endDate)}\n` +
        `<strong>Items:</strong> ${itemSummary}\n\n` +
        (fieldValues.project_description ? `<strong>Description:</strong> ${fieldValues.project_description}\n\n` : '') +
        `Request #${req.request_number || req.id}`,
        { appName, logoUrl }
      )

      // Get notification recipients
      getNotificationRecipients()
        .then((recipients) => {
          const adminEmails = (recipients || [])
            .filter((r) => r.is_active && r.notify_on_new_request)
            .map((r) => r.email)
          if (adminEmails.length > 0) {
            sendEmail({
              to: adminEmails,
              subject: `[${appName}] VO Gear Hub - New request: ${fieldValues.project_name || 'Equipment request'} — by ${requesterName}`,
              body: emailBody,
              isHtml: true,
            })
          }
        })
        .catch(() => {}) // silently fail — email is non-critical

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

      {/* Stepper */}
      <div className="flex items-center gap-4">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
              i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn('text-sm font-medium', i <= step ? 'text-foreground' : 'text-muted-foreground')}>
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="w-12 h-px bg-border" />}
          </div>
        ))}
      </div>

      <form onSubmit={onSubmit}>
        {/* Step 1: Project Details — all fields from DB */}
        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeFields.map((field) => renderField(field))}

              <div className="flex justify-end">
                <Button type="button" className="gap-2" onClick={handleStepNext}>
                  Review <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Review & Submit */}
        {step === 1 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Request Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
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
                  <div>
                    <span className="text-muted-foreground">Priority</span>
                    <Badge variant={fieldValues.priority === 'urgent' ? 'destructive' : fieldValues.priority === 'high' ? 'warning' : 'secondary'}>
                      {fieldValues.priority || 'normal'}
                    </Badge>
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
        )}
      </form>
    </div>
  )
}
