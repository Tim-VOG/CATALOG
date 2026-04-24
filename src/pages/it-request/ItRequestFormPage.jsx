import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useCreateItRequest } from '@/hooks/use-it-requests'
import { createOnboardingRecipient } from '@/lib/api/onboarding'
import { sendEmail } from '@/lib/api/send-email'
import { useItFormFields } from '@/hooks/use-it-form-fields'
import { useUIStore } from '@/stores/ui-store'
import { BUSINESS_UNITS } from '@/lib/constants/business-units'
import { generateCorporateEmail } from '@/lib/utils/generate-email'
import { motion, AnimatePresence } from 'motion/react'
import {
  User, Calendar, Monitor, Settings, CheckCircle,
  ArrowRight, ArrowLeft, Send, Loader2, Mail,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { PageLoading } from '@/components/common/LoadingSpinner'

// ── Step definitions ──
const STEP_DEFS = [
  { id: 'identity', label: 'Identity', icon: User },
  { id: 'dates', label: 'Dates', icon: Calendar },
  { id: 'it-needs', label: 'IT Needs', icon: Monitor },
  { id: 'additional', label: 'Additional', icon: Settings },
  { id: 'review', label: 'Review', icon: CheckCircle },
]

// System field keys that map directly to it_requests columns
const SYSTEM_FIELD_KEYS = new Set([
  'first_name', 'last_name', 'status', 'business_unit',
  'personal_email', 'signature_title', 'start_date', 'leaving_date',
  'needs_computer', 'access_needs', 'sharepoint_url', 'listing', 'listing_date',
])

// ── Evaluate conditional logic ──
function evaluateCondition(field, formValues) {
  if (!field.condition_field) return true

  const value = formValues[field.condition_field]
  const { condition_operator, condition_value } = field

  switch (condition_operator) {
    case 'equals':
      return String(value) === String(condition_value)
    case 'not_equals':
      return String(value) !== String(condition_value)
    case 'contains':
      return Array.isArray(value)
        ? value.includes(condition_value)
        : String(value || '').includes(condition_value)
    case 'is_true':
      return value === true || value === 'true'
    case 'is_false':
      return value === false || value === 'false' || !value
    default:
      return true
  }
}

// ── Render a single dynamic field ──
function DynamicField({ field, value, onChange, form }) {
  const options = Array.isArray(field.options) ? field.options : []

  switch (field.field_type) {
    case 'text':
      return (
        <Input
          type={field.field_key === 'personal_email' ? 'email' : 'text'}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
        />
      )

    case 'textarea':
      return (
        <Textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
        />
      )

    case 'select':
      // Special: business_unit uses BUSINESS_UNITS constant for domains
      if (field.field_key === 'business_unit') {
        return (
          <Select value={value || ''} onChange={(e) => onChange(e.target.value)}>
            <option value="">Select...</option>
            {BUSINESS_UNITS.map((bu) => (
              <option key={bu.value} value={bu.value}>{bu.value}</option>
            ))}
          </Select>
        )
      }
      return (
        <Select value={value || ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select...</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </Select>
      )

    case 'multi_select': {
      const selected = Array.isArray(value) ? value : []
      const toggleOpt = (opt) => {
        if (selected.includes(opt)) {
          onChange(selected.filter((s) => s !== opt))
        } else {
          onChange([...selected, opt])
        }
      }
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {options.map((opt) => {
            const checked = selected.includes(opt)
            return (
              <label
                key={opt}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  checked
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <Checkbox checked={checked} onCheckedChange={() => toggleOpt(opt)} />
                <span className="text-sm font-medium">{opt}</span>
              </label>
            )
          })}
        </div>
      )
    }

    case 'date':
      return (
        <Input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )

    case 'toggle':
      // Special: needs_computer renders as Yes/No buttons
      if (field.field_key === 'needs_computer') {
        return (
          <div className="flex gap-3">
            <Button
              type="button"
              variant={value === true ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange(true)}
              className="min-w-[80px]"
            >
              Yes
            </Button>
            <Button
              type="button"
              variant={value === false ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange(false)}
              className="min-w-[80px]"
            >
              No
            </Button>
          </div>
        )
      }
      return (
        <div className="flex items-center gap-3">
          <Switch checked={!!value} onCheckedChange={onChange} />
          <span className="text-sm text-muted-foreground">{value ? 'Yes' : 'No'}</span>
        </div>
      )

    case 'checkbox':
      return (
        <div className="flex items-center gap-3">
          <Checkbox checked={!!value} onCheckedChange={onChange} />
          <span className="text-sm">{field.help_text || field.label}</span>
        </div>
      )

    default:
      return (
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
        />
      )
  }
}

// ── Dynamic step: renders all fields for a given step ──
function DynamicFormStep({ fields, form, setField }) {
  return (
    <div className="space-y-5">
      {fields.map((field) => {
        // Get value from form (system fields) or form.custom_fields (custom fields)
        const isSystem = SYSTEM_FIELD_KEYS.has(field.field_key)
        const value = isSystem ? form[field.field_key] : (form.custom_fields?.[field.field_key] ?? '')

        const handleChange = (val) => {
          if (isSystem) {
            setField(field.field_key, val)
          } else {
            setField('custom_fields', { ...form.custom_fields, [field.field_key]: val })
          }
        }

        return (
          <div key={field.id} className="space-y-2">
            {/* Don't show label for checkbox/toggle types that show inline */}
            {field.field_type !== 'checkbox' && (
              <Label>
                {field.label}
                {field.is_required && <span className="text-destructive ml-1">*</span>}
              </Label>
            )}
            <DynamicField
              field={field}
              value={value}
              onChange={handleChange}
              form={form}
            />
            {field.help_text && field.field_type !== 'checkbox' && (
              <p className="text-[11px] text-muted-foreground">{field.help_text}</p>
            )}

            {/* Auto-generated email preview for business_unit */}
            {field.field_key === 'business_unit' && form.generated_email && (
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-primary/5 border border-primary/20 mt-2">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground">Generated corporate email</p>
                  <code className="text-sm font-mono text-primary font-semibold">{form.generated_email}</code>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

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

// ── Review step ──
function StepReview({ form, profile, allFields }) {
  const rows = allFields
    .filter((f) => f.is_active && evaluateCondition(f, form))
    .map((f) => {
      const isSystem = SYSTEM_FIELD_KEYS.has(f.field_key)
      const raw = isSystem ? form[f.field_key] : (form.custom_fields?.[f.field_key] ?? '')
      let display = ''

      if (Array.isArray(raw)) {
        display = raw.join(', ') || '—'
      } else if (typeof raw === 'boolean') {
        display = raw ? 'Yes' : 'No'
      } else {
        display = raw || '—'
      }

      return { label: f.label, value: display }
    })

  // Add generated email + requested by
  rows.splice(
    rows.findIndex((r) => r.label === 'Business Unit') + 1,
    0,
    { label: 'Corporate Email', value: form.generated_email || '—' }
  )
  rows.push({
    label: 'Requested By',
    value: profile ? `${profile.first_name} ${profile.last_name}` : '—',
  })

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
            <span className="text-sm text-foreground break-all">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main page ──
export function ItRequestFormPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const createRequest = useCreateItRequest()
  const { data: formFields = [], isLoading: fieldsLoading } = useItFormFields()
  const showToast = useUIStore((s) => s.showToast)

  const [currentStep, setCurrentStep] = useState(0)
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    status: '',
    business_unit: '',
    signature_title: '',
    personal_email: '',
    generated_email: '',
    start_date: '',
    leaving_date: '',
    needs_computer: false,
    access_needs: [],
    sharepoint_url: '',
    listing: '',
    listing_date: '',
    custom_fields: {},
  })

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  // Auto-generate corporate email when name or business unit changes
  useEffect(() => {
    const email = generateCorporateEmail(form.first_name, form.last_name, form.business_unit)
    setForm((prev) => (prev.generated_email !== email ? { ...prev, generated_email: email } : prev))
  }, [form.first_name, form.last_name, form.business_unit])

  // Active fields only, filtered by conditional logic
  const activeFields = useMemo(() => {
    return formFields.filter((f) => f.is_active && evaluateCondition(f, form))
  }, [formFields, form])

  // Group active fields by step
  const fieldsByStep = useMemo(() => {
    const groups = {}
    for (const step of STEP_DEFS) {
      if (step.id === 'review') continue
      groups[step.id] = activeFields.filter((f) => f.step === step.id)
    }
    return groups
  }, [activeFields])

  // Determine which steps have fields (skip empty steps)
  const activeSteps = useMemo(() => {
    const steps = STEP_DEFS.filter((s) => {
      if (s.id === 'review') return true // always show review
      return (fieldsByStep[s.id] || []).length > 0
    })
    return steps
  }, [fieldsByStep])

  // Validation: check required fields for current step
  const canGoNext = () => {
    const step = activeSteps[currentStep]
    if (!step || step.id === 'review') return true

    const stepFields = fieldsByStep[step.id] || []
    for (const field of stepFields) {
      if (!field.is_required) continue
      if (!evaluateCondition(field, form)) continue

      const isSystem = SYSTEM_FIELD_KEYS.has(field.field_key)
      const value = isSystem ? form[field.field_key] : (form.custom_fields?.[field.field_key] ?? '')

      if (Array.isArray(value)) {
        if (value.length === 0) return false
      } else if (!value && value !== false) {
        return false
      }
    }
    return true
  }

  const handleSubmit = async () => {
    try {
      const payload = { ...form }
      // Clean date fields
      payload.start_date = payload.start_date || null
      payload.leaving_date = payload.leaving_date || null
      payload.listing_date = payload.listing_date || null
      payload.requested_by = user?.id
      payload.requested_by_name = profile ? `${profile.first_name} ${profile.last_name}` : ''

      await createRequest.mutateAsync(payload)

      // Confirmation email to user
      const submitterName = profile ? `${profile.first_name} ${profile.last_name}` : user?.email
      sendEmail({
        to: user.email,
        subject: 'Your IT request has been received',
        body: `<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:520px;margin:0 auto;">
          <h2 style="color:#1e293b;">Request received</h2>
          <p style="color:#64748b;font-size:15px;">Hi ${submitterName},</p>
          <p style="color:#64748b;font-size:15px;">Your <strong>IT</strong> request has been received and will be processed by the IT team.</p>
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
        subject: `New IT Request from ${submitterName}`,
        body: `<p><strong>${submitterName}</strong> submitted an IT request. Please review it in the admin panel.</p>`,
      })

      // Auto-create onboarding recipient so they appear in the Compose dropdown
      try {
        await createOnboardingRecipient({
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.generated_email || '',
          team: form.business_unit || '',
          department: '',
          start_date: form.start_date || null,
          language: 'en',
          personal_email: form.personal_email || '',
        })
      } catch {
        // Don't block the IT request on onboarding creation failure
      }

      navigate('/')
      // Show toast after navigation so it's visible on the hub page
      setTimeout(() => showToast('IT request submitted successfully!'), 100)
    } catch (err) {
      showToast(err.message || 'Failed to submit request', 'error')
    }
  }

  if (fieldsLoading) return <PageLoading />

  const currentStepDef = activeSteps[currentStep]
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
          IT Onboarding
        </Badge>
        <h1 className="text-3xl font-display font-bold tracking-tight text-gradient-primary">
          New IT Request
        </h1>
        <p className="text-muted-foreground mt-2">
          Submit an IT onboarding request for a new team member
        </p>
      </motion.div>

      {/* Step progress */}
      <StepProgress currentStep={currentStep} steps={activeSteps} />

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
              Step {currentStep + 1} of {activeSteps.length}
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
              {isReview ? (
                <StepReview form={form} profile={profile} allFields={formFields} />
              ) : (
                <DynamicFormStep
                  fields={fieldsByStep[currentStepDef.id] || []}
                  form={form}
                  setField={setField}
                />
              )}
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

        {currentStep < activeSteps.length - 1 ? (
          <Button
            onClick={() => setCurrentStep((s) => s + 1)}
            disabled={!canGoNext()}
            className="gap-2"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={createRequest.isPending}
            className="gap-2"
          >
            {createRequest.isPending ? (
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
