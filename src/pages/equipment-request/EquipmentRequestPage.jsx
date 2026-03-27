import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useUIStore } from '@/stores/ui-store'
import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/api/send-email'
import { motion, AnimatePresence } from 'motion/react'
import {
  User, Calendar, Monitor, CheckCircle,
  ArrowRight, ArrowLeft, Send, Loader2, Package,
  Laptop, Smartphone, Tablet, Tv,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'

// ── Step definitions ──
const STEP_DEFS = [
  { id: 'requester', label: 'Requester', icon: User },
  { id: 'event', label: 'Event', icon: Calendar },
  { id: 'equipment', label: 'Equipment', icon: Monitor },
  { id: 'review', label: 'Review', icon: CheckCircle },
]

// ── Equipment items ──
const EQUIPMENT_ITEMS = [
  { id: 'PC', label: 'PC', icon: Laptop },
  { id: 'SCREEN', label: 'Screen', icon: Tv },
  { id: 'TABLET', label: 'Tablet', icon: Tablet },
  { id: 'PHONE', label: 'Phone', icon: Smartphone },
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

// ── Step 3: Equipment ──
function StepEquipment({ form, setField }) {
  const selected = form.equipment_needed || []

  const toggleEquipment = (id) => {
    if (selected.includes(id)) {
      setField('equipment_needed', selected.filter((s) => s !== id))
    } else {
      setField('equipment_needed', [...selected, id])
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>I need for my event</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {EQUIPMENT_ITEMS.map((item) => {
            const Icon = item.icon
            const checked = selected.includes(item.id)
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleEquipment(item.id)}
                className={`relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                  checked
                    ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                    : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
                }`}
              >
                {checked && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`h-12 w-12 rounded-xl flex items-center justify-center transition-colors ${
                    checked ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <span
                  className={`text-sm font-medium transition-colors ${
                    checked ? 'text-primary' : 'text-foreground'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Switch
            checked={!!form.need_accessories}
            onCheckedChange={(val) => setField('need_accessories', val)}
          />
          <Label className="cursor-pointer">Do you need some accessories?</Label>
        </div>

        {form.need_accessories && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="space-y-2">
              <Label>Accessories details</Label>
              <Textarea
                value={form.accessories_details}
                onChange={(e) => setField('accessories_details', e.target.value)}
                placeholder="Printer, HDMI Cables, Battery, Router, Power Strips..."
                rows={3}
              />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// ── Step 4: Review ──
function StepReview({ form }) {
  const equipmentLabels = (form.equipment_needed || [])
    .map((id) => EQUIPMENT_ITEMS.find((e) => e.id === id)?.label || id)
    .join(', ')

  const rows = [
    { label: 'Requested By', value: form.requested_by },
    { label: 'From Company', value: form.from_company },
    { label: 'Event Name', value: form.event_name },
    { label: 'Job', value: form.job },
    { label: 'Pick Up', value: form.pick_up },
    { label: 'Deposit', value: form.deposit },
    { label: 'Equipment Needed', value: equipmentLabels },
    { label: 'Accessories', value: form.need_accessories ? 'Yes' : 'No' },
    ...(form.need_accessories && form.accessories_details
      ? [{ label: 'Accessories Details', value: form.accessories_details }]
      : []),
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
    need_accessories: false,
    accessories_details: '',
  })

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

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
        return form.equipment_needed.length > 0
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

      const { error } = await supabase.from('it_requests').insert({
        type: 'equipment',
        requester_id: user.id,
        requester_email: user.email,
        requester_name: submitterName,
        data: { ...form, submitted_at: new Date().toISOString() },
        status: 'pending',
      })
      if (error) throw error

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
                <StepEquipment form={form} setField={setField} />
              )}
              {isReview && <StepReview form={form} />}
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
