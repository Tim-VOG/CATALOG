import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useUIStore } from '@/stores/ui-store'
import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/api/send-email'
import { buildConfirmationEmail } from '@/services/request-status-service'
import { motion, AnimatePresence } from 'motion/react'
import {
  UserMinus, Calendar, Shield, Monitor, User, CheckCircle,
  ArrowRight, ArrowLeft, Send, Loader2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'

// ── Companies ──
const COMPANIES = [
  'MAX',
  'SIGN BRUSSELS',
  'STUDIO GONDO',
  'VO EUROPE',
  'VO EVENT',
  'VO GROUP',
  'VO MIT',
  'THE LITTLE VOICE',
]

// ── Step definitions ──
const STEPS = [
  { id: 'who', label: 'Who', icon: UserMinus },
  { id: 'when', label: 'When', icon: Calendar },
  { id: 'revocation', label: 'Revocation', icon: Shield },
  { id: 'equipment', label: 'Equipment', icon: Monitor },
  { id: 'requester', label: 'Requester', icon: User },
  { id: 'review', label: 'Review', icon: CheckCircle },
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

// ── Step 1: Who ──
function StepWho({ form, setField }) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>
          Name
          <span className="text-destructive ml-1">*</span>
        </Label>
        <Input
          type="text"
          value={form.name}
          onChange={(e) => setField('name', e.target.value)}
          placeholder="Full name of the leaving collaborator"
        />
      </div>

      <div className="space-y-2">
        <Label>
          Company
          <span className="text-destructive ml-1">*</span>
        </Label>
        <Select value={form.company} onChange={(e) => setField('company', e.target.value)}>
          <option value="">Select...</option>
          {COMPANIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
      </div>
    </div>
  )
}

// ── Step 2: When ──
function StepWhen({ form, setField }) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>
          Departure On
          <span className="text-destructive ml-1">*</span>
        </Label>
        <Input
          type="date"
          value={form.departure_on}
          onChange={(e) => setField('departure_on', e.target.value)}
        />
      </div>
    </div>
  )
}

// ── Step 3: Revocation ──
function StepRevocation({ form, setField }) {
  const showTransferDetails =
    form.transfer_mailbox_data || form.transfer_sharepoint_data

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Revoke email access</Label>
        <div className="flex items-center gap-3">
          <Switch
            checked={form.revoke_email_access}
            onCheckedChange={(val) => setField('revoke_email_access', val)}
          />
          <span className="text-sm text-muted-foreground">
            {form.revoke_email_access ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Revoke VPN / Tools access</Label>
        <div className="flex items-center gap-3">
          <Switch
            checked={form.revoke_vpn_tools_access}
            onCheckedChange={(val) => setField('revoke_vpn_tools_access', val)}
          />
          <span className="text-sm text-muted-foreground">
            {form.revoke_vpn_tools_access ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Transfer mailbox data</Label>
        <div className="flex items-center gap-3">
          <Switch
            checked={form.transfer_mailbox_data}
            onCheckedChange={(val) => setField('transfer_mailbox_data', val)}
          />
          <span className="text-sm text-muted-foreground">
            {form.transfer_mailbox_data ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Transfer SharePoint data</Label>
        <div className="flex items-center gap-3">
          <Switch
            checked={form.transfer_sharepoint_data}
            onCheckedChange={(val) => setField('transfer_sharepoint_data', val)}
          />
          <span className="text-sm text-muted-foreground">
            {form.transfer_sharepoint_data ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      {showTransferDetails && (
        <div className="space-y-2">
          <Label>Transfer details</Label>
          <Textarea
            value={form.transfer_details}
            onChange={(e) => setField('transfer_details', e.target.value)}
            placeholder="What data needs to be transferred and to whom?"
            rows={3}
          />
        </div>
      )}
    </div>
  )
}

// ── Step 4: Equipment ──
function StepEquipment({ form, setField }) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Collect laptop</Label>
        <div className="flex items-center gap-3">
          <Switch
            checked={form.collect_laptop}
            onCheckedChange={(val) => setField('collect_laptop', val)}
          />
          <span className="text-sm text-muted-foreground">
            {form.collect_laptop ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Collect phone</Label>
        <div className="flex items-center gap-3">
          <Switch
            checked={form.collect_phone}
            onCheckedChange={(val) => setField('collect_phone', val)}
          />
          <span className="text-sm text-muted-foreground">
            {form.collect_phone ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Collect badge/keys</Label>
        <div className="flex items-center gap-3">
          <Switch
            checked={form.collect_badge_keys}
            onCheckedChange={(val) => setField('collect_badge_keys', val)}
          />
          <span className="text-sm text-muted-foreground">
            {form.collect_badge_keys ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Equipment notes</Label>
        <Textarea
          value={form.equipment_notes}
          onChange={(e) => setField('equipment_notes', e.target.value)}
          placeholder="Any special instructions for equipment collection"
          rows={3}
        />
      </div>
    </div>
  )
}

// ── Step 5: Requester ──
function StepRequester({ form, setField }) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>
          Requested By
          <span className="text-destructive ml-1">*</span>
        </Label>
        <Input
          type="text"
          value={form.requested_by}
          onChange={(e) => setField('requested_by', e.target.value)}
          placeholder="Your full name"
        />
        <p className="text-[11px] text-muted-foreground">Auto-filled from your profile</p>
      </div>

      <div className="space-y-2">
        <Label>
          Requested On
          <span className="text-destructive ml-1">*</span>
        </Label>
        <Input
          type="date"
          value={form.requested_on}
          onChange={(e) => setField('requested_on', e.target.value)}
        />
        <p className="text-[11px] text-muted-foreground">Auto-filled with today's date</p>
      </div>
    </div>
  )
}

// ── Step 6: Review ──
const REVIEW_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'company', label: 'Company' },
  { key: 'departure_on', label: 'Departure On' },
  { key: 'revoke_email_access', label: 'Revoke Email Access', type: 'toggle' },
  { key: 'revoke_vpn_tools_access', label: 'Revoke VPN / Tools Access', type: 'toggle' },
  { key: 'transfer_mailbox_data', label: 'Transfer Mailbox Data', type: 'toggle' },
  { key: 'transfer_sharepoint_data', label: 'Transfer SharePoint Data', type: 'toggle' },
  { key: 'transfer_details', label: 'Transfer Details', showIf: (f) => f.transfer_mailbox_data || f.transfer_sharepoint_data },
  { key: 'collect_laptop', label: 'Collect Laptop', type: 'toggle' },
  { key: 'collect_phone', label: 'Collect Phone', type: 'toggle' },
  { key: 'collect_badge_keys', label: 'Collect Badge/Keys', type: 'toggle' },
  { key: 'equipment_notes', label: 'Equipment Notes' },
  { key: 'requested_by', label: 'Requested By' },
  { key: 'requested_on', label: 'Requested On' },
]

function StepReview({ form }) {
  const rows = REVIEW_FIELDS
    .filter((f) => !f.showIf || f.showIf(form))
    .map((f) => {
      const raw = form[f.key]
      let display
      if (f.type === 'toggle') {
        display = raw ? 'Yes' : 'No'
      } else {
        display = raw || '\u2014'
      }
      return { label: f.label, value: display, key: f.key }
    })

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Please review the information below before submitting.
      </p>
      <div className="rounded-xl border bg-card overflow-hidden">
        {rows.map(({ label, value, key }, idx) => (
          <div
            key={key}
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
  const showToast = useUIStore((s) => s.showToast)

  const [currentStep, setCurrentStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: '',
    company: '',
    departure_on: '',
    revoke_email_access: true,
    revoke_vpn_tools_access: true,
    transfer_mailbox_data: false,
    transfer_sharepoint_data: false,
    transfer_details: '',
    collect_laptop: true,
    collect_phone: false,
    collect_badge_keys: true,
    equipment_notes: '',
    requested_by: '',
    requested_on: new Date().toISOString().split('T')[0],
  })

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  // Auto-fill requester fields from profile
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
  const canGoNext = () => {
    const step = STEPS[currentStep]
    switch (step.id) {
      case 'who':
        return !!form.name.trim() && !!form.company
      case 'when':
        return !!form.departure_on
      case 'requester':
        return !!form.requested_by.trim() && !!form.requested_on
      default:
        return true
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const submitterName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')

      await supabase.from('it_requests').insert({
        type: 'offboarding',
        requester_id: user.id,
        requester_email: user.email,
        requester_name: submitterName,
        data: { ...form, submitted_at: new Date().toISOString() },
        status: 'pending',
      })

      // Confirmation email to user
      sendEmail({
        to: user.email,
        subject: 'Your offboarding request has been received',
        body: buildConfirmationEmail({ name: submitterName, type: 'offboarding', detail: form.name }),
        isHtml: true,
      })

      // Notify admin
      sendEmail({
        to: 'admin@vo-group.be',
        subject: `Offboarding Request: ${form.name || 'Unknown'}`,
        body: `<p><strong>${submitterName}</strong> submitted an offboarding request for <strong>${form.name}</strong> (${form.company}).</p>
          <p>Departure date: ${form.departure_on}</p>
          <p>Please review it in the admin panel.</p>`,
      })

      navigate('/')
      setTimeout(() => showToast('Offboarding request submitted successfully!'), 100)
    } catch (err) {
      showToast(err.message || 'Failed to submit request', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const currentStepDef = STEPS[currentStep]
  const isReview = currentStepDef.id === 'review'

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
          Offboarding Request
        </h1>
        <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
          It is imperative that the leaving collaborator passes on information (e-mail, Sharepoint, etc.) before departure.
        </p>
      </motion.div>

      {/* Step progress */}
      <StepProgress currentStep={currentStep} steps={STEPS} />

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
              {currentStepDef.id === 'who' && (
                <StepWho form={form} setField={setField} />
              )}
              {currentStepDef.id === 'when' && (
                <StepWhen form={form} setField={setField} />
              )}
              {currentStepDef.id === 'revocation' && (
                <StepRevocation form={form} setField={setField} />
              )}
              {currentStepDef.id === 'equipment' && (
                <StepEquipment form={form} setField={setField} />
              )}
              {currentStepDef.id === 'requester' && (
                <StepRequester form={form} setField={setField} />
              )}
              {isReview && (
                <StepReview form={form} />
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
