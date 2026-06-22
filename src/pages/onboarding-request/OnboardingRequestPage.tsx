import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useCreateItRequest } from '@/hooks/use-it-requests'
import { createOnboardingRecipient } from '@/lib/api/onboarding'
import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/api/send-email'
import { notifyRecipients } from '@/lib/api/notify-recipients'
import { buildConfirmationEmail, buildConfirmationSubject } from '@/services/request-status-service'
import { wrapEmailHtml, getEmailBranding } from '@/lib/email-html'
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
const PROFILES = ['FREELANCE', 'EMPLOYEE (Permanent)', 'EMPLOYEE (Fixed-term)', 'TRAINEE', 'STUDENT']

// Companies are sorted alphabetically and each has a default email domain.
// Unmapped companies fall back to vo-group.be — update COMPANY_DOMAINS when
// new mappings are confirmed.
const COMPANIES = [
  'AOP',
  'KRAFTHAUS',
  'MAX',
  'MIT',
  'SIGN BRUSSELS',
  'THE LITTLE VOICE',
  'VO CONSULTING',
  'VO EUROPE',
  'VO EVENT',
  'VO GROUP',
  'VO LAB',
  'VO PRODUCTION',
  'VO STUDIOS',
]

// Full names shown as a tooltip next to acronyms so non-IT requesters
// recognise the entity behind the abbreviation.
const COMPANY_FULL_NAMES = {
  'AOP': 'Art on Paper',
  'MIT': 'My Impact Tool',
}

const COMPANY_DOMAINS = {
  'AOP': 'artonpaper.be',
  'MAX': 'max-be.eu',
  'SIGN BRUSSELS': 'sign.brussels',
  'THE LITTLE VOICE': 'thelittlevoice.be',
  'VO EUROPE': 'vo-europe.eu',
  'VO EVENT': 'vo-event.be',
  'VO GROUP': 'vo-group.be',
  'VO LAB': 'vo-lab.be',
}
const DEFAULT_DOMAIN = 'vo-group.be'
const domainForCompany = (company) => COMPANY_DOMAINS[company] || DEFAULT_DOMAIN

const LANGUAGES = ['EN', 'FR', 'NL']

// TLO removed per feedback — was confusing and rarely used.
const ACCESS_OPTIONS = ['TEAMS VO CONNECT', 'TEAMS', 'SHAREPOINT', 'MAIL', 'Teamleader (CRM licence)']

// Distribution lists drawn from the Active Directory list (VO.local).
// The mapping below was reconciled against the real AD names so onboarders
// don't end up subscribing a new hire to a list that doesn't apply to them.
// Names are kept in their canonical AD casing (matching Outlook exactly)
// so the IT admin can copy/paste straight into the AD console.
const DISTRIBUTION_LISTS_GLOBAL = ['VO', 'Reception', 'Referents']
const DISTRIBUTION_LISTS_BY_COMPANY = {
  'VO GROUP': ['VO GROUP'],
  'VO EUROPE': [
    'VO EU ALL',
    'VO EU EMPLOYEES',
    'VO EU In-Person Monthly Meeting',
    'VO EU MERCATO',
    'CMO-CINEA-Life',
    'CMO EISMEA',
    'CMO-europaid',
    'CMO-JUST',
    'CMO-PRD',
    'CMORTD',
    'CMOSCIC',
    'cmo-comm200',
    'COFE',
    'COP28-prog',
    'DG-FS',
    'EACEA',
    'NEB Event Core Team',
    'NEB-FAIR',
    'NEB-FEST',
    'NEB-FORUM',
    'Internal.roadmap.eugreendeal',
    'SUFW-OP',
    'SUFW-RH',
    'NATO',
  ],
  'VO EVENT': ['VO EVENT', 'VO EVENT MAX', 'MAX-TEAM'],
  'THE LITTLE VOICE': ['TheLittleVoice', 'Operations @ TLV'],
  'MAX': ['MAX-TEAM', 'Hello - Max', 'VO EVENT MAX'],
  'SIGN BRUSSELS': [],
  'AOP': [],
  'VO LAB': [],
  'MIT': [],
  'KRAFTHAUS': [],
  'VO CONSULTING': [],
  'VO PRODUCTION': [],
  'VO STUDIOS': [],
}

// Short, friendly description of each distribution list. Surfaced as a
// secondary line below each checkbox so a requester knows what subscribing
// the new hire to a given list actually means.
const DISTRIBUTION_LIST_INFO = {
  'VO': 'Everyone at VO — group-wide announcements',
  'Reception': 'Brussels office reception team',
  'Referents': 'Internal referents / point persons',
  'NATO': 'NATO project team',
  'VO GROUP': 'VO Group entity — all members',
  'VO EU ALL': 'VO Europe — entire entity (employees + freelancers)',
  'VO EU EMPLOYEES': 'VO Europe — employees only',
  'VO EU In-Person Monthly Meeting': 'In-person monthly meeting invites (VO Europe)',
  'VO EU MERCATO': 'VO Europe Mercato updates',
  'VO EVENT': 'VO Event entity — all members',
  'VO EVENT MAX': 'VO Event x MAX — cross-team',
  'MAX-TEAM': 'MAX team announcements',
  'Hello - Max': 'MAX welcome / external comms',
  'TheLittleVoice': 'The Little Voice — all members',
  'Operations @ TLV': 'The Little Voice Operations team',
  'CMO-CINEA-Life': 'Communication for CINEA LIFE programme',
  'CMO EISMEA': 'Communication for EISMEA',
  'CMO-europaid': 'Communication for EuropAid',
  'CMO-JUST': 'Communication for DG JUST',
  'CMO-PRD': 'Communication production team',
  'CMORTD': 'Communication for RTD',
  'CMOSCIC': 'Communication for SCIC',
  'cmo-comm200': 'COMM200 communication team',
  'COFE': 'Conference on the Future of Europe',
  'COP28-prog': 'COP28 programme team',
  'DG-FS': 'DG Financial Services communication',
  'EACEA': 'EACEA-related communication',
  'NEB Event Core Team': 'New European Bauhaus event core team',
  'NEB-FAIR': 'NEB Fair team',
  'NEB-FEST': 'NEB Festival team',
  'NEB-FORUM': 'NEB Forum team',
  'Internal.roadmap.eugreendeal': 'EU Green Deal internal roadmap',
  'SUFW-OP': 'SUFW Operations team',
  'SUFW-RH': 'SUFW HR team',
}

const distributionListsFor = (company) => {
  const extra = DISTRIBUTION_LISTS_BY_COMPANY[company] || []
  return [...new Set([...DISTRIBUTION_LISTS_GLOBAL, ...extra])]
}

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
function StepProgress({ currentStep, steps  }: any) {
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
function MultiSelectField({ options, value, onChange, descriptions  }: any) {
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
        const desc = descriptions?.[opt]
        return (
          <label
            key={opt}
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
              checked
                ? 'border-primary/40 bg-primary/5'
                : 'border-border hover:border-muted-foreground/30'
            }`}
          >
            <Checkbox checked={checked} onCheckedChange={() => toggle(opt)} className="mt-0.5" />
            <div className="min-w-0">
              <span className="text-sm font-medium block">{opt}</span>
              {desc && (
                <span className="text-[11px] text-muted-foreground block mt-0.5">{desc}</span>
              )}
            </div>
          </label>
        )
      })}
    </div>
  )
}

// ── Yes/No toggle ──
function YesNoField({ value, onChange  }: any) {
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
function StepIdentity({ form, update, setEmailLocalEdited  }: any) {
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
          <span className="inline-flex items-center px-3 bg-muted border border-input border-l-0 text-sm text-muted-foreground select-none rounded-r-md min-w-[180px]">
            @{form.email_domain || DEFAULT_DOMAIN}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Local part auto-suggested from first/last name. Domain follows the selected Company.
        </p>
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
              <option key={c} value={c}>
                {COMPANY_FULL_NAMES[c] ? `${c} — ${COMPANY_FULL_NAMES[c]}` : c}
              </option>
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
function StepProject({ form, update  }: any) {
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
function StepDates({ form, update  }: any) {
  const todayIso = new Date().toISOString().split('T')[0]
  const exitMin = form.first_day || todayIso
  const exitInvalid = form.last_day && form.first_day && form.last_day < form.first_day
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>
          Entry Date <span className="text-destructive ml-1">*</span>
        </Label>
        <Input
          type="date"
          value={form.first_day}
          min={todayIso}
          onChange={(e) => update('first_day', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Exit Date</Label>
        <Input
          type="date"
          value={form.last_day}
          min={exitMin}
          onChange={(e) => update('last_day', e.target.value)}
        />
        {exitInvalid && (
          <p className="text-[11px] text-destructive">Exit date must be on or after the entry date.</p>
        )}
      </div>
    </div>
  )
}

// ── Step: Access ──
function StepAccess({ form, update  }: any) {
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
        <Label>Distribution list</Label>
        <p className="text-[11px] text-muted-foreground">
          Mailing lists to subscribe the new hire to. Options depend on the selected Company.
        </p>
        <MultiSelectField
          options={distributionListsFor(form.company)}
          value={form.subscribe_to}
          onChange={(val) => update('subscribe_to', val)}
          descriptions={DISTRIBUTION_LIST_INFO}
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
function StepRequester({ form, update  }: any) {
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
function StepReview({ form, update  }: any) {
  const fmtBool = (v) => (v === true ? 'Yes' : v === false ? 'No' : '—')
  const isVoEurope = form.company === 'VO EUROPE'
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
    // VO EUROPE-only Project block
    ...(isVoEurope ? [
      { label: 'Project Name / Mission', value: form.project_name },
      { label: 'Language', value: form.language },
      { label: 'Country Based', value: form.country_based },
      { label: 'Manager', value: form.manager },
    ] : []),
    { label: 'Entry Date', value: form.first_day },
    { label: 'Exit Date', value: form.last_day },
    { label: 'What Access', value: Array.isArray(form.what_access) ? form.what_access.join(', ') : '' },
    ...(Array.isArray(form.what_access) && form.what_access.includes('SHAREPOINT')
      ? [{ label: 'Folder Access', value: form.which_folders }]
      : []),
    { label: 'Distribution list', value: Array.isArray(form.subscribe_to) ? form.subscribe_to.join(', ') : '' },
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

  // Pre-fill from a "vo-edit-request" stash (set by My Requests > Edit)
  const editStash = (() => {
    try {
      const raw = sessionStorage.getItem('vo-edit-request')
      if (!raw) return null
      sessionStorage.removeItem('vo-edit-request')
      return JSON.parse(raw)
    } catch { return null }
  })()

  const [form, setForm] = useState<any>({
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
    // Edit stash overrides any default
    ...(editStash || {}),
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

  // Domain follows the selected company — and a company change might also
  // invalidate previously-picked distribution lists that aren't allowed for
  // the new company, so we prune them too.
  useEffect(() => {
    const expectedDomain = domainForCompany(form.company)
    setForm((prev) => {
      const newDomain = prev.email_domain === expectedDomain ? prev.email_domain : expectedDomain
      const allowed = distributionListsFor(prev.company)
      const filteredSubscribe = (prev.subscribe_to || []).filter((s) => allowed.includes(s))
      if (newDomain === prev.email_domain && filteredSubscribe.length === (prev.subscribe_to || []).length) {
        return prev
      }
      return { ...prev, email_domain: newDomain, subscribe_to: filteredSubscribe }
    })
  }, [form.company])

  const fullEmail = form.email_local && form.email_domain ? `${form.email_local}@${form.email_domain}` : ''

  // The Project step (mission name, language, country, manager) is only
  // relevant for VO EUROPE onboardings. Skip it entirely for every other
  // company so the wizard doesn't ask irrelevant questions.
  const activeSteps = useMemo(
    () => form.company === 'VO EUROPE' ? ALL_STEPS : ALL_STEPS.filter((s) => s.id !== 'project'),
    [form.company]
  )

  // If the user moves Company away from VO EUROPE while sitting on the
  // Project step, clamp the cursor to the last valid step so we don't
  // render an undefined step.
  useEffect(() => {
    if (currentStep >= activeSteps.length) setCurrentStep(activeSteps.length - 1)
  }, [activeSteps, currentStep])

  // Validation per step
  const canGoNext = () => {
    const step = activeSteps[currentStep]
    if (!step) return true

    switch (step.id) {
      case 'identity':
        return !!(form.first_name && form.last_name && form.personal_email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.personal_email) && form.email_local && form.email_domain && form.profile && form.company && form.job_title)
      case 'project':
        return !!(form.language && form.country_based)
      case 'dates': {
        const today = new Date().toISOString().split('T')[0]
        if (!form.first_day || form.first_day < today) return false
        if (form.last_day && form.last_day < form.first_day) return false
        return true
      }
      case 'access':
        // Access selection is optional — admin can grant later
        return true
      case 'requester':
        return !!(form.requested_by && form.requested_on)
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
        onboarded_by_manager_id: profile?.role === 'manager' ? user.id : null,
        data: { ...form, name: fullName, email_to_create: fullEmail, submitted_at: new Date().toISOString() },
        status: 'pending',
      })
      if (reqError) throw reqError

      // 2. Create onboarding recipient (non-blocking).
      // We intentionally don't create a user_invitations row here: the
      // welcome email composed afterwards is the real invitation, and the
      // profile is created automatically the first time the new hire
      // signs in via Microsoft SSO. Pre-registering them would clutter
      // Admin → Users with a 'Pending' entry that duplicates that flow.
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
        body: wrapEmailHtml(`<strong>${submitterName}</strong> submitted an onboarding request:
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
          </ul>`, { ...(await getEmailBranding()), raw: true }),
        isHtml: true,
      })

      notifyRecipients({
        kind: 'onboarding',
        event: 'new_request',
        submitter: submitterName,
        subject: fullName,
        detail: [form.company, form.job_title, form.first_day && `starts ${form.first_day}`]
          .filter(Boolean)
          .join(' · ') || null,
      })

      navigate('/')
      setTimeout(() => showToast('Onboarding request submitted successfully!'), 100)
    } catch (err: any) {
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
                <StepIdentity form={form} update={update} setEmailLocalEdited={setEmailLocalEdited} />
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
