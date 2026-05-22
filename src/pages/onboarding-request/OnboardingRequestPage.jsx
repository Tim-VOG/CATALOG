import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useCreateItRequest } from '@/hooks/use-it-requests'
import { createOnboardingRecipient } from '@/lib/api/onboarding'
import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/api/send-email'
import { buildConfirmationEmail, buildConfirmationSubject } from '@/services/request-status-service'
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
const EMAILING_OPTIONS = [
  'Distribution List', 'ALL VO', 'VO EU ALL',
]
const EMAIL_DOMAINS = [
  'vo-group.be', 'voice.be', 'vo-europe.eu', 'vo-citizen.be',
  'designbysign.com', 'vo-event.be', 'studiogondo.be', 'artonpaper.be',
  'vo-lab.be', 'vocommunication.com', 'vo-communication.com', 'sign.brussels',
  'myimpacttool.com', 'thelittlevoice.be', 'vo-event-max.be', 'max.be',
  '100ans-sncb.be', '100jaar-nmbs.be', 'eventfresco.be', 'VO.local',
]
const DEFAULT_DOMAIN = 'vo-group.be'

// ── Step definitions ──
const ALL_STEPS = [
  { id: 'identity', label: 'Identity', icon: User },
  { id: 'project', label: 'Project', icon: Globe },
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

// ── Yes/No toggle ──
function YesNoField({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {[
        { v: true, label: 'Yes' },
        { v: false, label: 'No' },
      ].map((opt) => {
        const selected = value === opt.v
        return (
          <button
            key={opt.label}
            type="button"
            onClick={() => onChange(opt.v)}
            className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
              selected
                ? 'border-primary/40 bg-primary/5 text-primary'
                : 'border-border hover:border-muted-foreground/30 text-muted-foreground'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Step: Identity ──
function StepIdentity({ form, update }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>
            First Name <span className="text-destructive ml-1">*</span>
          </Label>
          <Input
            value={form.first_name}
            onChange={(e) => update('first_name', e.target.value)}
            placeholder="John"
          />
        </div>
        <div className="space-y-2">
          <Label>
            Last Name <span className="text-destructive ml-1">*</span>
          </Label>
          <Input
            value={form.last_name}
            onChange={(e) => update('last_name', e.target.value)}
            placeholder="Doe"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>
          Mail to be created <span className="text-destructive ml-1">*</span>
        </Label>
        <div className="flex">
          <Input
            value={form.email_local}
            onChange={(e) => { setEmailLocalEdited(true); update('email_local', e.target.value) }}
            placeholder="jdoe"
            className="rounded-r-none border-r-0 flex-1 min-w-0"
          />
          <span className="inline-flex items-center px-2 bg-muted border border-input border-l-0 border-r-0 text-sm text-muted-foreground select-none">@</span>
          <Select
            value={form.email_domain}
            onChange={(e) => update('email_domain', e.target.value)}
            className="rounded-l-none w-auto min-w-[180px]"
          >
            {EMAIL_DOMAINS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </Select>
        </div>
        <p className="text-[11px] text-muted-foreground">Local part auto-suggested from first/last name</p>
      </div>
      <div className="space-y-2">
        <Label>
          Personal e-mail <span className="text-destructive ml-1">*</span>
        </Label>
        <Input
          type="email"
          value={form.personal_email}
          onChange={(e) => update('personal_email', e.target.value)}
          placeholder="jdoe@gmail.com"
        />
        <p className="text-[11px] text-muted-foreground">Used to deliver the 1Password link before the corporate account is active</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      </div>
      <div className="space-y-2">
        <Label>
          Job Title <span className="text-destructive ml-1">*</span>
        </Label>
        <Input
          value={form.job_title}
          onChange={(e) => update('job_title', e.target.value)}
          placeholder="e.g. Consultant, Project Manager"
        />
        <p className="text-[11px] text-muted-foreground">Used as signature title in emails</p>
      </div>
      <div className="space-y-2">
        <Label>Signing off as</Label>
        <Input
          value={form.signing_off_as}
          onChange={(e) => update('signing_off_as', e.target.value)}
          placeholder="Optional — name to display in signature"
        />
      </div>
      <div className="space-y-2">
        <Label>Phone number</Label>
        <Input
          value={form.phone}
          onChange={(e) => update('phone', e.target.value)}
          placeholder="Optional — +32 ..."
        />
      </div>
    </div>
  )
}

// ── Step: Project & Location ──
function StepProject({ form, update }) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Project Name / Mission</Label>
        <Input
          value={form.project_name}
          onChange={(e) => update('project_name', e.target.value)}
          placeholder="Project or mission name"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            placeholder="e.g. Belgium, France"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Manager / Reports to</Label>
        <Input
          value={form.manager}
          onChange={(e) => update('manager', e.target.value)}
          placeholder="Optional — N+1 name"
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
          Entry Date <span className="text-destructive ml-1">*</span>
        </Label>
        <Input
          type="date"
          value={form.first_day}
          onChange={(e) => update('first_day', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Exit Date</Label>
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
          <Label>Folder Access</Label>
          <Input
            value={form.which_folders}
            onChange={(e) => update('which_folders', e.target.value)}
            placeholder="https:// SharePoint URL"
          />
        </motion.div>
      )}
      <div className="space-y-2">
        <Label>Emailing list</Label>
        <MultiSelectField
          options={EMAILING_OPTIONS}
          value={form.subscribe_to}
          onChange={(val) => update('subscribe_to', val)}
        />
      </div>
      <div className="space-y-2">
        <Label>Internal Newsletter</Label>
        <YesNoField
          value={form.internal_newsletter}
          onChange={(v) => update('internal_newsletter', v)}
        />
      </div>
      <div className="space-y-2">
        <Label>Welcome Interview Reception</Label>
        <YesNoField
          value={form.welcome_interview}
          onChange={(v) => update('welcome_interview', v)}
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
function StepReview({ form, update }) {
  const fmtBool = (v) => (v === true ? 'Yes' : v === false ? 'No' : '—')
  const fields = [
    { label: 'First Name', value: form.first_name },
    { label: 'Last Name', value: form.last_name },
    { label: 'Mail to be created', value: form.email_local && form.email_domain ? `${form.email_local}@${form.email_domain}` : '' },
    { label: 'Personal e-mail', value: form.personal_email },
    { label: 'Profile', value: form.profile },
    { label: 'Company', value: form.company },
    { label: 'Job Title', value: form.job_title },
    { label: 'Signing off as', value: form.signing_off_as },
    { label: 'Phone', value: form.phone },
    { label: 'Project Name / Mission', value: form.project_name },
    { label: 'Language', value: form.language },
    { label: 'Country Based', value: form.country_based },
    { label: 'Manager', value: form.manager },
    { label: 'Entry Date', value: form.first_day },
    { label: 'Exit Date', value: form.last_day },
    { label: 'What Access', value: Array.isArray(form.what_access) ? form.what_access.join(', ') : '' },
    ...(Array.isArray(form.what_access) && form.what_access.includes('SHAREPOINT')
      ? [{ label: 'Folder Access', value: form.which_folders }]
      : []),
    { label: 'Emailing list', value: Array.isArray(form.subscribe_to) ? form.subscribe_to.join(', ') : '' },
    { label: 'Internal Newsletter', value: fmtBool(form.internal_newsletter) },
    { label: 'Welcome Interview', value: fmtBool(form.welcome_interview) },
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
  const [emailLocalEdited, setEmailLocalEdited] = useState(false)

  const [form, setForm] = useState({
    // Identity
    first_name: '',
    last_name: '',
    personal_email: '',
    email_local: '',
    email_domain: DEFAULT_DOMAIN,
    profile: '',
    company: '',
    job_title: '',
    signing_off_as: '',
    phone: '',
    // Project & Location
    project_name: '',
    language: '',
    country_based: '',
    manager: '',
    // Dates
    first_day: '',
    last_day: '',
    // Access
    what_access: [],
    which_folders: '',
    subscribe_to: [],
    internal_newsletter: null,
    welcome_interview: null,
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

  // Auto-suggest email local part: first letter of first name + full last name (until user edits it manually)
  useEffect(() => {
    if (emailLocalEdited) return
    const slug = (s) => (s || '').trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '')
    const first = slug(form.first_name)
    const last = slug(form.last_name)
    const suggestion = first && last ? `${first[0]}${last}` : ''
    setForm((prev) => prev.email_local === suggestion ? prev : { ...prev, email_local: suggestion })
  }, [form.first_name, form.last_name, emailLocalEdited])

  const fullEmail = form.email_local && form.email_domain ? `${form.email_local}@${form.email_domain}` : ''

  const activeSteps = ALL_STEPS

  // Validation per step
  const canGoNext = () => {
    const step = activeSteps[currentStep]
    if (!step) return true

    switch (step.id) {
      case 'identity':
        return !!(form.first_name && form.last_name && form.personal_email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.personal_email) && form.email_local && form.email_domain && form.profile && form.company && form.job_title)
      case 'project':
        return !!(form.language && form.country_based)
      case 'dates':
        return !!form.first_day
      case 'access':
      case 'requester':
        return true
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

      const fullName = [form.first_name, form.last_name].filter(Boolean).join(' ').trim()

      // 1. Create it_request
      const { error: reqError } = await supabase.from('it_requests').insert({
        type: 'onboarding',
        requester_id: user.id,
        requester_email: user.email,
        requester_name: submitterName,
        data: { ...form, name: fullName, email_to_create: fullEmail, submitted_at: new Date().toISOString() },
        status: 'pending',
      })
      if (reqError) throw reqError

      // 2. Create onboarding recipient (non-blocking)
      try {
        await createOnboardingRecipient({
          first_name: form.first_name || '',
          last_name: form.last_name || '',
          email: fullEmail || '',
          personal_email: form.personal_email || '',
          team: form.company || '',
          department: form.profile || form.job_title || '',
          start_date: form.first_day || null,
          language: (form.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en',
        })
      } catch {}

      // 3. Confirmation email to the requester (with HR personal-info reminder)
      sendEmail({
        to: user.email,
        subject: await buildConfirmationSubject({ type: 'onboarding', newHireName: fullName }),
        body: await buildConfirmationEmail({ name: submitterName, type: 'onboarding', newHireName: fullName, detail: fullName }),
        isHtml: true,
      })

      // 4. Notify admin
      sendEmail({
        to: 'admin@vo-group.be',
        subject: `New Onboarding Request: ${fullName}`,
        body: `<p><strong>${submitterName}</strong> submitted an onboarding request:</p>
          <ul>
            <li><strong>Name:</strong> ${fullName}</li>
            <li><strong>Mail to be created:</strong> ${fullEmail || '—'}</li>
            <li><strong>Profile:</strong> ${form.profile}</li>
            <li><strong>Company:</strong> ${form.company}</li>
            <li><strong>Job Title:</strong> ${form.job_title || '—'}</li>
            <li><strong>Project / Mission:</strong> ${form.project_name || '—'}</li>
            <li><strong>Language:</strong> ${form.language || '—'}</li>
            <li><strong>Country:</strong> ${form.country_based || '—'}</li>
            <li><strong>Entry Date:</strong> ${form.first_day}</li>
            <li><strong>Exit Date:</strong> ${form.last_day || '—'}</li>
            <li><strong>Access:</strong> ${Array.isArray(form.what_access) ? form.what_access.join(', ') : '—'}</li>
            <li><strong>Folder Access:</strong> ${form.which_folders || '—'}</li>
            <li><strong>Emailing list:</strong> ${Array.isArray(form.subscribe_to) ? form.subscribe_to.join(', ') : '—'}</li>
            <li><strong>Internal Newsletter:</strong> ${form.internal_newsletter === true ? 'Yes' : form.internal_newsletter === false ? 'No' : '—'}</li>
            <li><strong>Welcome Interview:</strong> ${form.welcome_interview === true ? 'Yes' : form.welcome_interview === false ? 'No' : '—'}</li>
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
              {currentStepDef.id === 'project' && (
                <StepProject form={form} update={update} />
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
                <StepReview form={form} update={update} />
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
