import { useState, useMemo } from 'react'
import { useItRequests, useUpdateItRequest, useDeleteItRequest } from '@/hooks/use-it-requests'
import { useCreateRecipient, useUpdateRecipient, useOnboardingRecipients, useOnboardingEmails } from '@/hooks/use-onboarding'
import { usePersonalInfoSubmissions } from '@/hooks/use-personal-info'
import { sendStatusChangeEmail } from '@/services/request-status-service'
import { useUIStore } from '@/stores/ui-store'
import {
  Search, UserPlus, Trash2, ArrowLeft, Package, Check, Send, Mail, Info, Clock, CheckCircle, Eye, Copy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/common/EmptyState'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { OnboardingTabNav } from './OnboardingTabNav'
import { OnboardingComposer } from './OnboardingComposer'

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

// Map an IT request (type=onboarding) into a recipient payload.
function requestToRecipient(req) {
  const data = req.data || {}
  const email = data.email_local && data.email_domain
    ? `${data.email_local}@${data.email_domain}`
    : data.email_to_create || data.email || ''
  return {
    first_name: data.first_name || '',
    last_name: data.last_name || '',
    email,
    personal_email: data.personal_email || '',
    team: data.business_unit || data.company || '',
    department: data.profile || data.job_title || '',
    start_date: data.first_day || null,
    language: (data.language || 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en',
    custom_links: [],
  }
}

const STATUS_COLORS = {
  pending: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  in_progress: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  ready: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
}

// ── Info card (mirrors AdminMailboxRequestsPage RequestInfoCard) ──
function OnboardingRequestInfoCard({ req, sentEmail, onUpdate }) {
  const data = req.data || {}
  const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ') || data.name || 'Unknown'
  const corporateEmail = data.email_local && data.email_domain
    ? `${data.email_local}@${data.email_domain}`
    : data.email_to_create || '—'

  const [editingPersonal, setEditingPersonal] = useState(false)
  const [personalEmail, setPersonalEmail] = useState(data.personal_email || '')
  const [savingPersonal, setSavingPersonal] = useState(false)

  const handleSavePersonal = async () => {
    const trimmed = personalEmail.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return
    setSavingPersonal(true)
    try {
      await onUpdate({ ...data, personal_email: trimmed })
      setEditingPersonal(false)
    } finally {
      setSavingPersonal(false)
    }
  }

  // All fields, always visible
  const fields = [
    ['First Name', data.first_name],
    ['Last Name', data.last_name],
    ['Corporate Email', corporateEmail],
    // personal_email handled inline below
    ['Profile', data.profile],
    ['Company', data.company],
    ['Job Title', data.job_title],
    ['First Day', formatDate(data.first_day)],
    ['Business Unit', data.business_unit],
    ['Signing Off As', data.signing_off_as],
    ['Phone', data.phone],
    ['Country Based', data.country_based],
    ['Language', data.language],
    ['Requested By', req.requester_name],
    ['Requester Email', req.requester_email],
    ['Submitted', new Date(req.created_at).toLocaleString('fr-FR')],
  ]

  return (
    <Card variant="elevated">
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-5 pb-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-cyan-500" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{fullName}</h3>
                <p className="text-xs text-muted-foreground">{corporateEmail}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn('text-xs', STATUS_COLORS[req.status])}>
                {req.status}
              </Badge>
              {sentEmail && (
                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1">
                  <Mail className="h-3 w-3" /> Sent
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Fields — all visible, no expand */}
        <div className="p-5 space-y-2.5">
          <div className="flex items-start gap-3 text-sm">
            <span className="font-medium text-muted-foreground w-36 shrink-0 text-xs uppercase tracking-wider pt-0.5">First Name</span>
            <span className="text-foreground break-all">{data.first_name || '—'}</span>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <span className="font-medium text-muted-foreground w-36 shrink-0 text-xs uppercase tracking-wider pt-0.5">Last Name</span>
            <span className="text-foreground break-all">{data.last_name || '—'}</span>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <span className="font-medium text-muted-foreground w-36 shrink-0 text-xs uppercase tracking-wider pt-0.5">Corporate Email</span>
            <span className="text-foreground break-all">{corporateEmail}</span>
          </div>
          {/* Personal Email — editable */}
          <div className="flex items-start gap-3 text-sm">
            <span className="font-medium text-muted-foreground w-36 shrink-0 text-xs uppercase tracking-wider pt-0.5">Personal Email</span>
            {editingPersonal ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  type="email"
                  value={personalEmail}
                  onChange={(e) => setPersonalEmail(e.target.value)}
                  placeholder="jdoe@gmail.com"
                  className="h-7 text-sm"
                  autoFocus
                />
                <Button size="sm" className="h-7 px-3 text-xs" onClick={handleSavePersonal} disabled={savingPersonal}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setEditingPersonal(false); setPersonalEmail(data.personal_email || '') }}>
                  Cancel
                </Button>
              </div>
            ) : data.personal_email ? (
              <div className="flex items-center gap-2 flex-1 group">
                <span className="text-foreground break-all">{data.personal_email}</span>
                <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] opacity-0 group-hover:opacity-100 transition" onClick={() => setEditingPersonal(true)}>
                  Edit
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setEditingPersonal(true)}
                className="text-xs text-amber-600 hover:text-amber-700 font-medium underline decoration-dotted underline-offset-4"
              >
                + Add (required for password block)
              </button>
            )}
          </div>
          {fields.slice(4).map(([label, value]) => (
            <div key={label} className="flex items-start gap-3 text-sm">
              <span className="font-medium text-muted-foreground w-36 shrink-0 text-xs uppercase tracking-wider pt-0.5">{label}</span>
              <span className="text-foreground break-all">{value || '—'}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Personal Information block ──
function PersonalInfoBlock({ req, submission, showToast }) {
  const token = req.personal_info_token
  const data = req.data || {}
  const firstName = data.first_name || 'the new hire'
  const link = token ? `${window.location.origin}/personal-info/${token}` : ''
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      showToast?.('Link copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback select
      const ta = document.createElement('textarea')
      ta.value = link
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (submission) {
    return (
      <Card variant="elevated" className="border-emerald-500/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">Personal email received</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                <strong className="text-foreground break-all">{submission.personal_email}</strong>
                <span className="ml-2">· submitted {formatDate(submission.submitted_at)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="elevated" className="border-amber-500/30">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">Waiting for personal email</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Share this link with {firstName} so they can drop their personal email — the welcome email will go there.
            </div>
          </div>
        </div>
        {link && (
          <div className="flex items-center gap-2">
            <Input
              value={link}
              readOnly
              className="text-xs h-9 font-mono bg-muted/30"
              onFocus={(e) => e.target.select()}
            />
            <Button
              size="sm"
              variant={copied ? 'success' : 'default'}
              className="gap-1.5 text-xs h-9 shrink-0"
              onClick={handleCopy}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy link'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Inline detail view (mirrors AdminMailboxRequestsPage detail) ──
function RequestDetail({ req, onBack, onDelete, onStatusChange, onComposeWelcome, onUpdateData, sentEmail, composing, recipientForCompose, onCloseComposer, personalInfo, showToast }) {
  const data = req.data || {}
  const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ') || data.name || 'Unknown'
  const showComposer = !!recipientForCompose && !sentEmail
  const canCompose = !!personalInfo

  return (
    <div className="space-y-5">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-xs">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
        <div className="flex-1">
          <h2 className="text-lg font-display font-bold">{fullName}</h2>
          <p className="text-xs text-muted-foreground">Onboarding Request Details</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onDelete(req)} className="text-destructive hover:text-destructive text-xs gap-1.5">
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
      </div>

      {/* Request info */}
      <OnboardingRequestInfoCard
        req={req}
        sentEmail={sentEmail}
        onUpdate={async (newData) => onUpdateData(req, newData)}
      />

      {/* Status actions banner */}
      {req.status === 'pending' && (
        <Card variant="elevated">
          <CardContent className="p-4 flex items-center gap-3">
            <Info className="h-4 w-4 text-amber-500 shrink-0" />
            <span className="text-sm text-muted-foreground flex-1">This request is pending review.</span>
            <Button variant="outline" size="sm" onClick={() => onStatusChange(req, 'in_progress')} className="gap-1.5 text-xs">
              <Clock className="h-3.5 w-3.5" /> Start Processing
            </Button>
            <Button size="sm" onClick={() => onStatusChange(req, 'ready')} className="gap-1.5 text-xs bg-emerald-500 hover:bg-emerald-600">
              <CheckCircle className="h-3.5 w-3.5" /> Mark Ready
            </Button>
          </CardContent>
        </Card>
      )}

      {req.status === 'in_progress' && !sentEmail && !showComposer && (
        <Card variant="elevated">
          <CardContent className="p-4 flex items-center gap-3">
            <Info className="h-4 w-4 text-blue-500 shrink-0" />
            <span className="text-sm text-muted-foreground flex-1">Send the welcome email to complete the onboarding.</span>
            <Button size="sm" onClick={() => onStatusChange(req, 'ready')} className="gap-1.5 text-xs bg-emerald-500 hover:bg-emerald-600">
              <CheckCircle className="h-3.5 w-3.5" /> Mark Ready
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Personal Information collection */}
      {!sentEmail && <PersonalInfoBlock req={req} submission={personalInfo} showToast={showToast} />}

      {/* Compose welcome email — inline */}
      {sentEmail ? (
        <Card variant="elevated" className="border-emerald-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="text-sm text-muted-foreground flex-1">
              Welcome email was sent on <strong className="text-foreground">{formatDate(sentEmail.sent_at)}</strong>
            </span>
          </CardContent>
        </Card>
      ) : showComposer ? (
        <OnboardingComposer
          recipient={recipientForCompose}
          requestId={req.id}
          onSent={onCloseComposer}
          onClose={onCloseComposer}
        />
      ) : (
        <Button
          onClick={() => onComposeWelcome(req)}
          variant="outline"
          disabled={composing || !canCompose}
          title={!canCompose ? 'Waiting for the personal email to be submitted' : ''}
          className="w-full gap-2 py-6 text-sm border-dashed hover:border-primary/40 hover:bg-primary/5 transition-all disabled:cursor-not-allowed"
        >
          <Send className="h-4 w-4 text-primary" />
          {canCompose ? 'Compose Welcome Email' : 'Compose Welcome Email — waiting for personal email'}
        </Button>
      )}
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────
export function OnboardingRequestsPage() {
  const { data: allRequests = [], isLoading } = useItRequests()
  const { data: recipients = [] } = useOnboardingRecipients()
  const { data: emails = [] } = useOnboardingEmails()
  const createRecipient = useCreateRecipient()
  const updateRecipient = useUpdateRecipient()
  const updateRequest = useUpdateItRequest()
  const deleteRequest = useDeleteItRequest()
  const showToast = useUIStore((s) => s.showToast)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedId, setSelectedId] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [composing, setComposing] = useState(false)
  const [recipientForCompose, setRecipientForCompose] = useState(null)

  const requests = useMemo(
    () => allRequests.filter((r) => r.type === 'onboarding'),
    [allRequests]
  )

  // Index of sent emails by linked request id
  const sentByRequestId = useMemo(() => {
    const map = {}
    for (const e of emails) {
      if (e.it_request_id && e.status === 'sent') map[e.it_request_id] = e
    }
    return map
  }, [emails])

  // Personal info submissions, indexed by it_request_id
  const requestIds = useMemo(() => requests.map((r) => r.id), [requests])
  const { data: personalInfos = [] } = usePersonalInfoSubmissions(requestIds)
  const personalInfoByRequestId = useMemo(() => {
    const map = {}
    for (const p of personalInfos) map[p.it_request_id] = p
    return map
  }, [personalInfos])

  const filtered = useMemo(() => {
    let result = requests
    if (statusFilter !== 'all') result = result.filter((r) => r.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((r) => {
        const data = r.data || {}
        return (data.name || '').toLowerCase().includes(q) ||
          (r.requester_name || '').toLowerCase().includes(q) ||
          (data.company || '').toLowerCase().includes(q)
      })
    }
    return result
  }, [requests, search, statusFilter])

  const pendingCount = requests.filter((r) => r.status === 'pending').length

  const selectedRequest = useMemo(
    () => requests.find((r) => r.id === selectedId),
    [requests, selectedId]
  )

  const handleStatusChange = async (req, newStatus) => {
    try {
      await updateRequest.mutateAsync({ id: req.id, updates: { status: newStatus } })
      showToast(`Request marked as ${newStatus.replace('_', ' ')}`)
      sendStatusChangeEmail(newStatus, { request: req, requestType: 'onboarding' })
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      await deleteRequest.mutateAsync(deleteConfirm.id)
      showToast('Request deleted')
      if (selectedId === deleteConfirm.id) setSelectedId(null)
    } catch (err) {
      showToast(err.message, 'error')
    }
    setDeleteConfirm(null)
  }

  // Find or create a recipient for this request, then open the composer.
  const handleComposeWelcome = async (req) => {
    if (!req) return
    setComposing(true)
    try {
      const payload = requestToRecipient(req)
      // Override personal_email with the public form submission if available
      // (canonical source — the new hire entered it themselves)
      const submission = personalInfoByRequestId[req.id]
      if (submission?.personal_email) payload.personal_email = submission.personal_email
      let recipient = recipients.find(
        (r) =>
          (payload.email && r.email?.toLowerCase() === payload.email.toLowerCase()) ||
          (payload.first_name && payload.last_name &&
            r.first_name?.toLowerCase() === payload.first_name.toLowerCase() &&
            r.last_name?.toLowerCase() === payload.last_name.toLowerCase())
      )
      if (!recipient) {
        recipient = await createRecipient.mutateAsync(payload)
      } else {
        // Resync the existing recipient with the latest request data
        // (covers old recipients created before personal_email was required,
        // or any edits made to the request afterwards)
        try {
          const updates = {}
          for (const key of ['first_name', 'last_name', 'email', 'personal_email', 'team', 'department', 'start_date', 'language']) {
            if (payload[key] && payload[key] !== recipient[key]) updates[key] = payload[key]
          }
          if (Object.keys(updates).length > 0) {
            const updated = await updateRecipient.mutateAsync({ id: recipient.id, ...updates })
            recipient = updated || { ...recipient, ...updates }
          }
        } catch {}
      }
      // Auto-advance status: pending → in_progress
      if (req.status === 'pending') {
        try {
          await updateRequest.mutateAsync({ id: req.id, updates: { status: 'in_progress' } })
        } catch {}
      }
      // Open the inline composer
      setSelectedId(req.id)
      setRecipientForCompose(recipient)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setComposing(false)
    }
  }

  const handleCloseComposer = () => {
    setRecipientForCompose(null)
  }

  const handleUpdateData = async (req, newData) => {
    try {
      await updateRequest.mutateAsync({ id: req.id, updates: { data: newData } })
      // Also sync the linked recipient so the inline composer sees the updated field
      const payload = requestToRecipient({ ...req, data: newData })
      const recipient = recipients.find(
        (r) => payload.email && r.email?.toLowerCase() === payload.email.toLowerCase()
      )
      if (recipient && payload.personal_email && payload.personal_email !== recipient.personal_email) {
        try {
          const updated = await updateRecipient.mutateAsync({ id: recipient.id, personal_email: payload.personal_email })
          // Refresh the composer's recipient prop so the preview re-renders
          if (recipientForCompose?.id === recipient.id) {
            setRecipientForCompose(updated || { ...recipient, personal_email: payload.personal_email })
          }
        } catch {}
      }
      showToast('Updated')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  if (isLoading) return <PageLoading />

  // Detail view
  if (selectedRequest) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Onboarding" description="Onboarding request details" />
        <OnboardingTabNav />
        <RequestDetail
          req={selectedRequest}
          sentEmail={sentByRequestId[selectedRequest.id]}
          personalInfo={personalInfoByRequestId[selectedRequest.id]}
          showToast={showToast}
          composing={composing}
          recipientForCompose={recipientForCompose}
          onBack={() => { setSelectedId(null); setRecipientForCompose(null) }}
          onDelete={(r) => setDeleteConfirm(r)}
          onStatusChange={handleStatusChange}
          onComposeWelcome={handleComposeWelcome}
          onCloseComposer={handleCloseComposer}
          onUpdateData={handleUpdateData}
        />

        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent className="p-6">
            <DialogHeader><DialogTitle>Delete Request?</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">This will permanently delete this onboarding request.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // List view
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Onboarding"
        description={`${requests.length} request${requests.length !== 1 ? 's' : ''}`}
      />

      <OnboardingTabNav />

      <div className="flex flex-wrap items-center gap-2">
        {[
          { value: 'all', label: 'All' },
          { value: 'pending', label: 'Pending' },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'ready', label: 'Ready' },
        ].map((s) => (
          <Button
            key={s.value}
            variant={statusFilter === s.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(s.value)}
          >
            {s.label}
            {s.value === 'pending' && pendingCount > 0 && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground text-primary text-[10px] font-bold">
                {pendingCount}
              </span>
            )}
          </Button>
        ))}

        <div className="flex-1" />

        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={UserPlus} title="No onboarding requests" description="No requests match the current filter" />
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => {
            const data = req.data || {}
            const name = data.name || [data.first_name, data.last_name].filter(Boolean).join(' ') || req.requester_name || 'Unknown'
            const company = data.company || data.business_unit || ''
            const firstDay = data.first_day || ''
            const submitter = req.requester_name || ''
            const sentEmail = sentByRequestId[req.id]
            const personalInfo = personalInfoByRequestId[req.id]

            return (
              <Card
                key={req.id}
                variant="elevated"
                className="hover:shadow-card-hover transition-shadow cursor-pointer"
                onClick={() => setSelectedId(req.id)}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0">
                      <UserPlus className="h-5 w-5 text-cyan-500" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{name}</span>
                        <StatusBadge status={req.status} />
                        {company && <Badge variant="secondary" className="text-[10px]">{company}</Badge>}
                        {sentEmail && (
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1">
                            <Check className="h-2.5 w-2.5" /> Email sent
                          </Badge>
                        )}
                        {!sentEmail && (
                          personalInfo ? (
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1">
                              <CheckCircle className="h-2.5 w-2.5" /> Personal info ready
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1">
                              <Clock className="h-2.5 w-2.5" /> Awaiting personal email
                            </Badge>
                          )
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {submitter && <span>By {submitter}</span>}
                        {firstDay && <span>Starts {formatDate(firstDay)}</span>}
                        <span>{formatDate(req.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {req.status === 'pending' && (
                        <Button size="sm" className="gap-1.5 text-xs h-8" onClick={() => handleStatusChange(req, 'in_progress')}>
                          <Package className="h-3 w-3" /> Start
                        </Button>
                      )}
                      {req.status === 'in_progress' && !sentEmail && personalInfo && (
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => handleComposeWelcome(req)} disabled={composing}>
                          <Mail className="h-3 w-3" /> Welcome email
                        </Button>
                      )}
                      {req.status === 'in_progress' && (
                        <Button size="sm" variant="success" className="gap-1.5 text-xs h-8" onClick={() => handleStatusChange(req, 'ready')}>
                          <Check className="h-3 w-3" /> Ready
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => setSelectedId(req.id)} className="gap-1 text-xs">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(req)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="p-6">
          <DialogHeader><DialogTitle>Delete Request?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently delete this onboarding request.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
