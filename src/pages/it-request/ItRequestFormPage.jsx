import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useCreateItRequest } from '@/hooks/use-it-requests'
import { useUIStore } from '@/stores/ui-store'
import { motion, AnimatePresence } from 'motion/react'
import {
  User, Calendar, Monitor, Settings, CheckCircle,
  ArrowRight, ArrowLeft, Send, Loader2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'

// ── Step definitions ──
const STEPS = [
  { id: 'identity', label: 'Identity', icon: User },
  { id: 'dates', label: 'Dates', icon: Calendar },
  { id: 'it-needs', label: 'IT Needs', icon: Monitor },
  { id: 'additional', label: 'Additional', icon: Settings },
  { id: 'review', label: 'Review', icon: CheckCircle },
]

const ACCESS_OPTIONS = [
  'SHAREPOINT',
  'MAIL',
  'TEAMS',
  'TEAMS VO CONNECT',
]

const STATUS_OPTIONS = [
  'INTRAMUROS',
  'FREELANCE',
  'CONSULTANT',
  'INTERN',
]

const LISTING_OPTIONS = [
  'INTERNAL NEWSLETTER',
  'EXTERNAL NEWSLETTER',
  'BOTH',
  'NONE',
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

// ── Individual step components ──

function StepIdentity({ form, setField }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>First Name <span className="text-destructive">*</span></Label>
          <Input
            value={form.first_name}
            onChange={(e) => setField('first_name', e.target.value)}
            placeholder="e.g. Lulla"
          />
        </div>
        <div className="space-y-2">
          <Label>Last Name <span className="text-destructive">*</span></Label>
          <Input
            value={form.last_name}
            onChange={(e) => setField('last_name', e.target.value)}
            placeholder="e.g. Van Steensel"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={form.status} onChange={(e) => setField('status', e.target.value)}>
          <option value="">Select status...</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Business Unit</Label>
        <Input
          value={form.business_unit}
          onChange={(e) => setField('business_unit', e.target.value)}
          placeholder="e.g. SIGN BRUSSELS"
        />
      </div>
      <div className="space-y-2">
        <Label>Signature Title</Label>
        <Input
          value={form.signature_title}
          onChange={(e) => setField('signature_title', e.target.value)}
          placeholder="e.g. Intern, Consultant, Developer..."
        />
      </div>
    </div>
  )
}

function StepDates({ form, setField }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Starting Date <span className="text-destructive">*</span></Label>
          <Input
            type="date"
            value={form.start_date}
            onChange={(e) => setField('start_date', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Leaving Date</Label>
          <Input
            type="date"
            value={form.leaving_date}
            onChange={(e) => setField('leaving_date', e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">Leave empty if permanent position</p>
        </div>
      </div>
    </div>
  )
}

function StepItNeeds({ form, setField }) {
  const toggleAccess = (option) => {
    const current = form.access_needs || []
    if (current.includes(option)) {
      setField('access_needs', current.filter((a) => a !== option))
    } else {
      setField('access_needs', [...current, option])
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>Does he/she need a computer?</Label>
        <div className="flex gap-3">
          <Button
            type="button"
            variant={form.needs_computer === true ? 'default' : 'outline'}
            size="sm"
            onClick={() => setField('needs_computer', true)}
            className="min-w-[80px]"
          >
            Yes
          </Button>
          <Button
            type="button"
            variant={form.needs_computer === false ? 'default' : 'outline'}
            size="sm"
            onClick={() => setField('needs_computer', false)}
            className="min-w-[80px]"
          >
            No
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <Label>Access needed</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ACCESS_OPTIONS.map((option) => {
            const checked = (form.access_needs || []).includes(option)
            return (
              <label
                key={option}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  checked
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggleAccess(option)}
                />
                <span className="text-sm font-medium">{option}</span>
              </label>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>SharePoint Files URL</Label>
        <Input
          value={form.sharepoint_url}
          onChange={(e) => setField('sharepoint_url', e.target.value)}
          placeholder="https://vogroupbxl.sharepoint.com/..."
        />
        <p className="text-[11px] text-muted-foreground">Link to the user's SharePoint folder if applicable</p>
      </div>
    </div>
  )
}

function StepAdditional({ form, setField }) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Listing</Label>
        <Select value={form.listing} onChange={(e) => setField('listing', e.target.value)}>
          <option value="">Select listing...</option>
          {LISTING_OPTIONS.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </Select>
        <p className="text-[11px] text-muted-foreground">Newsletter subscription for the new hire</p>
      </div>
      <div className="space-y-2">
        <Label>Listing date</Label>
        <Input
          type="date"
          value={form.listing_date}
          onChange={(e) => setField('listing_date', e.target.value)}
        />
      </div>
    </div>
  )
}

function StepReview({ form, profile }) {
  const rows = [
    { label: 'Name', value: `${form.first_name} ${form.last_name}` },
    { label: 'Status', value: form.status || '—' },
    { label: 'Business Unit', value: form.business_unit || '—' },
    { label: 'Signature Title', value: form.signature_title || '—' },
    { label: 'Starting Date', value: form.start_date || '—' },
    { label: 'Leaving Date', value: form.leaving_date || '—' },
    { label: 'Needs Computer', value: form.needs_computer ? 'Yes' : 'No' },
    { label: 'Access Needed', value: (form.access_needs || []).join(', ') || '—' },
    { label: 'SharePoint URL', value: form.sharepoint_url || '—' },
    { label: 'Listing', value: form.listing || '—' },
    { label: 'Listing Date', value: form.listing_date || '—' },
    { label: 'Requested By', value: profile ? `${profile.first_name} ${profile.last_name}` : '—' },
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
  const showToast = useUIStore((s) => s.showToast)

  const [currentStep, setCurrentStep] = useState(0)
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    status: '',
    business_unit: '',
    signature_title: '',
    start_date: '',
    leaving_date: '',
    needs_computer: false,
    access_needs: [],
    sharepoint_url: '',
    listing: '',
    listing_date: '',
  })

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const canGoNext = () => {
    if (currentStep === 0) return form.first_name.trim() && form.last_name.trim()
    if (currentStep === 1) return form.start_date
    return true
  }

  const handleSubmit = async () => {
    try {
      await createRequest.mutateAsync({
        ...form,
        start_date: form.start_date || null,
        leaving_date: form.leaving_date || null,
        listing_date: form.listing_date || null,
        requested_by: user?.id,
        requested_by_name: profile ? `${profile.first_name} ${profile.last_name}` : '',
      })
      showToast('IT request submitted successfully!')
      navigate('/')
    } catch (err) {
      showToast(err.message || 'Failed to submit request', 'error')
    }
  }

  const stepContent = [
    <StepIdentity key="identity" form={form} setField={setField} />,
    <StepDates key="dates" form={form} setField={setField} />,
    <StepItNeeds key="it-needs" form={form} setField={setField} />,
    <StepAdditional key="additional" form={form} setField={setField} />,
    <StepReview key="review" form={form} profile={profile} />,
  ]

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
      <StepProgress currentStep={currentStep} steps={STEPS} />

      {/* Step content */}
      <Card variant="elevated" className="mb-6">
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-6">
            {(() => {
              const StepIcon = STEPS[currentStep].icon
              return <StepIcon className="h-5 w-5 text-primary" />
            })()}
            <h2 className="text-lg font-display font-bold">
              {STEPS[currentStep].label}
            </h2>
            <span className="text-xs text-muted-foreground ml-auto">
              Step {currentStep + 1} of {STEPS.length}
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
              {stepContent[currentStep]}
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

        {currentStep < STEPS.length - 1 ? (
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
