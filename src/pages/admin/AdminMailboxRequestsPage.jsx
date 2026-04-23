import { useState, useMemo, useEffect, useCallback } from 'react'
import { useMailboxRequests, useUpdateMailboxRequest, useDeleteMailboxRequest } from '@/hooks/use-mailbox-requests'
import { useAppSettings, useUpdateAppSettings } from '@/hooks/use-settings'
import { useUIStore } from '@/stores/ui-store'
import { sendEmail } from '@/lib/api/send-email'
import { wrapEmailHtml } from '@/lib/email-html'
import { motion, AnimatePresence } from 'motion/react'
import {
  Search, Mail, Trash2, Eye, Calendar, Building2, ArrowLeft,
  CheckCircle, XCircle, Send, Loader2, KeyRound, Clock,
  Save, FileText, ChevronDown, ChevronUp, Info, Sparkles,
  User, Globe, Archive, AlertTriangle, Download, Pencil, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { cn } from '@/lib/utils'

const STATUS_COLORS = {
  pending: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  in_progress: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  ready: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
}

const STATUS_ICONS = {
  pending: Clock,
  in_progress: Clock,
  ready: CheckCircle,
}

// ── Default email template with placeholders ──
const DEFAULT_TEMPLATE = `Dear {{requester_name}},

Your functional mailbox has been created successfully.

Mailbox: {{mailbox_email}}
Project: {{project_name}}
Display Name: {{display_name}}

{{onepassword_section}}

If you have any questions, feel free to reach out.

Best regards,
The {{app_name}} Team`

// ── Available template variables ──
const TEMPLATE_VARS = [
  { key: '{{requester_name}}', label: 'Requester Name', desc: 'Name of the person who requested the mailbox' },
  { key: '{{mailbox_email}}', label: 'Mailbox Email', desc: 'The email address that was created' },
  { key: '{{project_name}}', label: 'Project Name', desc: 'Name of the project' },
  { key: '{{display_name}}', label: 'Display Name', desc: 'Display name for the mailbox' },
  { key: '{{agency}}', label: 'Agency', desc: 'Agency / Business Unit' },
  { key: '{{onepassword_section}}', label: '1Password Section', desc: 'Auto-inserted if link is provided' },
  { key: '{{app_name}}', label: 'App Name', desc: 'Application name from settings' },
]

// ── Parse CC emails from text ──
function extractEmails(text) {
  if (!text) return []
  const matches = text.match(/[\w.+-]+@[\w.-]+\.\w{2,}/g)
  return matches || []
}

// ── Substitute template variables ──
function fillTemplate(template, req, appName) {
  return template
    .replace(/\{\{requester_name\}\}/g, req.requested_by_name || 'User')
    .replace(/\{\{mailbox_email\}\}/g, req.email_to_create || '')
    .replace(/\{\{project_name\}\}/g, req.project_name || '')
    .replace(/\{\{display_name\}\}/g, req.display_name || '—')
    .replace(/\{\{agency\}\}/g, req.agency || '')
    .replace(/\{\{app_name\}\}/g, appName)
}

// ── Format date for display ──
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : null

// ── Banner download (fetch blob → Save As dialog) ──
function BannerDownloadButton({ url, projectName }) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const ext = url.split('.').pop()?.split('?')[0] || 'png'
      const filename = `${(projectName || 'banner').replace(/\s+/g, '_')}_banner.${ext}`

      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(a.href)
    } catch {
      // Fallback: open in new tab
      window.open(url, '_blank')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors border border-primary/20 rounded-lg px-2.5 py-1.5 hover:bg-primary/5 disabled:opacity-50"
    >
      {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      {downloading ? 'Downloading...' : 'Download'}
    </button>
  )
}

// ══════════════════════════════════════════
//  Request Info Card
// ══════════════════════════════════════════
function RequestInfoCard({ req }) {
  const [expanded, setExpanded] = useState(false)

  const mainFields = [
    ['Project Name', req.project_name],
    ['Project Leader', req.project_leader],
    ['Agency', req.agency],
    ['Email to Create', req.email_to_create],
    ['Who Needs Access', req.who_needs_access],
    ['Creation Date', fmtDate(req.creation_date)],
  ]

  const extraFields = [
    ['Display Name', req.display_name],
    ['Signature Title', req.signature_title],
    ['Links', req.links],
    ['More Info', req.more_info],
    ['Deleted/Archived', req.deleted_archived],
    ['Archive Date', fmtDate(req.archive_date)],
    ['Deletion Date', fmtDate(req.deletion_date)],
    ['Requested By', req.requested_by_name],
    ['Requester Email', req.requester_email],
    ['Submitted', new Date(req.created_at).toLocaleString('fr-FR')],
    ['1Password Link', req.onepassword_link],
  ].filter(([, v]) => v)

  return (
    <Card variant="elevated">
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-5 pb-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{req.project_name}</h3>
                <p className="text-xs text-muted-foreground">{req.email_to_create}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn('text-xs', STATUS_COLORS[req.status])}>
                {req.status}
              </Badge>
              {req.confirmation_email_sent && (
                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1">
                  <Mail className="h-3 w-3" /> Sent
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Main fields */}
        <div className="p-5 space-y-2.5">
          {mainFields.map(([label, value]) => value ? (
            <div key={label} className="flex items-start gap-3 text-sm">
              <span className="font-medium text-muted-foreground w-36 shrink-0 text-xs uppercase tracking-wider pt-0.5">{label}</span>
              <span className="text-foreground break-all">{value}</span>
            </div>
          ) : null)}
        </div>

        {/* Banner preview + download */}
        {req.banner_url && (
          <div className="px-5 pb-3">
            <div className="flex items-start gap-3 text-sm">
              <span className="font-medium text-muted-foreground w-36 shrink-0 text-xs uppercase tracking-wider pt-0.5">Banner</span>
              <div className="flex items-center gap-3">
                <img src={req.banner_url} alt="Banner" className="h-14 rounded-lg border object-contain" />
                <BannerDownloadButton url={req.banner_url} projectName={req.project_name} />
              </div>
            </div>
          </div>
        )}

        {/* Expand for more details */}
        {extraFields.length > 0 && (
          <>
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-4 space-y-2.5 border-t border-border/50 pt-4">
                    {extraFields.map(([label, value]) => (
                      <div key={label} className="flex items-start gap-3 text-sm">
                        <span className="font-medium text-muted-foreground w-36 shrink-0 text-xs uppercase tracking-wider pt-0.5">{label}</span>
                        <span className="text-foreground break-all">{value}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground border-t border-border/50 transition-colors"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {expanded ? 'Show less' : 'Show more details'}
            </button>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ══════════════════════════════════════════
//  Editable CC Emails (Who Needs Access)
// ══════════════════════════════════════════
function EditableCCEmails({ req, onSave }) {
  const emails = extractEmails(req.who_needs_access)
  const [editing, setEditing] = useState(false)
  const [tags, setTags] = useState(emails)
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Reset when request changes
  useEffect(() => {
    setTags(extractEmails(req.who_needs_access))
    setEditing(false)
  }, [req.who_needs_access])

  const isValidEmail = (email) => /^[\w.+-]+@[\w.-]+\.\w{2,}$/.test(email.trim())

  const addTag = (raw) => {
    const email = raw.trim().toLowerCase()
    if (!email) return
    if (!isValidEmail(email)) { setError('Invalid email'); return }
    if (tags.includes(email)) { setError('Already added'); return }
    setError('')
    setTags((prev) => [...prev, email])
    setInputValue('')
  }

  const removeTag = (idx) => setTags((prev) => prev.filter((_, i) => i !== idx))

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      e.preventDefault()
      addTag(inputValue)
    }
    if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1)
    }
  }

  const handleSave = async () => {
    if (inputValue.trim()) addTag(inputValue)
    setSaving(true)
    await onSave(tags.join(', '))
    setSaving(false)
    setEditing(false)
  }

  if (!emails.length && !editing) {
    return (
      <Card variant="elevated">
        <CardContent className="p-4 flex items-center gap-3">
          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground flex-1">No CC emails defined</span>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1.5 text-xs">
            <Pencil className="h-3 w-3" /> Add
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="elevated">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Mail className="h-4 w-4 text-primary" />
            CC Recipients
          </div>
          {!editing && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1.5 text-xs">
              <Pencil className="h-3 w-3" /> Edit
            </Button>
          )}
        </div>

        {editing ? (
          <div className="space-y-2">
            <div className="min-h-[42px] flex flex-wrap items-center gap-1.5 rounded-lg border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 transition-all">
              {tags.map((tag, idx) => (
                <span key={tag} className="inline-flex items-center gap-1 bg-primary/10 text-primary rounded-md px-2 py-0.5 text-xs font-medium">
                  {tag}
                  <button type="button" onClick={() => removeTag(idx)} className="ml-0.5 hover:text-destructive transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                type="email"
                value={inputValue}
                onChange={(e) => { setInputValue(e.target.value); setError('') }}
                onKeyDown={handleKeyDown}
                onBlur={() => { if (inputValue.trim()) addTag(inputValue) }}
                placeholder={tags.length === 0 ? 'name@company.com' : 'Add another...'}
                className="flex-1 min-w-[150px] bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
              />
            </div>
            {error && <p className="text-[11px] text-destructive">{error}</p>}
            <div className="flex items-center gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setTags(emails); setError('') }} className="text-xs">Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 text-xs">
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {emails.map((email) => (
              <span key={email} className="inline-flex items-center gap-1 bg-primary/10 text-primary rounded-md px-2 py-0.5 text-xs font-medium">
                <Mail className="h-3 w-3" />
                {email}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ══════════════════════════════════════════
//  Inline Email Editor
// ══════════════════════════════════════════
function EmailEditor({ req, settings, onSend, onSaveDraft, onClose, sending }) {
  const appName = settings?.app_name || 'VO Gear Hub'
  const savedTemplate = settings?.mailbox_email_template || DEFAULT_TEMPLATE

  // Initialize from draft (if saved) or template
  const [emailForm, setEmailForm] = useState(() => {
    if (req.email_draft_body) {
      // Restore draft
      return {
        to: req.email_draft_to || req.requester_email || '',
        cc: req.email_draft_cc || extractEmails(req.who_needs_access).join(', '),
        subject: req.email_draft_subject || `${appName} — Your functional mailbox has been created`,
        body: req.email_draft_body,
        onepassword_link: req.email_draft_onepassword || req.onepassword_link || '',
      }
    }
    // Fill template with request values
    return {
      to: req.requester_email || '',
      cc: extractEmails(req.who_needs_access).join(', '),
      subject: `${appName} — Your functional mailbox has been created`,
      body: fillTemplate(savedTemplate, req, appName),
      onepassword_link: req.onepassword_link || '',
    }
  })

  const [showVars, setShowVars] = useState(false)
  const [draftSaved, setDraftSaved] = useState(!!req.email_draft_body)

  const handleChange = (key, value) => {
    setEmailForm((p) => ({ ...p, [key]: value }))
    setDraftSaved(false)
  }

  const handleSaveDraft = () => {
    onSaveDraft({
      email_draft_to: emailForm.to,
      email_draft_cc: emailForm.cc,
      email_draft_subject: emailForm.subject,
      email_draft_body: emailForm.body,
      email_draft_onepassword: emailForm.onepassword_link,
    })
    setDraftSaved(true)
  }

  const handleSend = () => {
    onSend(emailForm)
  }

  return (
    <Card variant="elevated" className="overflow-hidden">
      <CardContent className="p-0">
        {/* Editor header */}
        <div className="px-5 py-4 bg-gradient-to-r from-violet-500/5 via-primary/5 to-cyan-500/5 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Send className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Confirmation Email</h3>
              <p className="text-[10px] text-muted-foreground">Compose and send the mailbox creation confirmation</p>
            </div>
            {draftSaved && (
              <Badge variant="outline" className="ml-auto text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1">
                <Save className="h-2.5 w-2.5" /> Draft saved
              </Badge>
            )}
          </div>
        </div>

        {/* Email fields */}
        <div className="p-5 space-y-4">
          {/* To */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">To</Label>
            <Input
              value={emailForm.to}
              onChange={(e) => handleChange('to', e.target.value)}
              placeholder="recipient@example.com"
              className="bg-muted/30"
            />
          </div>

          {/* CC */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              CC
              <span className="font-normal normal-case tracking-normal text-muted-foreground/70">
                (auto-filled from &quot;Who Needs Access&quot;)
              </span>
            </Label>
            <Input
              value={emailForm.cc}
              onChange={(e) => handleChange('cc', e.target.value)}
              placeholder="cc1@example.com, cc2@example.com"
              className="bg-muted/30"
            />
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subject</Label>
            <Input
              value={emailForm.subject}
              onChange={(e) => handleChange('subject', e.target.value)}
              className="bg-muted/30"
            />
          </div>

          {/* 1Password Link */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <KeyRound className="h-3 w-3 text-primary" />
              1Password Link
            </Label>
            <Input
              value={emailForm.onepassword_link}
              onChange={(e) => handleChange('onepassword_link', e.target.value)}
              placeholder="https://start.1password.com/..."
              className="bg-muted/30"
            />
            <p className="text-[10px] text-muted-foreground">
              Paste the 1Password share link — replaces <code className="bg-muted px-1 py-0.5 rounded text-[9px]">{'{{onepassword_section}}'}</code> in the body
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-border/50 pt-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email Body</Label>
              <button
                onClick={() => setShowVars(!showVars)}
                className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 font-medium transition-colors"
              >
                <Sparkles className="h-3 w-3" />
                {showVars ? 'Hide' : 'Show'} variables
              </button>
            </div>

            {/* Variable legend */}
            <AnimatePresence>
              {showVars && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className="mb-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <p className="text-[10px] text-muted-foreground mb-2 font-medium">
                      Use these placeholders — they&apos;ll be replaced with request values:
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {TEMPLATE_VARS.map((v) => (
                        <div key={v.key} className="flex items-center gap-1.5 text-[10px]">
                          <code className="bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono shrink-0">{v.key}</code>
                          <span className="text-muted-foreground truncate">{v.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Body textarea */}
            <Textarea
              value={emailForm.body}
              onChange={(e) => handleChange('body', e.target.value)}
              rows={14}
              className="font-mono text-xs leading-relaxed bg-muted/30 resize-y"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 bg-muted/20 border-t border-border/50 flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            className="gap-2 text-xs"
            disabled={sending}
          >
            <Save className="h-3.5 w-3.5" />
            Save Draft
          </Button>
          <div className="flex-1" />
          <Button
            variant="outline"
            onClick={onClose}
            className="text-xs"
            disabled={sending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !emailForm.to}
            className="gap-2 text-xs min-w-[120px]"
          >
            {sending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {sending ? 'Sending...' : 'Send Email'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ══════════════════════════════════════════
//  Email Sent Summary
// ══════════════════════════════════════════
function EmailSentBadge() {
  return (
    <Card variant="elevated" className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <p className="font-bold text-sm text-emerald-600">Confirmation email sent</p>
            <p className="text-xs text-muted-foreground">The mailbox creation has been confirmed and the request is completed.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ══════════════════════════════════════════
//  Main Page
// ══════════════════════════════════════════
export function AdminMailboxRequestsPage() {
  const { data: requests = [], isLoading } = useMailboxRequests()
  const updateRequest = useUpdateMailboxRequest()
  const deleteRequest = useDeleteMailboxRequest()
  const { data: settings } = useAppSettings()
  const updateSettings = useUpdateAppSettings()
  const showToast = useUIStore((s) => s.showToast)

  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [sending, setSending] = useState(false)
  const [showEmail, setShowEmail] = useState(false)

  // Find the selected request
  const selectedRequest = useMemo(
    () => requests.find((r) => r.id === selectedId) || null,
    [requests, selectedId]
  )

  // Filtered list
  const filtered = useMemo(() => {
    if (!search.trim()) return requests
    const q = search.toLowerCase()
    return requests.filter(
      (r) =>
        r.project_name?.toLowerCase().includes(q) ||
        r.email_to_create?.toLowerCase().includes(q) ||
        r.agency?.toLowerCase().includes(q) ||
        r.requested_by_name?.toLowerCase().includes(q)
    )
  }, [requests, search])

  // ── Status change ──
  const handleStatusChange = async (req, newStatus) => {
    try {
      await updateRequest.mutateAsync({ id: req.id, updates: { status: newStatus } })
      showToast(`Request ${newStatus}`)
    } catch (err) {
      showToast(err.message || 'Update failed', 'error')
    }
  }

  // ── Save draft ──
  const handleSaveDraft = async (draftData) => {
    if (!selectedRequest) return
    try {
      await updateRequest.mutateAsync({ id: selectedRequest.id, updates: draftData })
      showToast('Draft saved')
    } catch (err) {
      showToast(err.message || 'Failed to save draft', 'error')
    }
  }

  // ── Send email ──
  const handleSendEmail = async (emailForm) => {
    if (!selectedRequest) return
    setSending(true)

    try {
      const appName = settings?.app_name || 'VO Gear Hub'
      const logoUrl = settings?.logo_url || ''
      const tagline = settings?.tagline || ''
      const logoHeight = settings?.email_logo_height || 0

      // Prepare body — replace 1Password placeholder
      let body = emailForm.body
      if (emailForm.onepassword_link) {
        body = body.replace(
          /\{\{onepassword_section\}\}/g,
          `Your password has been securely shared via 1Password:\n${emailForm.onepassword_link}`
        )
      } else {
        body = body.replace(/\{\{onepassword_section\}\}/g, '')
      }

      // Also fill any remaining template vars for sending
      body = fillTemplate(body, selectedRequest, appName)

      const htmlBody = wrapEmailHtml(body, { appName, logoUrl, tagline, logoHeight })

      const result = await sendEmail({
        to: emailForm.to,
        cc: emailForm.cc ? emailForm.cc.split(',').map((e) => e.trim()).filter(Boolean) : undefined,
        subject: emailForm.subject,
        body: htmlBody,
        isHtml: true,
      })

      if (result.success) {
        // Mark request as completed + save email data
        await updateRequest.mutateAsync({
          id: selectedRequest.id,
          updates: {
            confirmation_email_sent: true,
            onepassword_link: emailForm.onepassword_link || null,
            status: 'ready',
            // Clear draft
            email_draft_subject: null,
            email_draft_body: null,
            email_draft_to: null,
            email_draft_cc: null,
            email_draft_onepassword: null,
          },
        })

        // Save email body as template for future requests
        // Re-templatize: replace actual values back with placeholders
        try {
          let templateBody = emailForm.body
          // Only save if it looks different from current template
          if (templateBody && templateBody !== (settings?.mailbox_email_template || DEFAULT_TEMPLATE)) {
            await updateSettings.mutateAsync({ mailbox_email_template: templateBody })
          }
        } catch {
          // Template save is best-effort
        }

        showToast('Confirmation email sent! Request completed.')
        setShowEmail(false)
      } else {
        showToast(result.error || 'Failed to send email', 'error')
      }
    } catch (err) {
      showToast(err.message || 'Failed to send email', 'error')
    } finally {
      setSending(false)
    }
  }

  // ── Delete ──
  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      await deleteRequest.mutateAsync(deleteConfirm.id)
      showToast('Request deleted')
      if (selectedId === deleteConfirm.id) {
        setSelectedId(null)
      }
    } catch (err) {
      showToast(err.message, 'error')
    }
    setDeleteConfirm(null)
  }

  if (isLoading) return <PageLoading />

  // ════════════════════════════════════
  //  Detail View
  // ════════════════════════════════════
  if (selectedRequest) {
    return (
      <div className="space-y-5">
        {/* Back + title */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSelectedId(null); setShowEmail(false) }}
            className="gap-1.5 text-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Button>
          <div className="flex-1">
            <h2 className="text-lg font-display font-bold">
              {selectedRequest.project_name}
            </h2>
            <p className="text-xs text-muted-foreground">Mailbox Request Details</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteConfirm(selectedRequest)}
            className="text-destructive hover:text-destructive text-xs gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>

        {/* Request info */}
        <RequestInfoCard req={selectedRequest} />

        {/* Editable CC emails (Who Needs Access) */}
        <EditableCCEmails
          req={selectedRequest}
          onSave={async (newEmails) => {
            try {
              await updateRequest.mutateAsync({ id: selectedRequest.id, updates: { who_needs_access: newEmails } })
              showToast('CC emails updated')
            } catch (err) {
              showToast(err.message || 'Update failed', 'error')
            }
          }}
        />

        {/* Status actions */}
        {selectedRequest.status === 'pending' && (
          <Card variant="elevated">
            <CardContent className="p-4 flex items-center gap-3">
              <Info className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="text-sm text-muted-foreground flex-1">This request is pending review.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange(selectedRequest, 'in_progress')}
                className="gap-1.5 text-xs"
              >
                <Clock className="h-3.5 w-3.5" />
                Start Processing
              </Button>
              <Button
                size="sm"
                onClick={() => handleStatusChange(selectedRequest, 'ready')}
                className="gap-1.5 text-xs bg-emerald-500 hover:bg-emerald-600"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Mark Ready
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Email section */}
        {selectedRequest.confirmation_email_sent ? (
          <EmailSentBadge />
        ) : (
          <>
            {!showEmail ? (
              <Button
                onClick={() => setShowEmail(true)}
                variant="outline"
                className="w-full gap-2 py-6 text-sm border-dashed hover:border-primary/40 hover:bg-primary/5 transition-all"
              >
                <Send className="h-4 w-4 text-primary" />
                Compose Confirmation Email
                {selectedRequest.email_draft_body && (
                  <Badge variant="outline" className="ml-2 text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1">
                    <FileText className="h-2.5 w-2.5" /> Draft
                  </Badge>
                )}
              </Button>
            ) : (
              <EmailEditor
                req={selectedRequest}
                settings={settings}
                onSend={handleSendEmail}
                onSaveDraft={handleSaveDraft}
                onClose={() => setShowEmail(false)}
                sending={sending}
              />
            )}
          </>
        )}

        {/* Archive/Deletion reminders info */}
        {(selectedRequest.archive_date || selectedRequest.deletion_date) && (
          <Card variant="elevated">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Scheduled Actions
              </div>
              {selectedRequest.archive_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Archive:</span>
                  <span className="font-medium">{fmtDate(selectedRequest.archive_date)}</span>
                  {selectedRequest.archive_reminder_sent && (
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Reminder sent</Badge>
                  )}
                </div>
              )}
              {selectedRequest.deletion_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Deletion:</span>
                  <span className="font-medium">{fmtDate(selectedRequest.deletion_date)}</span>
                  {selectedRequest.deletion_reminder_sent && (
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Reminder sent</Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Delete confirmation */}
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Mailbox Request?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              This will permanently delete the mailbox request for{' '}
              <strong>{deleteConfirm?.project_name}</strong>.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // ════════════════════════════════════
  //  List View
  // ════════════════════════════════════
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Mailbox Requests" description={`${requests.length} submission${requests.length !== 1 ? 's' : ''}`} />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by project, email, agency..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Request list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Mail className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No mailbox requests found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((req) => {
            const StatusIcon = STATUS_ICONS[req.status] || Clock
            return (
              <Card
                key={req.id}
                variant="elevated"
                className="hover:shadow-card-hover transition-all cursor-pointer group"
                onClick={() => { setSelectedId(req.id); setShowEmail(false) }}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Mail className="h-5 w-5 text-violet-500" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{req.project_name}</span>
                        {req.agency && (
                          <Badge variant="secondary" className="text-[10px]">{req.agency}</Badge>
                        )}
                        <Badge variant="outline" className={cn('text-[10px] gap-1', STATUS_COLORS[req.status])}>
                          <StatusIcon className="h-2.5 w-2.5" />
                          {req.status}
                        </Badge>
                        {req.confirmation_email_sent && (
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1">
                            <Mail className="h-2.5 w-2.5" /> Sent
                          </Badge>
                        )}
                        {req.email_draft_body && !req.confirmation_email_sent && (
                          <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1">
                            <FileText className="h-2.5 w-2.5" /> Draft
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        {req.email_to_create && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {req.email_to_create}
                          </span>
                        )}
                        {req.creation_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {fmtDate(req.creation_date)}
                          </span>
                        )}
                      </div>
                      {req.requested_by_name && (
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5 flex items-center gap-1">
                          <User className="h-2.5 w-2.5" />
                          {req.requested_by_name} &middot; {fmtDate(req.created_at)}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setSelectedId(req.id); setShowEmail(false) }}
                        className="gap-1.5 text-xs"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">View</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(req) }}
                        className="text-destructive hover:text-destructive"
                      >
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

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Mailbox Request?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete the mailbox request for{' '}
            <strong>{deleteConfirm?.project_name}</strong>.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
