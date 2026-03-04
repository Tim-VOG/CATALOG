import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth'
import { useAppSettings } from '@/hooks/use-settings'
import { useCreateInvitation, useUpdateInvitation } from '@/hooks/use-invitations'
import { useUIStore } from '@/stores/ui-store'
import { sendEmail } from '@/lib/api/send-email'
import { wrapEmailHtml } from '@/lib/email-html'
import { getEmailTemplateByKey } from '@/lib/api/email-templates'
import { Send, Loader2, Save, Eye, Variable } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

const BUSINESS_UNITS = [
  'VO GROUP', 'THE LITTLE VOICE', 'VO EVENT', 'VO CONSULTING',
  'VO PRODUCTION', 'VO STUDIOS', 'KRAFTHAUS',
]

const VARIABLES = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'app_name', label: 'App Name' },
  { key: 'login_url', label: 'Login URL' },
]

const DEFAULT_SUBJECT = "You're invited to join {{app_name}}"
const DEFAULT_BODY = `Dear {{first_name}},

You've been invited to join {{app_name}}! Click the button below to sign in with your Microsoft account and get started.

<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 0;">
<a href="{{login_url}}" style="display:inline-block;padding:14px 32px;border-radius:8px;background:linear-gradient(135deg,#f97316,#06b6d4);color:#ffffff;font-weight:600;font-size:15px;text-decoration:none;">Get Started</a>
</td></tr></table>

You'll have access to all platform features once you sign in.

Best regards,
The {{app_name}} Team`

export function InviteUserDialog({ open, onOpenChange, invitation: editingInvitation }) {
  const { user } = useAuth()
  const { data: settings } = useAppSettings()
  const createInvitation = useCreateInvitation()
  const updateInvitation = useUpdateInvitation()
  const showToast = useUIStore((s) => s.showToast)
  const bodyRef = useRef(null)

  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [businessUnit, setBusinessUnit] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [showFullPreview, setShowFullPreview] = useState(false)
  const [templateLoaded, setTemplateLoaded] = useState(false)

  const appName = settings?.app_name || 'VO Gear Hub'
  const logoUrl = settings?.logo_url || ''
  const tagline = settings?.tagline || ''
  const logoHeight = settings?.logo_height || 0

  // Load default template or editing invitation data
  useEffect(() => {
    if (!open) return
    if (templateLoaded) return

    if (editingInvitation) {
      // Editing an existing draft
      setEmail(editingInvitation.email || '')
      setFirstName(editingInvitation.first_name || '')
      setLastName(editingInvitation.last_name || '')
      setBusinessUnit(editingInvitation.business_unit || '')
      setEmailSubject(editingInvitation.email_subject || DEFAULT_SUBJECT)
      setEmailBody(editingInvitation.email_body || DEFAULT_BODY)
      setTemplateLoaded(true)
    } else {
      // Load default template from DB, fallback to hardcoded
      getEmailTemplateByKey('user_invitation')
        .then((tmpl) => {
          if (tmpl) {
            setEmailSubject(tmpl.subject || DEFAULT_SUBJECT)
            setEmailBody(tmpl.body || DEFAULT_BODY)
          } else {
            setEmailSubject(DEFAULT_SUBJECT)
            setEmailBody(DEFAULT_BODY)
          }
          setTemplateLoaded(true)
        })
        .catch(() => {
          setEmailSubject(DEFAULT_SUBJECT)
          setEmailBody(DEFAULT_BODY)
          setTemplateLoaded(true)
        })
    }
  }, [open, editingInvitation, templateLoaded])

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setEmail('')
      setFirstName('')
      setLastName('')
      setBusinessUnit('')
      setEmailSubject('')
      setEmailBody('')
      setPreviewHtml('')
      setTemplateLoaded(false)
    }
  }, [open])

  // Build preview HTML with variable substitution
  const buildPreview = useCallback(() => {
    if (!emailBody) return ''
    const loginUrl = `${window.location.origin}/login`
    const vars = {
      first_name: firstName.trim() || 'John',
      last_name: lastName.trim() || 'Doe',
      app_name: appName,
      login_url: loginUrl,
    }

    const resolvedBody = emailBody.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || `[${key}]`)
    return wrapEmailHtml(resolvedBody, { appName, logoUrl, tagline, logoHeight })
  }, [emailBody, firstName, lastName, appName, logoUrl, tagline, logoHeight])

  // Live preview with debounce
  useEffect(() => {
    if (!emailBody) {
      setPreviewHtml('')
      return
    }
    const timer = setTimeout(() => {
      setPreviewHtml(buildPreview())
    }, 300)
    return () => clearTimeout(timer)
  }, [buildPreview, emailBody, firstName, lastName])

  // Insert variable at cursor position in textarea
  const insertVariable = (varKey) => {
    const textarea = bodyRef.current
    if (!textarea) return
    const tag = `{{${varKey}}}`
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const before = emailBody.substring(0, start)
    const after = emailBody.substring(end)
    setEmailBody(before + tag + after)
    // Restore cursor after the inserted variable
    requestAnimationFrame(() => {
      textarea.focus()
      const newPos = start + tag.length
      textarea.setSelectionRange(newPos, newPos)
    })
  }

  const validateForm = () => {
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      showToast('Please enter a valid email address', 'error')
      return false
    }
    if (!emailBody.trim()) {
      showToast('Email body cannot be empty', 'error')
      return false
    }
    return true
  }

  const handleSaveDraft = async () => {
    if (!validateForm()) return
    setSaving(true)
    try {
      const trimmedEmail = email.trim().toLowerCase()
      if (editingInvitation) {
        await updateInvitation.mutateAsync({
          id: editingInvitation.id,
          email: trimmedEmail,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          business_unit: businessUnit,
          email_subject: emailSubject,
          email_body: emailBody,
        })
        showToast('Draft updated')
      } else {
        await createInvitation.mutateAsync({
          email: trimmedEmail,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          business_unit: businessUnit,
          invited_by: user?.id,
          email_subject: emailSubject,
          email_body: emailBody,
        })
        showToast('Invitation draft saved')
      }
      onOpenChange(false)
    } catch (err) {
      const msg = err?.message || 'Failed to save draft'
      if (msg.includes('duplicate') || msg.includes('unique') || msg.includes('23505')) {
        showToast('An invitation is already pending for this email', 'error')
      } else {
        showToast(msg, 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleSendInvitation = async () => {
    if (!validateForm()) return
    setSending(true)
    try {
      const trimmedEmail = email.trim().toLowerCase()
      const loginUrl = `${window.location.origin}/login`

      // Save/update the invitation first
      let invId = editingInvitation?.id
      if (invId) {
        await updateInvitation.mutateAsync({
          id: invId,
          email: trimmedEmail,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          business_unit: businessUnit,
          email_subject: emailSubject,
          email_body: emailBody,
        })
      } else {
        const created = await createInvitation.mutateAsync({
          email: trimmedEmail,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          business_unit: businessUnit,
          invited_by: user?.id,
          email_subject: emailSubject,
          email_body: emailBody,
        })
        invId = created.id
      }

      // Build final email
      const vars = {
        first_name: firstName.trim() || 'there',
        last_name: lastName.trim() || '',
        app_name: appName,
        login_url: loginUrl,
      }
      const resolvedSubject = emailSubject.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || `[${key}]`)
      const resolvedBody = emailBody.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || `[${key}]`)
      const wrappedBody = wrapEmailHtml(resolvedBody, { appName, logoUrl, tagline, logoHeight })

      // Send
      await sendEmail({
        to: trimmedEmail,
        subject: resolvedSubject,
        body: wrappedBody,
        isHtml: true,
      })

      // Mark as sent
      if (invId) {
        await updateInvitation.mutateAsync({
          id: invId,
          email_sent_at: new Date().toISOString(),
        })
      }

      showToast(`Invitation sent to ${trimmedEmail}`)
      onOpenChange(false)
    } catch (err) {
      const msg = err?.message || 'Failed to send invitation'
      if (msg.includes('duplicate') || msg.includes('unique') || msg.includes('23505')) {
        showToast('An invitation is already pending for this email', 'error')
      } else {
        showToast(msg, 'error')
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingInvitation ? 'Edit Invitation' : 'Invite User'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Form + Email Editor */}
            <div className="space-y-4">
              {/* Recipient info */}
              <div className="space-y-3 p-3 rounded-lg border bg-muted/10">
                <div className="space-y-1.5">
                  <Label htmlFor="invite-email">Email *</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="john.doe@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={!!editingInvitation}
                    autoFocus={!editingInvitation}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="invite-first">First Name</Label>
                    <Input
                      id="invite-first"
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="invite-last">Last Name</Label>
                    <Input
                      id="invite-last"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="invite-bu">Business Unit</Label>
                  <Select
                    id="invite-bu"
                    value={businessUnit}
                    onChange={(e) => setBusinessUnit(e.target.value)}
                  >
                    <option value="">— None —</option>
                    {BUSINESS_UNITS.map((bu) => (
                      <option key={bu} value={bu}>{bu}</option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Email subject */}
              <div className="space-y-1.5">
                <Label>Subject</Label>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="You're invited to join..."
                />
              </div>

              {/* Variable buttons */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label className="flex items-center gap-1.5">
                    <Variable className="h-3.5 w-3.5 text-muted-foreground" />
                    Insert Variable
                  </Label>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {VARIABLES.map((v) => (
                    <Button
                      key={v.key}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs px-2.5 font-mono"
                      onClick={() => insertVariable(v.key)}
                      type="button"
                    >
                      {`{{${v.key}}}`}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Email body */}
              <div className="space-y-1.5">
                <Label>Email Body</Label>
                <Textarea
                  ref={bodyRef}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="min-h-[260px] font-mono text-xs leading-relaxed"
                  placeholder="Write your invitation email..."
                />
                <p className="text-[10px] text-muted-foreground">
                  Supports HTML. Use {`{{variable}}`} tags for dynamic content.
                </p>
              </div>
            </div>

            {/* Right: Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Preview</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs h-7"
                  onClick={() => setShowFullPreview(true)}
                >
                  <Eye className="h-3 w-3" /> Full screen
                </Button>
              </div>
              <div className="border rounded-xl overflow-hidden bg-card">
                <iframe
                  srcDoc={previewHtml || '<div style="padding:40px;text-align:center;color:#666;font-family:sans-serif;">Preview will appear here</div>'}
                  className="w-full border-0"
                  style={{ minHeight: '480px', height: '55vh' }}
                  title="Invitation email preview"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={saving || sending}
              className="gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Draft
            </Button>
            <Button
              type="button"
              onClick={handleSendInvitation}
              disabled={saving || sending}
              className="gap-2"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full preview dialog */}
      <Dialog open={showFullPreview} onOpenChange={setShowFullPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
          </DialogHeader>
          <iframe
            srcDoc={previewHtml}
            className="w-full border rounded-lg"
            style={{ height: '70vh' }}
            title="Full invitation email preview"
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
