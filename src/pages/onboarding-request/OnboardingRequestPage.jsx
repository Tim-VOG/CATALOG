import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useCreateItRequest } from '@/hooks/use-it-requests'
import { createOnboardingRecipient } from '@/lib/api/onboarding'
import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/api/send-email'
import { useUIStore } from '@/stores/ui-store'
import { motion, AnimatePresence } from 'motion/react'
import {
  User, Calendar, Shield, Globe, CheckCircle,
  ArrowRight, ArrowLeft, Send, Loader2, UserPlus,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'

// ── Constants ──
const PROFILES = ['FREELANCE', 'EMPLOYEE', 'TRAINEE', 'STUDENT', 'INTRAMUROS', 'CDD']
const COMPANIES = [
  'AOP', 'MAX', 'MIT', 'SIGN BRUSSELS', 'VO EVENT',
  'VO GROUP', 'VO LAB', 'THE LITTLE VOICE', 'VO EUROPE',
]
const LANGUAGES = ['EN', 'FR', 'NL']
const ACCESS_OPTIONS = [
  'TLO - Timesheet Only', 'TLO - PM', 'TLO',
  'TEAMS VO CONNECT', 'TEAMS', 'SHAREPOINT', 'MAIL',
]
const SUBSCRIBE_OPTIONS = [
  'Distribution List', 'Internal Newsletter', 'ALL VO', 'VO EU ALL',
]

// ── Step definitions ──
const ALL_STEPS = [
  { id: 'identity', label: 'Identity', icon: User },
  { id: 'vo_europe', label: 'VO Europe', icon: Globe },
  { id: 'dates', label: 'Dates', icon: Calendar },
  { id: 'access', label: 'Access', icon: Shield },
  { id: 'requester', label: 'Requester', icon: UserPlus },
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

// ── Multi-select field ──
function MultiSelectField({ options, value, onChange }) {
  const selected = Array.isArray(value) ? value : []
  const toggle = (opt) => {
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
            <Checkbox checked={checked} onCheckedChange={() => toggle(opt)} />
            <span className="text-sm font-medium">{opt}</span>
          </label>
        )
      })}
    </div>
  )
}

// ── Step: Identity ──
function StepIdentity({ form, update }) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>
          Name <span className="text-destructive ml-1">*</span>
        </Label>
        <Input
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="Who is joining?"
        />
      </div>
      <div className="space-y-2">
        <Label>
          Profile <span className="text-destructive ml-1">*</span>
        </Label>
        <Select value={form.profile} onChange={(e) => update('profile', e.target.value)}>
          <option value="">Select...</option>
          {PROFILES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label>
          Company <span className="text-destructive ml-1">*</span>
        </Label>
        <Select value={form.company} onChange={(e) => update('company', e.target.value)}>
          <option value="">Select...</option>
          {COMPANIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Signing off as</Label>
        <Input
          value={form.signing_off_as}
          onChange={(e) => update('signing_off_as', e.target.value)}
        />
      </div>
    </div>
  )
}

// ── Step: VO Europe (conditional) ──
function StepVoEurope({ form, update }) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>
          Project Name / Mission <span className="text-destructive ml-1">*</span>
        </Label>
        <Input
          value={form.project_name}
          onChange={(e) => update('project_name', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>
          Mail to be created <span className="text-destructive ml-1">*</span>
        </Label>
        <Input
          value={form.mail_to_create}
          onChange={(e) => update('mail_to_create', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>
          Language <span className="text-destructive ml-1">*</span>
        </Label>
        <Select value={form.language} onChange={(e) => update('language', e.target.value)}>
          <option value="">Select...</option>
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label>
          Country Based <span className="text-destructive ml-1">*</span>
        </Label>
        <Input
          value={form.country_based}
          onChange={(e) => update('country_based', e.target.value)}
        />
      </div>
    </div>
  )
}

// ── Step: Dates ──
function StepDates({ form, update }) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>
          First Day <span className="text-destructive ml-1">*</span>
        </Label>
        <Input
          type="date"
          value={form.first_day}
          onChange={(e) => update('first_day', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Last Day</Label>
        <Input
          type="date"
          value={form.last_day}
          onChange={(e) => update('last_day', e.target.value)}
        />
      </div>
    </div>
  )
}

// ── Step: Access ──
function StepAccess({ form, update }) {
  const showFolders = Array.isArray(form.what_access) && form.what_access.includes('SHAREPOINT')

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>What Access</Label>
        <MultiSelectField
          options={ACCESS_OPTIONS}
          value={form.what_access}
          onChange={(val) => update('what_access', val)}
        />
      </div>
      {showFolders && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-2"
        >
          <Label>Which folders?</Label>
          <Input
            value={form.which_folders}
            onChange={(e) => update('which_folders', e.target.value)}
            placeholder="https:// SharePoint URL"
          />
        </motion.div>
      )}
      <div className="space-y-2">
        <Label>Subscribe to</Label>
        <MultiSelectField
          options={SUBSCRIBE_OPTIONS}
          value={form.subscribe_to}
          onChange={(val) => update('subscribe_to', val)}
        />
      </div>
    </div>
  )
}

// ── Step: Requester ──
function StepRequester({ form, update }) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Requested On</Label>
        <Input
          type="date"
          value={form.requested_on}
          onChange={(e) => update('requested_on', e.target.value)}
        />
        <p className="text-[11px] text-muted-foreground">Auto-filled with today's date</p>
      </div>
      <div className="space-y-2">
        <Label>Requested By</Label>
        <Input
          value={form.requested_by}
          onChange={(e) => update('requested_by', e.target.value)}
        />
        <p className="text-[11px] text-muted-foreground">Auto-filled from your profile</p>
      </div>
    </div>
  )
}

// ── Step: Review ──
function StepReview({ form, activeSteps }) {
  const isVoEurope = form.company === 'VO EUROPE'

  const fields = [
    { label: 'Name', value: form.name },
    { label: 'Profile', value: form.profile },
    { label: 'Company', value: form.company },
    { label: 'Signing off as', value: form.signing_off_as },
    ...(isVoEurope
      ? [
          { label: 'Project Name / Mission', value: form.project_name },
          { label: 'Mail to be created', value: form.mail_to_create },
          { label: 'Language', value: form.language },
          { label: 'Country Based', value: form.country_based },
        ]
      : []),
    { label: 'First Day', value: form.first_day },
    { label: 'Last Day', value: form.last_day },
    { label: 'What Access', value: Array.isArray(form.what_access) ? form.what_access.join(', ') : '' },
    ...(Array.isArray(form.what_access) && form.what_access.includes('SHAREPOINT')
      ? [{ label: 'Which folders?', value: form.which_folders }]
      : []),
    { label: 'Subscribe to', value: Array.isArray(form.subscribe_to) ? form.subscribe_to.join(', ') : '' },
    { label: 'Requested On', value: form.requested_on },
    { label: 'Requested By', value: form.requested_by },
  ]

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Please review the information below before submitting.
      </p>
      <div className="rounded-xl border bg-card overflow-hidden">
        {fields.map(({ label, value }, idx) => (
          <div
            key={label}
            className={`flex items-start gap-4 px-5 py-3 ${
              idx < fields.length - 1 ? 'border-b border-border/50' : ''
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
export function OnboardingRequestPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const showToast = useUIStore((s) => s.showToast)

  const [currentStep, setCurrentStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    // Identity
    name: '',
    profile: '',
    company: '',
    signing_off_as: '',
    // VO Europe
    project_name: '',
    mail_to_create: '',
    language: '',
    country_based: '',
    // Dates
    first_day: '',
    last_day: '',
    // Access
    what_access: [],
    which_folders: '',
    subscribe_to: [],
    // Requester
    requested_on: new Date().toISOString().split('T')[0],
    requested_by: '',
  })

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

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

  // Determine active steps — skip VO Europe when company is not VO EUROPE
  const activeSteps = useMemo(() => {
    return ALL_STEPS.filter((s) => {
      if (s.id === 'vo_europe') return form.company === 'VO EUROPE'
      return true
    })
  }, [form.company])

  // Clamp current step if steps change (e.g. VO Europe removed)
  useEffect(() => {
    if (currentStep >= activeSteps.length) {
      setCurrentStep(activeSteps.length - 1)
    }
  }, [activeSteps, currentStep])

  // Validation per step
  const canGoNext = () => {
    const step = activeSteps[currentStep]
    if (!step) return true

    switch (step.id) {
      case 'identity':
        return !!(form.name && form.profile && form.company)
      case 'vo_europe':
        return !!(form.project_name && form.mail_to_create && form.language && form.country_based)
      case 'dates':
        return !!form.first_day
      case 'access':
      case 'requester':
      case 'review':
        return true
      default:
        return true
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const submitterName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')

      // 1. Create it_request
      const { error: reqError } = await supabase.from('it_requests').insert({
        type: 'onboarding',
        requester_id: user.id,
        requester_email: user.email,
        requester_name: submitterName,
        data: { ...form, submitted_at: new Date().toISOString() },
        status: 'pending',
      })
      if (reqError) throw reqError

      // 2. Create onboarding recipient (non-blocking)
      try {
        const nameParts = form.name.trim().split(/\s+/)
        await createOnboardingRecipient({
          first_name: nameParts[0] || '',
          last_name: nameParts.slice(1).join(' ') || '',
          email: form.mail_to_create || '',
          team: form.company || '',
          department: '',
          start_date: form.first_day || null,
          language: form.language || 'en',
        })
      } catch {}

      // 3. Notify admin
      sendEmail({
        to: 'admin@vo-group.be',
        subject: `New Onboarding Request: ${form.name}`,
        body: `<p><strong>${submitterName}</strong> submitted an onboarding request:</p>
          <ul>
            <li><strong>Name:</strong> ${form.name}</li>
            <li><strong>Profile:</strong> ${form.profile}</li>
            <li><strong>Company:</strong> ${form.company}</li>
            <li><strong>First Day:</strong> ${form.first_day}</li>
            <li><strong>Last Day:</strong> ${form.last_day || '—'}</li>
            <li><strong>Access:</strong> ${Array.isArray(form.what_access) ? form.what_access.join(', ') : '—'}</li>
            <li><strong>Subscribe to:</strong> ${Array.isArray(form.subscribe_to) ? form.subscribe_to.join(', ') : '—'}</li>
          </ul>`,
      })

      navigate('/')
      setTimeout(() => showToast('Onboarding request submitted successfully!'), 100)
    } catch (err) {
      showToast(err.message || 'Failed to submit request', 'error')
    }
    setSubmitting(false)
  }

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
          Onboarding
        </Badge>
        <h1 className="text-3xl font-display font-bold tracking-tight text-gradient-primary">
          New Onboarding Request
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
              key={currentStepDef.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {currentStepDef.id === 'identity' && (
                <StepIdentity form={form} update={update} />
              )}
              {currentStepDef.id === 'vo_europe' && (
                <StepVoEurope form={form} update={update} />
              )}
              {currentStepDef.id === 'dates' && (
                <StepDates form={form} update={update} />
              )}
              {currentStepDef.id === 'access' && (
                <StepAccess form={form} update={update} />
              )}
              {currentStepDef.id === 'requester' && (
                <StepRequester form={form} update={update} />
              )}
              {isReview && (
                <StepReview form={form} activeSteps={activeSteps} />
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
