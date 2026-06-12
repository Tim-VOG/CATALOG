// @ts-nocheck — Phase-3 typing follow-up; remove this and fix once the surrounding API/component types stabilise.
import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useUIStore } from '@/stores/ui-store'
import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/api/send-email'
import { buildConfirmationEmail } from '@/services/request-status-service'
import { wrapEmailHtml, getEmailBranding } from '@/lib/email-html'
import { useUserEquipmentFor } from '@/hooks/use-user-equipment'
import { useQRCodesAssignedTo } from '@/hooks/use-qr-codes'
import { ProfileAutocomplete } from '@/components/common/ProfileAutocomplete'
import { motion, AnimatePresence } from 'motion/react'
import {
  UserMinus, Calendar, Shield, Monitor, User, CheckCircle,
  ArrowRight, ArrowLeft, Send, Loader2, Mail, Package, QrCode,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'

// ── Companies (alphabetical, aligned with onboarding) ──
const COMPANIES = [
  'AOP',
  'KRAFTHAUS',
  'MAX',
  'MIT',
  'SIGN BRUSSELS',
  'STUDIO GONDO',
  'THE LITTLE VOICE',
  'VO CONSULTING',
  'VO EUROPE',
  'VO EVENT',
  'VO GROUP',
  'VO LAB',
  'VO PRODUCTION',
  'VO STUDIOS',
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
function StepWho({ form, setField, setMultipleFields }) {
  const handlePickProfile = (profile) => {
    const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email
    setMultipleFields({
      name: fullName,
      leaving_user_id: profile.id,
      leaving_user_email: profile.email || '',
      company: profile.business_unit || form.company || '',
    })
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>
          Name
          <span className="text-destructive ml-1">*</span>
        </Label>
        <ProfileAutocomplete
          value={form.name}
          onChange={(text) => {
            // Typing free text: drop the previously linked user (their data
            // may no longer match what's typed).
            setMultipleFields({ name: text, leaving_user_id: null, leaving_user_email: '' })
          }}
          onSelect={handlePickProfile}
          placeholder="Start typing the leaving person's name…"
        />
        <p className="text-[11px] text-muted-foreground">
          {form.leaving_user_id
            ? 'Profile linked — company and assigned equipment have been auto-filled below.'
            : 'Pick someone from the suggestions list to auto-fill company and pre-load their assigned equipment.'}
        </p>
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
  const todayIso = new Date().toISOString().split('T')[0]
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
          min={todayIso}
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
          <Label>
            Transfer details
            <span className="text-destructive ml-1">*</span>
          </Label>
          <Textarea
            value={form.transfer_details}
            onChange={(e) => setField('transfer_details', e.target.value)}
            placeholder="What data needs to be transferred and to whom?"
            rows={3}
          />
          <p className="text-[11px] text-muted-foreground">
            Required when mailbox or SharePoint data needs to be transferred.
          </p>
        </div>
      )}

      {/* Out of office auto-reply — many leavers forget to set it themselves */}
      <div className="space-y-3 pt-3 border-t border-border/40">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" /> Out of office auto-reply
          </Label>
          <div className="flex items-center gap-3">
            <Switch
              checked={form.ooo_enabled}
              onCheckedChange={(val) => setField('ooo_enabled', val)}
            />
            <span className="text-sm text-muted-foreground">
              {form.ooo_enabled ? 'Yes — set up an auto-reply on the leaver\'s mailbox' : 'No'}
            </span>
          </div>
        </div>

        {form.ooo_enabled && (
          <div className="space-y-3 pl-7">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>From</Label>
                <Input
                  type="date"
                  value={form.ooo_start}
                  onChange={(e) => setField('ooo_start', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Until (optional)</Label>
                <Input
                  type="date"
                  value={form.ooo_end}
                  min={form.ooo_start || undefined}
                  onChange={(e) => setField('ooo_end', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Auto-reply message</Label>
              <Textarea
                value={form.ooo_message}
                onChange={(e) => setField('ooo_message', e.target.value)}
                placeholder={`Example: I have left the company on ${form.departure_on || '[date]'}. For any inquiries, please contact …`}
                rows={3}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Step 4: Equipment ──
const matches = (text, keywords) => {
  const t = (text || '').toLowerCase()
  return keywords.some((k) => t.includes(k))
}
const LAPTOP_KEYWORDS = ['laptop', 'macbook', 'computer', 'pc', 'workstation']
const PHONE_KEYWORDS = ['phone', 'iphone', 'smartphone', 'mobile']
const BADGE_KEYWORDS = ['badge', 'keys', 'clé', 'access card', 'fob']

function StepEquipment({ form, setField, setMultipleFields }) {
  const { data: equipment = [] } = useUserEquipmentFor(form.leaving_user_id)
  const { data: qrCodes = [] } = useQRCodesAssignedTo(form.leaving_user_id)
  const activeEquipment = useMemo(
    () => equipment.filter((e) => e.status !== 'returned'),
    [equipment]
  )
  const hasInventory = form.leaving_user_id && (activeEquipment.length > 0 || qrCodes.length > 0)

  // Auto-detect which collect_* toggles to flip on, based on what the user
  // actually has assigned. Only runs when we land on this step with a fresh
  // user pick, so it doesn't override manual edits later on.
  const autoDetectedKey = `${form.leaving_user_id || ''}::${activeEquipment.length}::${qrCodes.length}`
  const lastAutoDetectedRef = useRef(null)
  useEffect(() => {
    if (!form.leaving_user_id) return
    if (lastAutoDetectedRef.current === autoDetectedKey) return
    lastAutoDetectedRef.current = autoDetectedKey

    const allItems = [
      ...activeEquipment.map((e) => `${e.product_name} ${e.category_name} ${e.notes || ''}`),
      ...qrCodes.map((q) => `${q.product_name || ''} ${q.label || ''}`),
    ]
    if (allItems.length === 0) return

    const hasLaptop = allItems.some((s) => matches(s, LAPTOP_KEYWORDS))
    const hasPhone = allItems.some((s) => matches(s, PHONE_KEYWORDS))
    const hasBadge = allItems.some((s) => matches(s, BADGE_KEYWORDS))

    setMultipleFields({
      collect_laptop: hasLaptop || form.collect_laptop,
      collect_phone: hasPhone || form.collect_phone,
      collect_badge_keys: hasBadge || form.collect_badge_keys,
    })
  }, [autoDetectedKey, form.leaving_user_id, activeEquipment, qrCodes, setMultipleFields])

  return (
    <div className="space-y-5">
      {hasInventory && (
        <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5" /> Currently assigned to {form.name.split(' ')[0] || 'this person'}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {activeEquipment.map((e) => (
              <Badge key={`eq-${e.id}`} variant="outline" className="text-[11px] gap-1">
                <Package className="h-3 w-3" /> {e.product_name}
              </Badge>
            ))}
            {qrCodes.map((q) => (
              <Badge key={`qr-${q.id}`} variant="outline" className="text-[11px] gap-1 font-mono">
                <QrCode className="h-3 w-3" /> {q.code}
              </Badge>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Use this list to know what to collect. Toggle on the matching items below.
          </p>
        </div>
      )}

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
  { key: 'ooo_enabled', label: 'Out Of Office Reply', type: 'toggle' },
  { key: 'ooo_start', label: 'OOO From', showIf: (f) => f.ooo_enabled },
  { key: 'ooo_end', label: 'OOO Until', showIf: (f) => f.ooo_enabled },
  { key: 'ooo_message', label: 'OOO Message', showIf: (f) => f.ooo_enabled },
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
    leaving_user_id: null,
    leaving_user_email: '',
    company: '',
    departure_on: '',
    revoke_email_access: true,
    revoke_vpn_tools_access: true,
    transfer_mailbox_data: false,
    transfer_sharepoint_data: false,
    transfer_details: '',
    ooo_enabled: true,
    ooo_start: '',
    ooo_end: '',
    ooo_message: '',
    collect_laptop: true,
    collect_phone: false,
    collect_badge_keys: true,
    equipment_notes: '',
    requested_by: '',
    requested_on: new Date().toISOString().split('T')[0],
  })

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))
  const setMultipleFields = (updates) => setForm((prev) => ({ ...prev, ...updates }))

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
      case 'when': {
        const today = new Date().toISOString().split('T')[0]
        return !!form.departure_on && form.departure_on >= today
      }
      case 'revocation': {
        const needsTransfer = form.transfer_mailbox_data || form.transfer_sharepoint_data
        if (needsTransfer && !form.transfer_details.trim()) return false
        return true
      }
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
        body: await buildConfirmationEmail({ name: submitterName, type: 'offboarding', detail: form.name }),
        isHtml: true,
      })

      // Notify admin
      sendEmail({
        to: 'admin@vo-group.be',
        subject: `Offboarding Request: ${form.name || 'Unknown'}`,
        body: wrapEmailHtml(`<strong>${submitterName}</strong> submitted an offboarding request for <strong>${form.name}</strong> (${form.company}).<br><br>Departure date: ${form.departure_on}<br><br>Please review it in the admin panel.`, await getEmailBranding()),
        isHtml: true,
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
                <StepWho form={form} setField={setField} setMultipleFields={setMultipleFields} />
              )}
              {currentStepDef.id === 'when' && (
                <StepWhen form={form} setField={setField} />
              )}
              {currentStepDef.id === 'revocation' && (
                <StepRevocation form={form} setField={setField} />
              )}
              {currentStepDef.id === 'equipment' && (
                <StepEquipment form={form} setField={setField} setMultipleFields={setMultipleFields} />
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
