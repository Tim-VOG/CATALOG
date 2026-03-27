import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useOffboardingFormFields } from '@/hooks/use-offboarding'
import { useCreateItRequest } from '@/hooks/use-it-requests'
import { useUIStore } from '@/stores/ui-store'
import { sendEmail } from '@/lib/api/send-email'
import { motion, AnimatePresence } from 'motion/react'
import {
  UserMinus, Shield, Monitor, DoorOpen, CheckCircle,
  ArrowRight, ArrowLeft, Send, Loader2,
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

// ── Step definitions matching the offboarding form builder steps ──
const STEP_DEFS = [
  { id: 'general', label: 'General', icon: UserMinus },
  { id: 'it-revocation', label: 'IT Revocation', icon: Shield },
  { id: 'equipment', label: 'Equipment', icon: Monitor },
  { id: 'exit', label: 'Exit', icon: DoorOpen },
  { id: 'review', label: 'Review', icon: CheckCircle },
]

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
function DynamicField({ field, value, onChange }) {
  const options = Array.isArray(field.options) ? field.options : []

  switch (field.field_type) {
    case 'text':
      return (
        <Input
          type="text"
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
        const value = form[field.field_key] ?? ''

        return (
          <div key={field.id} className="space-y-2">
            {field.field_type !== 'checkbox' && (
              <Label>
                {field.label}
                {field.is_required && <span className="text-destructive ml-1">*</span>}
              </Label>
            )}
            <DynamicField
              field={field}
              value={value}
              onChange={(val) => setField(field.field_key, val)}
            />
            {field.help_text && field.field_type !== 'checkbox' && (
              <p className="text-[11px] text-muted-foreground">{field.help_text}</p>
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
function StepReview({ form, allFields }) {
  const rows = allFields
    .filter((f) => f.is_active && evaluateCondition(f, form))
    .map((f) => {
      const raw = form[f.field_key] ?? ''
      let display = ''

      if (Array.isArray(raw)) {
        display = raw.join(', ') || '—'
      } else if (typeof raw === 'boolean') {
        display = raw ? 'Yes' : 'No'
      } else {
        display = raw || '—'
      }

      return { label: f.label, value: display, fieldKey: f.field_key }
    })

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Please review the information below before submitting.
      </p>
      <div className="rounded-xl border bg-card overflow-hidden">
        {rows.map(({ label, value, fieldKey }, idx) => (
          <div
            key={fieldKey}
            className={`flex items-start gap-4 px-5 py-3 ${
              idx < rows.length - 1 ? 'border-b border-border/50' : ''
            }`}
          >
            <span className="text-xs font-semibold text-muted-foreground w-36 shrink-0 pt-0.5 uppercase tracking-wider">
              {label}
            </span>
            <span className="text-sm text-foreground break-all">
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main page ──
export function OffboardingRequestPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const createRequest = useCreateItRequest()
  const { data: formFields = [], isLoading: fieldsLoading } = useOffboardingFormFields()
  const showToast = useUIStore((s) => s.showToast)

  const [currentStep, setCurrentStep] = useState(0)
  const [form, setForm] = useState({})

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  // Auto-fill requester fields from profile
  useEffect(() => {
    if (profile) {
      setForm((prev) => ({
        ...prev,
        requester_first_name: prev.requester_first_name || profile.first_name || '',
        requester_last_name: prev.requester_last_name || profile.last_name || '',
        requester_email: prev.requester_email || profile.email || '',
      }))
    }
  }, [profile])

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
    return STEP_DEFS.filter((s) => {
      if (s.id === 'review') return true
      return (fieldsByStep[s.id] || []).length > 0
    })
  }, [fieldsByStep])

  // Validation: check required fields for current step
  const canGoNext = () => {
    const step = activeSteps[currentStep]
    if (!step || step.id === 'review') return true

    const stepFields = fieldsByStep[step.id] || []
    for (const field of stepFields) {
      if (!field.is_required) continue
      if (!evaluateCondition(field, form)) continue

      const value = form[field.field_key] ?? ''

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
      const submitterName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')

      await createRequest.mutateAsync({
        type: 'offboarding',
        requester_id: user.id,
        requester_email: user.email,
        requester_name: submitterName,
        data: { ...form, submitted_at: new Date().toISOString() },
        status: 'pending',
      })

      // Send notification email
      const employeeName = form.employee_name || form.first_name || 'Unknown'
      sendEmail({
        to: 'admin@vo-group.be',
        subject: `Offboarding Request: ${employeeName}`,
        body: `<p><strong>${submitterName}</strong> submitted an offboarding request.</p>
          <p>Please review it in the admin panel.</p>`,
      })

      navigate('/')
      setTimeout(() => showToast('Offboarding request submitted successfully!'), 100)
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
          Offboarding
        </Badge>
        <h1 className="text-3xl font-display font-bold tracking-tight text-gradient-primary">
          New Offboarding Request
        </h1>
        <p className="text-muted-foreground mt-2">
          Request account & equipment offboarding for a departing employee
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
                <StepReview form={form} allFields={formFields} />
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
