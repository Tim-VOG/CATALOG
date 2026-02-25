import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/lib/auth'
import { useCartStore } from '@/stores/cart-store'
import { useLocations } from '@/hooks/use-locations'
import { useCreateLoanRequest } from '@/hooks/use-loan-requests'
import { useActiveFormFields } from '@/hooks/use-form-fields'
import { useUIStore } from '@/stores/ui-store'
import { checkoutSchema } from '@/lib/validations/checkout'
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

export function CheckoutPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { items, startDate, endDate, clearCart } = useCartStore()
  const { data: locations = [] } = useLocations()
  const createRequest = useCreateLoanRequest()
  const { data: customFields = [] } = useActiveFormFields()
  const showToast = useUIStore((s) => s.showToast)
  const [step, setStep] = useState(0)
  const [customValues, setCustomValues] = useState({})
  const [customErrors, setCustomErrors] = useState({})

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      project_name: '',
      project_description: '',
      location_id: '',
      location_other: '',
      justification: '',
      priority: 'normal',
      terms_accepted: false,
      responsibility_accepted: false,
    },
  })

  const formValues = watch()

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

  const validateCustomFields = () => {
    const errors = {}
    customFields.forEach((field) => {
      const val = customValues[field.field_key]
      if (field.is_required) {
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          errors[field.field_key] = `${field.label} is required`
        }
      }
      if (field.field_type === 'email' && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        errors[field.field_key] = 'Please enter a valid email'
      }
    })
    setCustomErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleStepNext = () => {
    if (validateCustomFields()) {
      setStep(1)
    }
  }

  const onSubmit = async (data) => {
    try {
      await createRequest.mutateAsync({
        request: {
          user_id: user.id,
          project_name: data.project_name,
          project_description: data.project_description,
          location_id: data.location_id || null,
          location_other: data.location_other || null,
          justification: data.justification || null,
          priority: data.priority,
          pickup_date: startDate,
          return_date: endDate,
          terms_accepted: data.terms_accepted,
          responsibility_accepted: data.responsibility_accepted,
          custom_fields: customValues,
          status: 'pending',
        },
        items,
      })
      clearCart()
      showToast('Request submitted successfully!')
      navigate('/requests')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

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

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 1: Project Details */}
        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="project_name">Project Name *</Label>
                <Input id="project_name" {...register('project_name')} placeholder="e.g. Client Demo - Acme Corp" />
                {errors.project_name && <p className="text-xs text-destructive">{errors.project_name.message}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="project_description">Description *</Label>
                <Textarea
                  id="project_description"
                  {...register('project_description')}
                  placeholder="Describe why you need this equipment..."
                  rows={3}
                />
                {errors.project_description && <p className="text-xs text-destructive">{errors.project_description.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="location_id">Pickup Location *</Label>
                  <Select id="location_id" {...register('location_id')}>
                    <option value="">Select location...</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </Select>
                  {errors.location_id && <p className="text-xs text-destructive">{errors.location_id.message}</p>}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="priority">Priority</Label>
                  <Select id="priority" {...register('priority')}>
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </Select>
                </div>
              </div>

              {formValues.location_id && locations.find((l) => l.id === formValues.location_id)?.name?.includes('Remote') && (
                <div className="space-y-1">
                  <Label htmlFor="location_other">Shipping Address</Label>
                  <Textarea id="location_other" {...register('location_other')} placeholder="Full delivery address..." rows={2} />
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="justification">Additional Justification (optional)</Label>
                <Textarea id="justification" {...register('justification')} placeholder="Any additional notes for the admin..." rows={2} />
              </div>

              {/* Dynamic custom fields */}
              {customFields.length > 0 && (
                <>
                  <div className="border-t pt-4 mt-4">
                    <p className="text-sm font-medium text-muted-foreground mb-3">Additional Information</p>
                  </div>
                  {customFields.map((field) => (
                    <DynamicField
                      key={field.id}
                      field={field}
                      value={customValues[field.field_key]}
                      onChange={(val) => setCustomValues((prev) => ({ ...prev, [field.field_key]: val }))}
                      error={customErrors[field.field_key]}
                    />
                  ))}
                </>
              )}

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
                    <p className="font-medium">{formValues.project_name || '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Priority</span>
                    <Badge variant={formValues.priority === 'urgent' ? 'destructive' : formValues.priority === 'high' ? 'warning' : 'secondary'}>
                      {formValues.priority}
                    </Badge>
                  </div>
                </div>
                {formValues.project_description && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Description</span>
                    <p>{formValues.project_description}</p>
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
                      checked={formValues.terms_accepted}
                      onCheckedChange={(v) => setValue('terms_accepted', v, { shouldValidate: true })}
                    />
                    <span className="text-sm">
                      I accept the terms of use and understand that equipment must be returned in good condition by the agreed date.
                    </span>
                  </label>
                  {errors.terms_accepted && <p className="text-xs text-destructive ml-7">{errors.terms_accepted.message}</p>}

                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox
                      checked={formValues.responsibility_accepted}
                      onCheckedChange={(v) => setValue('responsibility_accepted', v, { shouldValidate: true })}
                    />
                    <span className="text-sm">
                      I accept personal responsibility for the borrowed equipment during the loan period.
                    </span>
                  </label>
                  {errors.responsibility_accepted && <p className="text-xs text-destructive ml-7">{errors.responsibility_accepted.message}</p>}
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
