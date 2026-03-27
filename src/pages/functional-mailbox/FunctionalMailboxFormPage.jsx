import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useCreateMailboxRequest } from '@/hooks/use-mailbox-requests'
import { useMailboxFormFields } from '@/hooks/use-mailbox-form-fields'
import { useUIStore } from '@/stores/ui-store'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'motion/react'
import {
  Mail, FileSignature, Settings, User, CheckCircle,
  ArrowRight, ArrowLeft, Send, Loader2, Upload, X, Image as ImageIcon,
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
  { id: 'general', label: 'Mailbox', icon: Mail },
  { id: 'signature', label: 'Signature', icon: FileSignature },
  { id: 'requester', label: 'Requester', icon: User },
  { id: 'review', label: 'Review', icon: CheckCircle },
]

// System field keys that map directly to mailbox_requests columns
const SYSTEM_FIELD_KEYS = new Set([
  'project_name', 'project_leader', 'agency', 'email_to_create',
  'who_needs_access', 'creation_date', 'display_name', 'signature_title',
  'banner_social_icons', 'links', 'more_info', 'deleted_archived',
  'archive_date', 'deletion_date',
  'first_name', 'last_name', 'mail',
])

// Map field_key to request column (when they differ)
const FIELD_TO_COLUMN = {
  banner_social_icons: 'banner_url',
  more_info: 'more_info',
  mail: 'requester_email',
}

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

// ── Email tags field ──
function EmailTagsField({ value, onChange, placeholder }) {
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState('')

  // Parse comma-separated string to array
  const tags = value ? value.split(',').map((t) => t.trim()).filter(Boolean) : []

  const isValidEmail = (email) => /^[\w.+-]+@[\w.-]+\.\w{2,}$/.test(email.trim())

  const addTag = (raw) => {
    const email = raw.trim().toLowerCase()
    if (!email) return
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address')
      return
    }
    if (tags.includes(email)) {
      setError('Email already added')
      return
    }
    setError('')
    const updated = [...tags, email]
    onChange(updated.join(', '))
    setInputValue('')
  }

  const removeTag = (idx) => {
    const updated = tags.filter((_, i) => i !== idx)
    onChange(updated.join(', '))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      e.preventDefault()
      addTag(inputValue)
    }
    if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1)
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text')
    // Split by comma, semicolon, newline, or space
    const emails = text.split(/[,;\n\s]+/).filter(Boolean)
    const valid = []
    for (const email of emails) {
      const trimmed = email.trim().toLowerCase()
      if (isValidEmail(trimmed) && !tags.includes(trimmed) && !valid.includes(trimmed)) {
        valid.push(trimmed)
      }
    }
    if (valid.length > 0) {
      onChange([...tags, ...valid].join(', '))
      setInputValue('')
      setError('')
    }
  }

  return (
    <div className="space-y-2">
      <div className="min-h-[42px] flex flex-wrap items-center gap-1.5 rounded-lg border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 transition-all">
        {tags.map((tag, idx) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 bg-primary/10 text-primary rounded-md px-2 py-0.5 text-xs font-medium"
          >
            <Mail className="h-3 w-3 shrink-0" />
            {tag}
            <button
              type="button"
              onClick={() => removeTag(idx)}
              className="ml-0.5 hover:text-destructive transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          type="email"
          value={inputValue}
          onChange={(e) => { setInputValue(e.target.value); setError('') }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => { if (inputValue.trim()) addTag(inputValue) }}
          placeholder={tags.length === 0 ? (placeholder || 'name@company.com') : 'Add another...'}
          className="flex-1 min-w-[150px] bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
        />
      </div>
      {error && (
        <p className="text-[11px] text-destructive">{error}</p>
      )}
      <p className="text-[10px] text-muted-foreground">
        Press <kbd className="bg-muted px-1 py-0.5 rounded text-[9px] font-mono">Enter</kbd> or <kbd className="bg-muted px-1 py-0.5 rounded text-[9px] font-mono">,</kbd> to add. You can also paste multiple emails.
      </p>
    </div>
  )
}

// ── File upload field ──
function FileUploadField({ value, onChange, helpText }) {
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (file) => {
    if (!file) return
    // Validate size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return
    }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('mailbox-assets').upload(path, file)
      if (error) throw error
      const { data } = supabase.storage.from('mailbox-assets').getPublicUrl(path)
      onChange(data.publicUrl)
    } catch {
      // Upload failed silently
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={(e) => {
          handleUpload(e.target.files[0])
          e.target.value = ''
        }}
      />
      {value ? (
        <div className="relative inline-block">
          <img src={value} alt="Banner" className="h-20 rounded-lg border object-contain" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="gap-2"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? 'Uploading...' : 'Choose file'}
        </Button>
      )}
      {helpText && <p className="text-[11px] text-muted-foreground">{helpText}</p>}
    </div>
  )
}

// ── Render a single dynamic field ──
function DynamicField({ field, value, onChange }) {
  const options = Array.isArray(field.options) ? field.options : []

  switch (field.field_type) {
    case 'text':
      return (
        <Input
          type={field.field_key === 'mail' ? 'email' : 'text'}
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

    case 'file':
      return (
        <FileUploadField
          value={value || ''}
          onChange={onChange}
          helpText={field.help_text}
        />
      )

    case 'email_tags':
      return (
        <EmailTagsField
          value={value || ''}
          onChange={onChange}
          placeholder={field.placeholder}
        />
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
            />
            {field.help_text && field.field_type !== 'checkbox' && field.field_type !== 'file' && (
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
function StepReview({ form, profile, allFields }) {
  const rows = allFields
    .filter((f) => f.is_active && evaluateCondition(f, form))
    .map((f) => {
      const isSystem = SYSTEM_FIELD_KEYS.has(f.field_key)
      const raw = isSystem ? form[f.field_key] : (form.custom_fields?.[f.field_key] ?? '')
      let display = ''

      if (f.field_type === 'file' && raw) {
        display = '(file uploaded)'
      } else if (Array.isArray(raw)) {
        display = raw.join(', ') || '—'
      } else if (typeof raw === 'boolean') {
        display = raw ? 'Yes' : 'No'
      } else {
        display = raw || '—'
      }

      return { label: f.label, value: display, fieldKey: f.field_key, url: f.field_type === 'file' ? raw : null }
    })

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Please review the information below before submitting.
      </p>
      <div className="rounded-xl border bg-card overflow-hidden">
        {rows.map(({ label, value, fieldKey, url }, idx) => (
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
              {url ? (
                <img src={url} alt={label} className="h-12 rounded border object-contain" />
              ) : (
                value
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main page ──
export function FunctionalMailboxFormPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const createRequest = useCreateMailboxRequest()
  const { data: formFields = [], isLoading: fieldsLoading } = useMailboxFormFields()
  const showToast = useUIStore((s) => s.showToast)

  const [currentStep, setCurrentStep] = useState(0)
  const [form, setForm] = useState({
    project_name: '',
    project_leader: '',
    agency: '',
    email_to_create: '',
    who_needs_access: '',
    creation_date: '',
    display_name: '',
    signature_title: '',
    banner_social_icons: '',
    links: '',
    more_info: '',
    deleted_archived: '',
    archive_date: '',
    deletion_date: '',
    first_name: '',
    last_name: '',
    mail: '',
    custom_fields: {},
  })

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  // Auto-fill requester fields from profile
  useEffect(() => {
    if (profile) {
      setForm((prev) => ({
        ...prev,
        first_name: prev.first_name || profile.first_name || '',
        last_name: prev.last_name || profile.last_name || '',
        mail: prev.mail || profile.email || '',
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
      // Build payload — map form fields to request columns
      const payload = {
        project_name: form.project_name,
        project_leader: form.project_leader,
        agency: form.agency,
        email_to_create: form.email_to_create,
        who_needs_access: form.who_needs_access,
        creation_date: form.creation_date || null,
        display_name: form.display_name,
        signature_title: form.signature_title,
        banner_url: form.banner_social_icons || null,
        links: form.links,
        more_info: form.more_info,
        deleted_archived: form.deleted_archived,
        archive_date: form.archive_date || null,
        deletion_date: form.deletion_date || null,
        requested_by: user?.id,
        requested_by_name: profile ? `${profile.first_name} ${profile.last_name}` : '',
        requested_on: new Date().toISOString().split('T')[0],
        requester_email: form.mail,
        custom_fields: form.custom_fields,
      }

      await createRequest.mutateAsync(payload)

      navigate('/')
      setTimeout(() => showToast('Mailbox request submitted successfully!'), 100)
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
          Functional Mailbox
        </Badge>
        <h1 className="text-3xl font-display font-bold tracking-tight text-gradient-primary">
          New Mailbox Request
        </h1>
        <p className="text-muted-foreground mt-2">
          Request a new functional mailbox for your team or project
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
