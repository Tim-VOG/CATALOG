import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/lib/auth'
import { useAppSettings } from '@/hooks/use-settings'
import { useCreateInvitation, useUpdateInvitation } from '@/hooks/use-invitations'
import { useBusinessUnits } from '@/hooks/use-business-units'
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

const VARIABLES = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'app_name', label: 'App Name' },
  { key: 'login_url', label: 'Login URL' },
]

const DEFAULT_SUBJECT = "You're invited to join VO Hub"
const DEFAULT_BODY = `Hi {{first_name}},

Welcome aboard! You've been invited to join **VO Hub**.

Sign in with your Microsoft account to access the platform — your access is configured and ready to go.

{{cta:Get started|{{login_url}}}}

If you have any questions, just reply to this email — we're here to help.

Best,
The VO Hub Team`

export function InviteUserDialog({ open, onOpenChange, invitation: editingInvitation  }: any) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { data: settings } = useAppSettings()
  const createInvitation = useCreateInvitation()
  const updateInvitation = useUpdateInvitation()
  const { data: businessUnits = [] } = useBusinessUnits()
  const showToast = useUIStore((s: any) => s.showToast)
  const bodyRef = useRef<any>(null)

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

  const appName = settings?.app_name || 'VO Hub'
  const logoUrl = settings?.logo_url || ''
  const tagline = settings?.email_tagline || ''
  const logoHeight = settings?.email_logo_height || 0

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
        .then((tmpl: any) => {
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

    const resolvedBody = emailBody.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => (vars as any)[key] || `[${key}]`)
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
  const insertVariable = (varKey: any) => {
    const textarea = bodyRef.current
    if (!textarea) return
    const tag = `{{${varKey}}}`
    const start = (textarea as any).selectionStart
    const end = (textarea as any).selectionEnd
    const before = emailBody.substring(0, start)
    const after = emailBody.substring(end)
    setEmailBody(before + tag + after)
    // Restore cursor after the inserted variable
    requestAnimationFrame(() => {
      ;(textarea as any).focus()
      const newPos = start + tag.length
      ;(textarea as any).setSelectionRange(newPos, newPos)
    })
  }

  const validateForm = () => {
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      showToast(t('comp.inviteUser.invalidEmail'), 'error')
      return false
    }
    if (!emailBody.trim()) {
      showToast(t('comp.inviteUser.emailBodyEmpty'), 'error')
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
        showToast(t('comp.inviteUser.draftUpdated'))
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
        showToast(t('comp.inviteUser.draftSaved'))
      }
      onOpenChange(false)
    } catch (err: any) {
      const msg = err?.message || t('comp.inviteUser.failedSaveDraft')
      if (msg.includes('duplicate') || msg.includes('unique') || msg.includes('23505')) {
        showToast(t('comp.inviteUser.alreadyPending'), 'error')
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
      const resolvedSubject = emailSubject.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => (vars as any)[key] || `[${key}]`)
      const resolvedBody = emailBody.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => (vars as any)[key] || `[${key}]`)
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

      showToast(t('comp.inviteUser.invitationSentTo', { email: trimmedEmail }))
      onOpenChange(false)
    } catch (err: any) {
      const msg = err?.message || t('comp.inviteUser.failedSendInvitation')
      if (msg.includes('duplicate') || msg.includes('unique') || msg.includes('23505')) {
        showToast(t('comp.inviteUser.alreadyPending'), 'error')
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
              {editingInvitation ? t('comp.inviteUser.editInvitationTitle') : t('comp.inviteUser.inviteUserTitle')}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Form + Email Editor */}
            <div className="space-y-4">
              {/* Recipient info */}
              <div className="space-y-3 p-3 rounded-lg border bg-muted/10">
                <div className="space-y-1.5">
                  <Label htmlFor="invite-email">{t('comp.inviteUser.emailLabel')}</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder={t('comp.inviteUser.emailPlaceholder')}
                    value={email}
                    onChange={(e: any) => setEmail(e.target.value)}
                    disabled={!!editingInvitation}
                    autoFocus={!editingInvitation}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="invite-first">{t('comp.inviteUser.firstNameLabel')}</Label>
                    <Input
                      id="invite-first"
                      placeholder={t('comp.inviteUser.firstNamePlaceholder')}
                      value={firstName}
                      onChange={(e: any) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="invite-last">{t('comp.inviteUser.lastNameLabel')}</Label>
                    <Input
                      id="invite-last"
                      placeholder={t('comp.inviteUser.lastNamePlaceholder')}
                      value={lastName}
                      onChange={(e: any) => setLastName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="invite-bu">{t('comp.inviteUser.businessUnitLabel')}</Label>
                  <Select
                    id="invite-bu"
                    value={businessUnit}
                    onChange={(e: any) => setBusinessUnit(e.target.value)}
                  >
                    <option value="">{t('comp.inviteUser.noneOption')}</option>
                    {businessUnits.map((bu: any) => (
                      <option key={bu.id} value={bu.value}>{bu.value}</option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Email subject */}
              <div className="space-y-1.5">
                <Label>{t('comp.inviteUser.subjectLabel')}</Label>
                <Input
                  value={emailSubject}
                  onChange={(e: any) => setEmailSubject(e.target.value)}
                  placeholder={t('comp.inviteUser.subjectPlaceholder')}
                />
              </div>

              {/* Variable buttons */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label className="flex items-center gap-1.5">
                    <Variable className="h-3.5 w-3.5 text-muted-foreground" />
                    {t('comp.inviteUser.insertVariableLabel')}
                  </Label>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {VARIABLES.map((v: any) => (
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
                <Label>{t('comp.inviteUser.emailBodyLabel')}</Label>
                <Textarea
                  ref={bodyRef}
                  value={emailBody}
                  onChange={(e: any) => setEmailBody(e.target.value)}
                  className="min-h-[260px] font-mono text-xs leading-relaxed"
                  placeholder={t('comp.inviteUser.emailBodyPlaceholder')}
                />
                <p className="text-[10px] text-muted-foreground">
                  {t('comp.inviteUser.supportsHtmlPrefix')} {`{{variable}}`} {t('comp.inviteUser.supportsHtmlSuffix')}
                </p>
              </div>
            </div>

            {/* Right: Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('comp.inviteUser.previewLabel')}</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs h-7"
                  onClick={() => setShowFullPreview(true)}
                >
                  <Eye className="h-3 w-3" /> {t('comp.inviteUser.fullScreenLabel')}
                </Button>
              </div>
              <div className="border rounded-xl overflow-hidden bg-card">
                <iframe
                  srcDoc={previewHtml || `<div style="padding:40px;text-align:center;color:#666;font-family:sans-serif;">${t('comp.inviteUser.previewPlaceholder')}</div>`}
                  className="w-full border-0"
                  style={{ minHeight: '480px', height: '55vh' }}
                  title={t('comp.inviteUser.previewIframeTitle')}
                  sandbox=""
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('comp.inviteUser.cancel')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={saving || sending}
              className="gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t('comp.inviteUser.saveDraft')}
            </Button>
            <Button
              type="button"
              onClick={handleSendInvitation}
              disabled={saving || sending}
              className="gap-2"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {t('comp.inviteUser.sendInvitation')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full preview dialog */}
      <Dialog open={showFullPreview} onOpenChange={setShowFullPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{t('comp.inviteUser.emailPreviewTitle')}</DialogTitle>
          </DialogHeader>
          <iframe
            srcDoc={previewHtml}
            className="w-full border rounded-lg"
            style={{ height: '70vh' }}
            title={t('comp.inviteUser.fullPreviewIframeTitle')}
            sandbox=""
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
