import { useState, useMemo, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useMailboxRequests, useUpdateMailboxRequest, useDeleteMailboxRequest } from '@/hooks/use-mailbox-requests'
import { useSharedMailboxes, useCreateSharedMailbox } from '@/hooks/use-shared-mailboxes'
import { useAppSettings } from '@/hooks/use-settings'
import { useUIStore } from '@/stores/ui-store'
import { sendEmail } from '@/lib/api/send-email'
import { AddToSharedMailboxDialog } from '@/components/admin/AddToSharedMailboxDialog'
import { wrapEmailHtml } from '@/lib/email-html'
import { getEmailTemplateByKey } from '@/lib/api/email-templates'
import { sendStatusChangeEmail } from '@/services/request-status-service'
import { motion, AnimatePresence } from 'motion/react'
import {
  Search, Mail, Trash2, Eye, Calendar, Building2, ArrowLeft,
  CheckCircle, XCircle, Send, Loader2, KeyRound, Clock,
  Save, FileText, ChevronDown, ChevronUp, Info, Sparkles,
  User, Globe, Archive, AlertTriangle, Download, Pencil, X,
  Users, UserCheck,
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

// ── Default email template (fallback if DB template is not yet seeded) ──
const DEFAULT_TEMPLATE = `Hi {{requester_name}},

Your functional mailbox has been created and is ready to use.

**Mailbox** {{mailbox_email}}
**Project** {{project_name}}
**Display name** {{display_name}}

{{onepassword_section}}

If you have any questions, just reply to this email — we're here to help.

Best,
The VO Hub Team`

// ── Available template variables ──
const TEMPLATE_VARS = [
  { key: '{{requester_name}}', labelKey: 'templateVarRequesterNameLabel', descKey: 'templateVarRequesterNameDesc' },
  { key: '{{mailbox_email}}', labelKey: 'templateVarMailboxEmailLabel', descKey: 'templateVarMailboxEmailDesc' },
  { key: '{{project_name}}', labelKey: 'templateVarProjectNameLabel', descKey: 'templateVarProjectNameDesc' },
  { key: '{{display_name}}', labelKey: 'templateVarDisplayNameLabel', descKey: 'templateVarDisplayNameDesc' },
  { key: '{{agency}}', labelKey: 'templateVarAgencyLabel', descKey: 'templateVarAgencyDesc' },
  { key: '{{onepassword_section}}', labelKey: 'templateVarOnepasswordLabel', descKey: 'templateVarOnepasswordDesc' },
  { key: '{{app_name}}', labelKey: 'templateVarAppNameLabel', descKey: 'templateVarAppNameDesc' },
]

// ── Parse CC emails from text ──
function extractEmails(text: any) {
  if (!text) return []
  const matches = text.match(/[\w.+-]+@[\w.-]+\.\w{2,}/g)
  return matches || []
}

// ── Substitute template variables ──
function fillTemplate(template: any, req: any, appName: any) {
  return template
    .replace(/\{\{requester_name\}\}/g, req.requested_by_name || 'User')
    .replace(/\{\{mailbox_email\}\}/g, req.email_to_create || '')
    .replace(/\{\{project_name\}\}/g, req.project_name || '')
    .replace(/\{\{display_name\}\}/g, req.display_name || '—')
    .replace(/\{\{agency\}\}/g, req.agency || '')
    .replace(/\{\{app_name\}\}/g, appName)
}

// ── Format date for display ──
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR') : null

// ══════════════════════════════════════════
//  Access-granted email (to the people who got access)
// ══════════════════════════════════════════

// Default "you now have access" template. Editable in the composer; the
// tone mirrors the manual email IT used to send by hand. {{recipient_name}}
// is derived per-recipient from their email address.
const ACCESS_DEFAULT_TEMPLATE = `Salut {{recipient_name}},

Je t'ai ajouté(e) sur la boîte mail partagée **{{mailbox_email}}**.

**Sur Mac**, il faut l'ajouter manuellement dans Outlook :
Outils → Comptes → ton compte → Délégation et partage → Autorisations → **+** puis ajoute **{{mailbox_email}}**

**Sur Windows**, la boîte apparaît automatiquement après quelques minutes (sinon redémarre Outlook).

Une question ? Réponds simplement à cet email 🙂

Bonne journée,
L'équipe {{app_name}}`

// Derive a friendly first name from an email local-part:
// "laura.smith@vo.eu" → "Laura". Falls back to "" if nothing usable.
function nameFromEmail(email: any) {
  const local = String(email || '').split('@')[0] || ''
  const token = local.split(/[.\-_+0-9]+/).filter(Boolean)[0] || ''
  return token ? token.charAt(0).toUpperCase() + token.slice(1).toLowerCase() : ''
}

function fillAccessTemplate(template: any, recipientEmail: any, mailboxEmail: any, appName: any) {
  const name = nameFromEmail(recipientEmail)
  return template
    .replace(/\{\{recipient_name\}\}/g, name || 'à toi')
    .replace(/\{\{mailbox_email\}\}/g, mailboxEmail || '')
    .replace(/\{\{app_name\}\}/g, appName)
}

// ── Banner download (fetch blob → Save As dialog) ──
function BannerDownloadButton({ url, projectName  }: any) {
  const { t } = useTranslation()
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
      {downloading ? t('admin.mailboxRequests.downloading') : t('admin.mailboxRequests.download')}
    </button>
  )
}

// ══════════════════════════════════════════
//  Request Info Card
// ══════════════════════════════════════════
function RequestInfoCard({ req  }: any) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  const mainFields = [
    [t('admin.mailboxRequests.fieldProjectName'), req.project_name],
    [t('admin.mailboxRequests.fieldProjectLeader'), req.project_leader],
    [t('admin.mailboxRequests.fieldCompany'), req.agency],
    [t('admin.mailboxRequests.fieldEmailToCreate'), req.email_to_create],
    [t('admin.mailboxRequests.fieldWhoNeedsAccess'), req.who_needs_access],
    [t('admin.mailboxRequests.fieldCreationDate'), fmtDate(req.creation_date)],
  ]

  const extraFields = [
    [t('admin.mailboxRequests.fieldDisplayName'), req.display_name],
    [t('admin.mailboxRequests.fieldSignatureTitle'), req.signature_title],
    [t('admin.mailboxRequests.fieldLinks'), req.links],
    [t('admin.mailboxRequests.fieldMoreInfo'), req.more_info],
    [t('admin.mailboxRequests.fieldDeletedArchived'), req.deleted_archived],
    [t('admin.mailboxRequests.fieldArchiveDate'), fmtDate(req.archive_date)],
    [t('admin.mailboxRequests.fieldDeletionDate'), fmtDate(req.deletion_date)],
    [t('admin.mailboxRequests.fieldRequestedBy'), req.requested_by_name],
    [t('admin.mailboxRequests.fieldRequesterEmail'), req.requester_email],
    [t('admin.mailboxRequests.fieldSubmitted'), new Date(req.created_at).toLocaleString('fr-FR')],
    [t('admin.mailboxRequests.fieldOnepasswordLink'), req.onepassword_link],
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
              <Badge variant="outline" className={cn('text-xs', (STATUS_COLORS as Record<string, any>)[req.status])}>
                {req.status}
              </Badge>
              {req.confirmation_email_sent && (
                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1">
                  <Mail className="h-3 w-3" /> {t('admin.mailboxRequests.sentBadge')}
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
              <span className="font-medium text-muted-foreground w-36 shrink-0 text-xs uppercase tracking-wider pt-0.5">{t('admin.mailboxRequests.fieldBanner')}</span>
              <div className="flex items-center gap-3">
                <img src={req.banner_url} alt={t('admin.mailboxRequests.fieldBanner')} className="h-14 rounded-lg border object-contain" />
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
              {expanded ? t('admin.mailboxRequests.showLess') : t('admin.mailboxRequests.showMoreDetails')}
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
function EditableCCEmails({ req, onSave  }: any) {
  const { t } = useTranslation()
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

  const isValidEmail = (email: any) => /^[\w.+-]+@[\w.-]+\.\w{2,}$/.test(email.trim())

  const addTag = (raw: any) => {
    const email = raw.trim().toLowerCase()
    if (!email) return
    if (!isValidEmail(email)) { setError(t('admin.mailboxRequests.invalidEmail')); return }
    if (tags.includes(email)) { setError(t('admin.mailboxRequests.alreadyAdded')); return }
    setError('')
    setTags((prev: any) => [...prev, email])
    setInputValue('')
  }

  const removeTag = (idx: any) => setTags((prev: any) => prev.filter((_: any, i: any) => i !== idx))

  const handleKeyDown = (e: any) => {
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
          <span className="text-sm text-muted-foreground flex-1">{t('admin.mailboxRequests.noCcEmails')}</span>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1.5 text-xs">
            <Pencil className="h-3 w-3" /> {t('admin.mailboxRequests.addButton')}
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
            {t('admin.mailboxRequests.ccRecipients')}
          </div>
          {!editing && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1.5 text-xs">
              <Pencil className="h-3 w-3" /> {t('admin.mailboxRequests.editButton')}
            </Button>
          )}
        </div>

        {editing ? (
          <div className="space-y-2">
            <div className="min-h-[42px] flex flex-wrap items-center gap-1.5 rounded-lg border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 transition-all">
              {tags.map((tag: any, idx: any) => (
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
                onChange={(e: any) => { setInputValue(e.target.value); setError('') }}
                onKeyDown={handleKeyDown}
                onBlur={() => { if (inputValue.trim()) addTag(inputValue) }}
                placeholder={tags.length === 0 ? t('admin.mailboxRequests.placeholderFirstEmail') : t('admin.mailboxRequests.placeholderAddAnother')}
                className="flex-1 min-w-[150px] bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
              />
            </div>
            {error && <p className="text-[11px] text-destructive">{error}</p>}
            <div className="flex items-center gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setTags(emails); setError('') }} className="text-xs">{t('admin.mailboxRequests.cancel')}</Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 text-xs">
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                {t('admin.mailboxRequests.save')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {emails.map((email: any) => (
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
function EmailEditor({ req, settings, onSend, onSaveDraft, onClose, sending  }: any) {
  const { t } = useTranslation()
  const appName = settings?.app_name || 'VO Hub'

  const [dbTemplate, setDbTemplate] = useState<any>(null)

  useEffect(() => {
    let cancelled = false
    getEmailTemplateByKey('mailbox_confirmation')
      .then((tmpl: any) => { if (!cancelled) setDbTemplate(tmpl) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const savedTemplate = dbTemplate?.body || settings?.mailbox_email_template || DEFAULT_TEMPLATE
  const savedSubject = dbTemplate?.subject || `${appName} — Your functional mailbox has been created`

  // Initialize from draft (if saved) or template
  const [emailForm, setEmailForm] = useState(() => {
    if (req.email_draft_body) {
      return {
        to: req.email_draft_to || req.requester_email || '',
        cc: req.email_draft_cc || extractEmails(req.who_needs_access).join(', '),
        subject: req.email_draft_subject || `${appName} — Your functional mailbox has been created`,
        body: req.email_draft_body,
        onepassword_link: req.email_draft_onepassword || req.onepassword_link || '',
      }
    }
    return {
      to: req.requester_email || '',
      cc: extractEmails(req.who_needs_access).join(', '),
      subject: `${appName} — Your functional mailbox has been created`,
      body: fillTemplate(DEFAULT_TEMPLATE, req, appName),
      onepassword_link: req.onepassword_link || '',
    }
  })

  // Once the DB template loads (after mount), refresh body/subject if no draft exists
  useEffect(() => {
    if (!dbTemplate || req.email_draft_body) return
    setEmailForm((prev: any) => ({
      ...prev,
      subject: savedSubject.replace(/\{\{app_name\}\}/g, appName),
      body: fillTemplate(savedTemplate, req, appName),
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbTemplate])

  const [showVars, setShowVars] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [draftSaved, setDraftSaved] = useState(!!req.email_draft_body)

  // Rendered HTML exactly as the recipient will receive it — same pipeline
  // as handleSendEmail (1Password placeholder → fill vars → wrap branding).
  const previewHtml = useMemo(() => {
    let body = emailForm.body || ''
    body = emailForm.onepassword_link
      ? body.replace(/\{\{onepassword_section\}\}/g, `Your password has been securely shared via 1Password:\n${emailForm.onepassword_link}`)
      : body.replace(/\{\{onepassword_section\}\}/g, '')
    body = fillTemplate(body, req, appName)
    return wrapEmailHtml(body, {
      appName,
      logoUrl: settings?.logo_url || '',
      tagline: settings?.email_tagline || '',
      logoHeight: settings?.email_logo_height || 0,
    })
  }, [emailForm.body, emailForm.onepassword_link, req, appName, settings])

  const handleChange = (key: any, value: any) => {
    setEmailForm((p: any) => ({ ...p, [key]: value }))
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
              <h3 className="font-bold text-sm">{t('admin.mailboxRequests.confirmationEmailTitle')}</h3>
              <p className="text-[10px] text-muted-foreground">{t('admin.mailboxRequests.composeAndSendDesc')}</p>
            </div>
            {draftSaved && (
              <Badge variant="outline" className="ml-auto text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1">
                <Save className="h-2.5 w-2.5" /> {t('admin.mailboxRequests.draftSavedBadge')}
              </Badge>
            )}
          </div>
        </div>

        {/* Email fields */}
        <div className="p-5 space-y-4">
          {/* To */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('admin.mailboxRequests.toLabel')}</Label>
            <Input
              value={emailForm.to}
              onChange={(e: any) => handleChange('to', e.target.value)}
              placeholder={t('admin.mailboxRequests.recipientPlaceholder')}
              className="bg-muted/30"
            />
          </div>

          {/* CC */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              {t('admin.mailboxRequests.ccLabel')}
              <span className="font-normal normal-case tracking-normal text-muted-foreground/70">
                {t('admin.mailboxRequests.ccAutoFillNote')}
              </span>
            </Label>
            <Input
              value={emailForm.cc}
              onChange={(e: any) => handleChange('cc', e.target.value)}
              placeholder={t('admin.mailboxRequests.ccPlaceholder')}
              className="bg-muted/30"
            />
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('admin.mailboxRequests.subjectLabel')}</Label>
            <Input
              value={emailForm.subject}
              onChange={(e: any) => handleChange('subject', e.target.value)}
              className="bg-muted/30"
            />
          </div>

          {/* 1Password Link */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <KeyRound className="h-3 w-3 text-primary" />
              {t('admin.mailboxRequests.onepasswordLinkLabel')}
            </Label>
            <Input
              value={emailForm.onepassword_link}
              onChange={(e: any) => handleChange('onepassword_link', e.target.value)}
              placeholder={t('admin.mailboxRequests.onepasswordPlaceholder')}
              className="bg-muted/30"
            />
            <p className="text-[10px] text-muted-foreground">
              {t('admin.mailboxRequests.onepasswordHelpTextBefore')} <code className="bg-muted px-1 py-0.5 rounded text-[9px]">{'{{onepassword_section}}'}</code> {t('admin.mailboxRequests.onepasswordHelpTextAfter')}
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-border/50 pt-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('admin.mailboxRequests.emailBodyLabel')}</Label>
              <button
                onClick={() => setShowVars(!showVars)}
                className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 font-medium transition-colors"
              >
                <Sparkles className="h-3 w-3" />
                {showVars ? t('admin.mailboxRequests.hideVariables') : t('admin.mailboxRequests.showVariables')}
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
                      {t('admin.mailboxRequests.placeholdersHint')}
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {TEMPLATE_VARS.map((v: any) => (
                        <div key={v.key} className="flex items-center gap-1.5 text-[10px]">
                          <code className="bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono shrink-0">{v.key}</code>
                          <span className="text-muted-foreground truncate">{t(`admin.mailboxRequests.${v.labelKey}`)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Body — edit / preview toggle */}
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-muted-foreground">{t('admin.mailboxRequests.messageLabel')}</span>
              <div className="inline-flex rounded-lg border border-border/50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${!showPreview ? 'bg-foreground text-background' : 'bg-transparent text-muted-foreground hover:bg-muted'}`}
                >
                  {t('admin.mailboxRequests.editToggle')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${showPreview ? 'bg-foreground text-background' : 'bg-transparent text-muted-foreground hover:bg-muted'}`}
                >
                  {t('admin.mailboxRequests.previewToggle')}
                </button>
              </div>
            </div>
            {showPreview ? (
              <div className="rounded-lg border border-border/50 overflow-hidden bg-white">
                <iframe
                  title={t('admin.mailboxRequests.emailPreviewTitle')}
                  srcDoc={previewHtml}
                  className="w-full h-[420px] border-0"
                  sandbox=""
                />
              </div>
            ) : (
              <Textarea
                value={emailForm.body}
                onChange={(e: any) => handleChange('body', e.target.value)}
                rows={14}
                className="font-mono text-xs leading-relaxed bg-muted/30 resize-y"
              />
            )}
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
            {t('admin.mailboxRequests.saveDraftButton')}
          </Button>
          <div className="flex-1" />
          <Button
            variant="outline"
            onClick={onClose}
            className="text-xs"
            disabled={sending}
          >
            {t('admin.mailboxRequests.cancel')}
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
            {sending ? t('admin.mailboxRequests.sendingButton') : t('admin.mailboxRequests.sendEmailButton')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ══════════════════════════════════════════
//  Access-Granted Email Editor
//  Sends one personalised email per person in "who needs access",
//  telling them how to add the shared mailbox in Outlook.
// ══════════════════════════════════════════
function AccessGrantedEmailEditor({ req, settings, onClose  }: any) {
  const { t } = useTranslation()
  const showToast = useUIStore((s: any) => s.showToast)
  const appName = settings?.app_name || 'VO Hub'
  const mailboxEmail = req.email_to_create || ''

  const [dbTemplate, setDbTemplate] = useState<any>(null)
  useEffect(() => {
    let cancelled = false
    getEmailTemplateByKey('mailbox_access_granted')
      .then((tmpl: any) => { if (!cancelled) setDbTemplate(tmpl) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const [recipients, setRecipients] = useState<any>(() => extractEmails(req.who_needs_access))
  const [inputValue, setInputValue] = useState('')
  const [subject, setSubject] = useState(
    () => t('admin.mailboxRequests.accessSubjectDefault', { mailbox_email: mailboxEmail })
  )
  const [body, setBody] = useState(() => ACCESS_DEFAULT_TEMPLATE)
  const [showPreview, setShowPreview] = useState(false)
  const [sending, setSending] = useState(false)

  // Adopt the DB template once it loads (admin can still edit afterwards).
  useEffect(() => {
    if (!dbTemplate) return
    if (dbTemplate.body) setBody(dbTemplate.body)
    if (dbTemplate.subject) setSubject(dbTemplate.subject.replace(/\{\{mailbox_email\}\}/g, mailboxEmail).replace(/\{\{app_name\}\}/g, appName))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbTemplate])

  const isValidEmail = (e: any) => /^[\w.+-]+@[\w.-]+\.\w{2,}$/.test(String(e).trim())
  const addRecipient = (raw: any) => {
    const e = String(raw).trim().toLowerCase()
    if (!e || !isValidEmail(e) || recipients.includes(e)) { setInputValue(''); return }
    setRecipients((prev: any) => [...prev, e]); setInputValue('')
  }
  const removeRecipient = (idx: any) => setRecipients((prev: any) => prev.filter((_: any, i: any) => i !== idx))

  // Preview reflects the first recipient (or a placeholder name).
  const previewHtml = useMemo(() => {
    const filled = fillAccessTemplate(body, recipients[0] || '', mailboxEmail, appName)
    return wrapEmailHtml(filled, {
      appName,
      logoUrl: settings?.logo_url || '',
      tagline: settings?.email_tagline || '',
      logoHeight: settings?.email_logo_height || 0,
    })
  }, [body, recipients, mailboxEmail, appName, settings])

  const handleSend = async () => {
    if (!recipients.length) return
    setSending(true)
    let ok = 0
    const failed: any[] = []
    for (const to of recipients) {
      try {
        const filled = fillAccessTemplate(body, to, mailboxEmail, appName)
        const htmlBody = wrapEmailHtml(filled, {
          appName,
          logoUrl: settings?.logo_url || '',
          tagline: settings?.email_tagline || '',
          logoHeight: settings?.email_logo_height || 0,
        })
        const result = await sendEmail({ to, subject, body: htmlBody, isHtml: true })
        if (result.success) ok++
        else failed.push(to)
      } catch {
        failed.push(to)
      }
    }
    setSending(false)
    if (failed.length === 0) {
      showToast(t('admin.mailboxRequests.accessSentToast', { count: ok }))
      onClose()
    } else {
      showToast(t('admin.mailboxRequests.accessPartialToast', { ok, total: recipients.length, failed: failed.length }), 'error')
    }
  }

  return (
    <Card variant="elevated" className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-500/5 via-primary/5 to-cyan-500/5 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <UserCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-sm">{t('admin.mailboxRequests.accessEmailTitle')}</h3>
              <p className="text-[10px] text-muted-foreground">{t('admin.mailboxRequests.accessEmailDesc')}</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Recipients */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3 w-3 text-primary" />
              {t('admin.mailboxRequests.accessRecipientsLabel')}
            </Label>
            <div className="min-h-[42px] flex flex-wrap items-center gap-1.5 rounded-lg border bg-muted/30 px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
              {recipients.map((tag: any, idx: any) => (
                <span key={tag} className="inline-flex items-center gap-1 bg-primary/10 text-primary rounded-md px-2 py-0.5 text-xs font-medium">
                  {tag}
                  <button type="button" onClick={() => removeRecipient(idx)} className="ml-0.5 hover:text-destructive"><X className="h-3 w-3" /></button>
                </span>
              ))}
              <input
                type="email"
                value={inputValue}
                onChange={(e: any) => setInputValue(e.target.value)}
                onKeyDown={(e: any) => { if (['Enter', ',', 'Tab'].includes(e.key)) { e.preventDefault(); addRecipient(inputValue) } }}
                onBlur={() => { if (inputValue.trim()) addRecipient(inputValue) }}
                placeholder="prenom@vo-group.be"
                className="flex-1 min-w-[150px] bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">{t('admin.mailboxRequests.accessRecipientsHint')}</p>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('admin.mailboxRequests.subjectLabel')}</Label>
            <Input value={subject} onChange={(e: any) => setSubject(e.target.value)} className="bg-muted/30" />
          </div>

          {/* Body edit / preview */}
          <div className="border-t border-border/50 pt-4">
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('admin.mailboxRequests.emailBodyLabel')}</Label>
              <div className="inline-flex rounded-lg border border-border/50 overflow-hidden">
                <button type="button" onClick={() => setShowPreview(false)} className={`px-3 py-1 text-xs font-medium transition-colors ${!showPreview ? 'bg-foreground text-background' : 'bg-transparent text-muted-foreground hover:bg-muted'}`}>{t('admin.mailboxRequests.editToggle')}</button>
                <button type="button" onClick={() => setShowPreview(true)} className={`px-3 py-1 text-xs font-medium transition-colors ${showPreview ? 'bg-foreground text-background' : 'bg-transparent text-muted-foreground hover:bg-muted'}`}>{t('admin.mailboxRequests.previewToggle')}</button>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mb-2">
              <code className="bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">{'{{recipient_name}}'}</code> {t('admin.mailboxRequests.accessTemplateVarRecipientName')}
            </p>
            {showPreview ? (
              <div className="rounded-lg border border-border/50 overflow-hidden bg-white">
                <iframe title={t('admin.mailboxRequests.emailPreviewTitle')} srcDoc={previewHtml} className="w-full h-[420px] border-0" sandbox="" />
              </div>
            ) : (
              <Textarea value={body} onChange={(e: any) => setBody(e.target.value)} rows={14} className="font-mono text-xs leading-relaxed bg-muted/30 resize-y" />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 bg-muted/20 border-t border-border/50 flex items-center gap-3">
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose} className="text-xs" disabled={sending}>{t('admin.mailboxRequests.cancel')}</Button>
          <Button onClick={handleSend} disabled={sending || !recipients.length} className="gap-2 text-xs min-w-[140px]">
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {sending ? t('admin.mailboxRequests.accessSendingButton') : t('admin.mailboxRequests.accessSendButton', { count: recipients.length })}
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
  const { t } = useTranslation()
  return (
    <Card variant="elevated" className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <p className="font-bold text-sm text-emerald-600">{t('admin.mailboxRequests.confirmationEmailSentTitle')}</p>
            <p className="text-xs text-muted-foreground">{t('admin.mailboxRequests.confirmationEmailSentDesc')}</p>
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
  const { t } = useTranslation()
  const { data: requests = [], isLoading } = useMailboxRequests()
  const updateRequest = useUpdateMailboxRequest()
  const deleteRequest = useDeleteMailboxRequest()
  const { data: settings } = useAppSettings()
  const { data: sharedMailboxes = [] } = useSharedMailboxes()
  const createSharedMailbox = useCreateSharedMailbox()
  const [showAddToInventory, setShowAddToInventory] = useState(false)
  const showToast = useUIStore((s: any) => s.showToast)

  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<any>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null)
  const [sending, setSending] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  const [showAccessEmail, setShowAccessEmail] = useState(false)

  // Find the selected request
  const selectedRequest = useMemo(
    () => requests.find((r: any) => r.id === selectedId) || null,
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
  const handleStatusChange = async (req: any, newStatus: any) => {
    try {
      await updateRequest.mutateAsync({ id: req.id, updates: { status: newStatus } })
      sendStatusChangeEmail(newStatus, { request: req, requestType: 'mailbox' })
      showToast(t('admin.mailboxRequests.requestStatusToast', { status: newStatus }))
    } catch (err: any) {
      showToast(err.message || t('admin.mailboxRequests.updateFailedError'), 'error')
    }
  }

  // ── Save draft ──
  const handleSaveDraft = async (draftData: any) => {
    if (!selectedRequest) return
    try {
      await updateRequest.mutateAsync({ id: selectedRequest.id, updates: draftData })
      showToast(t('admin.mailboxRequests.draftSavedToast'))
    } catch (err: any) {
      showToast(err.message || t('admin.mailboxRequests.failedToSaveDraft'), 'error')
    }
  }

  // ── Send email ──
  const handleSendEmail = async (emailForm: any) => {
    if (!selectedRequest) return
    setSending(true)

    try {
      const appName = settings?.app_name || 'VO Hub'
      const logoUrl = settings?.logo_url || ''
      const tagline = settings?.email_tagline || ''
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
        cc: emailForm.cc ? emailForm.cc.split(',').map((e: any) => e.trim()).filter(Boolean) : undefined,
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

        // Auto-log the fulfilled mailbox into the Shared Mailboxes directory
        // (once, deduped by email). It lands at the top of the list thanks to
        // the created_at ordering. IT-side fields use sensible defaults the
        // admin can fine-tune later on the Shared Mailboxes page.
        try {
          const email = selectedRequest.email_to_create
          const already = sharedMailboxes.some(
            (m: any) => (m.mail || '').toLowerCase() === (email || '').toLowerCase(),
          )
          if (email && !already) {
            await createSharedMailbox.mutateAsync({
              name: selectedRequest.project_name || 'Untitled mailbox',
              mail: email,
              company: selectedRequest.agency || null,
              category: 'LEGER',
              created_in: 'AD',
              created_time: selectedRequest.creation_date
                ? new Date(selectedRequest.creation_date).toISOString()
                : new Date().toISOString(),
              archive_to: selectedRequest.archive_date || null,
              delete_on: selectedRequest.deletion_date || null,
              display_name: selectedRequest.display_name || null,
              have_access: selectedRequest.who_needs_access || null,
              job_title: selectedRequest.signature_title || null,
              licence: 'SHARED MAILBOX',
              licence_checked: false,
              profile: 'WORK MAILBOX',
              project_leader: selectedRequest.project_leader || null,
              notes: selectedRequest.admin_notes || selectedRequest.more_info || null,
            })
          }
        } catch (e) {
          console.warn('[mailbox] auto-add to shared mailboxes failed', e)
        }

        showToast(t('admin.mailboxRequests.confirmationSentToast'))
        setShowEmail(false)
      } else {
        showToast(result.error || t('admin.mailboxRequests.failedToSendEmail'), 'error')
      }
    } catch (err: any) {
      showToast(err.message || t('admin.mailboxRequests.failedToSendEmail'), 'error')
    } finally {
      setSending(false)
    }
  }

  // ── Delete ──
  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      await deleteRequest.mutateAsync(deleteConfirm.id)
      showToast(t('admin.mailboxRequests.requestDeletedToast'))
      if (selectedId === deleteConfirm.id) {
        setSelectedId(null)
      }
    } catch (err: any) {
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
            onClick={() => { setSelectedId(null); setShowEmail(false); setShowAccessEmail(false) }}
            className="gap-1.5 text-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('admin.mailboxRequests.backButton')}
          </Button>
          <div className="flex-1">
            <h2 className="text-lg font-display font-bold">
              {selectedRequest.project_name}
            </h2>
            <p className="text-xs text-muted-foreground">{t('admin.mailboxRequests.mailboxRequestDetails')}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteConfirm(selectedRequest)}
            className="text-destructive hover:text-destructive text-xs gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t('admin.mailboxRequests.deleteButton')}
          </Button>
        </div>

        {/* Request info */}
        <RequestInfoCard req={selectedRequest} />

        {/* Editable CC emails (Who Needs Access) */}
        <EditableCCEmails
          req={selectedRequest}
          onSave={async (newEmails: any) => {
            try {
              await updateRequest.mutateAsync({ id: selectedRequest.id, updates: { who_needs_access: newEmails } })
              showToast(t('admin.mailboxRequests.ccEmailsUpdatedToast'))
            } catch (err: any) {
              showToast(err.message || t('admin.mailboxRequests.updateFailedError'), 'error')
            }
          }}
        />

        {/* Access-granted email — notify the people who got access */}
        {!showAccessEmail ? (
          <Button
            onClick={() => setShowAccessEmail(true)}
            variant="outline"
            className="w-full gap-2 py-5 text-sm border-dashed hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all"
          >
            <UserCheck className="h-4 w-4 text-emerald-600" />
            {t('admin.mailboxRequests.accessEmailButton')}
            {extractEmails(selectedRequest.who_needs_access).length > 0 && (
              <Badge variant="outline" className="ml-1 text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                {extractEmails(selectedRequest.who_needs_access).length}
              </Badge>
            )}
          </Button>
        ) : (
          <AccessGrantedEmailEditor
            req={selectedRequest}
            settings={settings}
            onClose={() => setShowAccessEmail(false)}
          />
        )}

        {/* Status actions */}
        {selectedRequest.status === 'pending' && (
          <Card variant="elevated">
            <CardContent className="p-4 flex items-center gap-3">
              <Info className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="text-sm text-muted-foreground flex-1">{t('admin.mailboxRequests.pendingReviewNotice')}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange(selectedRequest, 'in_progress')}
                className="gap-1.5 text-xs"
              >
                <Clock className="h-3.5 w-3.5" />
                {t('admin.mailboxRequests.startProcessing')}
              </Button>
              <Button
                size="sm"
                onClick={() => handleStatusChange(selectedRequest, 'ready')}
                className="gap-1.5 text-xs bg-emerald-500 hover:bg-emerald-600"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                {t('admin.mailboxRequests.markReady')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Email section */}
        {selectedRequest.confirmation_email_sent ? (
          <>
            <EmailSentBadge />
            {(() => {
              const alreadyInInventory = sharedMailboxes.some(
                (m) => m.mail && selectedRequest.email_to_create && m.mail.toLowerCase() === selectedRequest.email_to_create.toLowerCase()
              )
              return (
                <Card variant="elevated" className={alreadyInInventory ? 'border-emerald-500/30' : 'border-primary/30'}>
                  <CardContent className="p-5">
                    {alreadyInInventory ? (
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                          <CheckCircle className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-emerald-600">{t('admin.mailboxRequests.alreadyInInventoryTitle')}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('admin.mailboxRequests.trackedInPrefix', { email: selectedRequest.email_to_create })} <strong>{t('admin.mailboxRequests.adminSharedMailboxesLabel')}</strong>.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Mail className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm">{t('admin.mailboxRequests.logItTitle')}</p>
                            <p className="text-xs text-muted-foreground">
                              {t('admin.mailboxRequests.addToInventoryDescBefore')} <strong>{t('admin.mailboxRequests.sharedMailboxesLabel')}</strong>{t('admin.mailboxRequests.addToInventoryDescAfter')}
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={() => setShowAddToInventory(true)}
                          className="w-full gap-2"
                        >
                          <Mail className="h-4 w-4" /> {t('admin.mailboxRequests.addToSharedMailboxesButton')}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })()}
          </>
        ) : (
          <>
            {!showEmail ? (
              <Button
                onClick={() => setShowEmail(true)}
                variant="outline"
                className="w-full gap-2 py-6 text-sm border-dashed hover:border-primary/40 hover:bg-primary/5 transition-all"
              >
                <Send className="h-4 w-4 text-primary" />
                {t('admin.mailboxRequests.composeConfirmationEmailButton')}
                {selectedRequest.email_draft_body && (
                  <Badge variant="outline" className="ml-2 text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1">
                    <FileText className="h-2.5 w-2.5" /> {t('admin.mailboxRequests.draftBadge')}
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
                {t('admin.mailboxRequests.scheduledActionsTitle')}
              </div>
              {selectedRequest.archive_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('admin.mailboxRequests.archiveLabel')}</span>
                  <span className="font-medium">{fmtDate(selectedRequest.archive_date)}</span>
                  {selectedRequest.archive_reminder_sent && (
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">{t('admin.mailboxRequests.reminderSentBadge')}</Badge>
                  )}
                </div>
              )}
              {selectedRequest.deletion_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('admin.mailboxRequests.deletionLabel')}</span>
                  <span className="font-medium">{fmtDate(selectedRequest.deletion_date)}</span>
                  {selectedRequest.deletion_reminder_sent && (
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">{t('admin.mailboxRequests.reminderSentBadge')}</Badge>
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
              <DialogTitle>{t('admin.mailboxRequests.deleteRequestTitle')}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {t('admin.mailboxRequests.deleteRequestDescBefore')}{' '}
              <strong>{deleteConfirm?.project_name}</strong>.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>{t('admin.mailboxRequests.cancel')}</Button>
              <Button variant="destructive" onClick={handleDelete}>{t('admin.mailboxRequests.deleteButton')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add-to-FMB-inventory dialog needs to live inside the detail
            branch — the list branch never gets a chance to mount it when
            the user is sitting on a single request. */}
        <AddToSharedMailboxDialog
          request={showAddToInventory ? selectedRequest : null}
          open={showAddToInventory}
          onClose={() => setShowAddToInventory(false)}
          onCreated={() => setShowAddToInventory(false)}
        />
      </div>
    )
  }

  // ════════════════════════════════════
  //  List View
  // ════════════════════════════════════
  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('admin.mailboxRequests.title')} description={t('admin.mailboxRequests.submissionsCount', { count: requests.length })} />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('admin.mailboxRequests.searchPlaceholder')}
          className="pl-9"
          value={search}
          onChange={(e: any) => setSearch(e.target.value)}
        />
      </div>

      {/* Request list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Mail className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">{t('admin.mailboxRequests.noRequestsFound')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((req: any) => {
            const StatusIcon = (STATUS_ICONS as Record<string, any>)[req.status] || Clock
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
                        <Badge variant="outline" className={cn('text-[10px] gap-1', (STATUS_COLORS as Record<string, any>)[req.status])}>
                          <StatusIcon className="h-2.5 w-2.5" />
                          {req.status}
                        </Badge>
                        {req.confirmation_email_sent && (
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1">
                            <Mail className="h-2.5 w-2.5" /> {t('admin.mailboxRequests.sentBadge')}
                          </Badge>
                        )}
                        {req.email_draft_body && !req.confirmation_email_sent && (
                          <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1">
                            <FileText className="h-2.5 w-2.5" /> {t('admin.mailboxRequests.draftBadge')}
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
                        onClick={(e: any) => { e.stopPropagation(); setSelectedId(req.id); setShowEmail(false) }}
                        className="gap-1.5 text-xs"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{t('admin.mailboxRequests.viewButton')}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e: any) => { e.stopPropagation(); setDeleteConfirm(req) }}
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
            <DialogTitle>{t('admin.mailboxRequests.deleteRequestTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('admin.mailboxRequests.deleteRequestDescBefore')}{' '}
            <strong>{deleteConfirm?.project_name}</strong>.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>{t('admin.mailboxRequests.cancel')}</Button>
            <Button variant="destructive" onClick={handleDelete}>{t('admin.mailboxRequests.deleteButton')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
