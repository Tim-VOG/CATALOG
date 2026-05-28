import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useOnboardingBlockTemplates, useOnboardingEmailsByRequest, useCreateEmail, useUpdateEmail } from '@/hooks/use-onboarding'
import { useUpdateItRequest } from '@/hooks/use-it-requests'
import { sendEmail } from '@/lib/api/send-email'
import { buildMjmlFromBlocks } from '@/lib/onboarding-mjml'
import { DEFAULT_BLOCK_TEMPLATES } from '@/lib/onboarding-defaults'
import { Save, Send, Eye, Globe, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { BlockEditor } from '@/components/admin/onboarding/BlockEditor'
import { useUIStore } from '@/stores/ui-store'
import { useAuth } from '@/lib/auth'
import { useAppSettings } from '@/hooks/use-settings'

/**
 * Inline onboarding email composer.
 * Drop it inside a request detail page; it knows nothing about routing.
 *
 * Props:
 *   recipient  — onboarding_recipient row (required, drives variables)
 *   requestId  — it_requests.id, used to link onboarding_email and auto-mark ready
 *   onSent     — callback fired after a successful send
 *   onClose    — callback fired when the user clicks the close (X) button
 */
export function WelcomeComposer({ recipient, requestId, onSent, onClose }) {
  const { user, profile } = useAuth()
  const { data: settings } = useAppSettings()
  const showToast = useUIStore((s) => s.showToast)

  const { data: dbBlockTemplates = [], isLoading: blocksLoading, error: blocksError } = useOnboardingBlockTemplates()
  const { data: existingEmails = [] } = useOnboardingEmailsByRequest(requestId)
  const createEmail = useCreateEmail()
  const updateEmail = useUpdateEmail()
  const updateItRequest = useUpdateItRequest()

  const blockTemplates = dbBlockTemplates.length > 0 ? dbBlockTemplates : DEFAULT_BLOCK_TEMPLATES

  // Resume the most recent draft for this request, if any
  const existingDraft = useMemo(
    () => existingEmails.find((e) => e.status === 'draft') || null,
    [existingEmails]
  )

  const [emailDbId, setEmailDbId] = useState(null)
  const deliveryEmail = recipient?.personal_email || recipient?.email || ''
  const usingPersonal = !!recipient?.personal_email
  const [language, setLanguage] = useState((recipient?.language || 'fr') === 'fr' ? 'fr' : 'en')
  const [subject, setSubject] = useState('')
  const [blocksConfig, setBlocksConfig] = useState([])
  const blocksRef = useRef(blocksConfig)
  useEffect(() => { blocksRef.current = blocksConfig }, [blocksConfig])

  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [initialized, setInitialized] = useState(false)

  // Initialize blocks once
  useEffect(() => {
    if (initialized) return
    if (existingDraft) {
      setEmailDbId(existingDraft.id)
      setLanguage(existingDraft.language || 'fr')
      setSubject(existingDraft.subject || '')
      setBlocksConfig(existingDraft.blocks_config || [])
      setInitialized(true)
    } else if (blockTemplates.length > 0 && !blocksLoading) {
      const initial = blockTemplates.map((t) => ({
        block_key: t.block_key,
        enabled: t.default_enabled ?? true,
        content_fr: t.default_content_fr,
        content_en: t.default_content_en,
        options: { ...(t.default_options || {}) },
      }))
      setBlocksConfig(initial)
      const name = recipient?.first_name || 'Name'
      setSubject(
        language === 'fr'
          ? `Bienvenue chez VO Group, ${name}`
          : `Welcome to VO Group, ${name}`
      )
      setInitialized(true)
    }
  }, [blockTemplates, existingDraft, blocksLoading, initialized, recipient, language])

  // Build preview MJML
  const buildPreview = useCallback(() => {
    if (blocksConfig.length === 0 || !recipient) return ''
    try {
      const sender = profile ? {
        first_name: profile.first_name,
        last_name: profile.last_name,
        job_title: profile.job_title,
        phone: profile.phone,
        email: profile.email || user?.email,
      } : null
      const branding = {
        appName: settings?.app_name || 'VO Hub',
        logoUrl: settings?.logo_url || '',
        logoHeight: settings?.logo_height || 36,
      }
      return buildMjmlFromBlocks(blocksConfig, language, recipient, sender, branding)
    } catch {
      return ''
    }
  }, [blocksConfig, language, recipient, profile, user, settings])

  // Lazy-load mjml-browser and render preview
  useEffect(() => {
    let cancelled = false
    const render = async () => {
      if (blocksConfig.length === 0) { setPreviewHtml(''); return }
      try {
        const mjmlSource = buildPreview()
        if (!mjmlSource) return
        const { default: mjml2html } = await import('mjml-browser')
        const { html } = mjml2html(mjmlSource, { validationLevel: 'soft' })
        if (!cancelled) setPreviewHtml(html)
      } catch (err) {
        if (/Failed to fetch dynamically imported module|Importing a module script failed/i.test(err?.message || '')) {
          // Stale chunk after a deploy — let main.jsx reload handler kick in
          throw err
        }
        if (!cancelled) setPreviewHtml(`<pre style="color:red;padding:20px;">${err.message}</pre>`)
      }
    }
    const timer = setTimeout(render, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [buildPreview, blocksConfig, language])

  const handleSave = async () => {
    if (!recipient?.id) {
      showToast('Recipient missing', 'error')
      return null
    }
    setSaving(true)
    try {
      const currentBlocks = blocksRef.current
      const payload = {
        recipient_id: recipient.id,
        recipient_name: `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim(),
        recipient_email: recipient.email,
        language,
        subject: subject || `Welcome to VO Group, ${recipient.first_name}!`,
        blocks_config: currentBlocks,
        status: 'draft',
        created_by: user?.id,
        it_request_id: requestId || null,
      }
      if (emailDbId) {
        await updateEmail.mutateAsync({ id: emailDbId, ...payload })
        showToast('Draft saved')
        return emailDbId
      } else {
        const created = await createEmail.mutateAsync(payload)
        setEmailDbId(created.id)
        showToast('Draft saved')
        return created.id
      }
    } catch (err) {
      showToast(err.message, 'error')
      return null
    } finally {
      setSaving(false)
    }
  }

  const handleSend = async () => {
    setSending(true)
    try {
      const savedId = await handleSave()
      const mjmlSource = buildPreview()
      const { default: mjml2html } = await import('mjml-browser')
      const { html } = mjml2html(mjmlSource, { validationLevel: 'soft' })
      const subjectLine = subject || `Welcome to VO Group, ${recipient.first_name}!`

      const result = await sendEmail({
        to: deliveryEmail,
        subject: subjectLine,
        body: html,
        isHtml: true,
      })

      if (result?.error) {
        if (savedId) await updateEmail.mutateAsync({ id: savedId, status: 'failed', error_message: result.error, rendered_html: html })
        showToast(`Send failed: ${result.error}`, 'error')
      } else {
        if (savedId) await updateEmail.mutateAsync({ id: savedId, status: 'sent', sent_at: new Date().toISOString(), rendered_html: html })
        if (requestId) {
          try { await updateItRequest.mutateAsync({ id: requestId, updates: { status: 'ready' } }) } catch {}
        }
        showToast('Email sent successfully!')
        if (onSent) onSent()
      }
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSending(false)
      setShowSendDialog(false)
    }
  }

  if (!recipient) {
    return (
      <Card variant="elevated">
        <CardContent className="p-6 text-sm text-muted-foreground">
          A recipient is required to compose the welcome email.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="elevated">
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-5 flex items-center justify-between border-b border-border/50">
          <div className="flex items-center gap-3">
            <Send className="h-4 w-4 text-primary" />
            <div>
              <h3 className="font-semibold text-sm">Compose Welcome Email</h3>
              <p className="text-[11px] text-muted-foreground">
                To {recipient.first_name} {recipient.last_name} &mdash; {deliveryEmail}
                {usingPersonal && <span className="ml-1 text-emerald-600">(personal)</span>}
                {!usingPersonal && <span className="ml-1 text-amber-600">(corporate — add a personal email!)</span>}
              </p>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {blocksError && (
          <div className="mx-5 mt-3 text-xs text-amber-600 bg-amber-500/5 border border-amber-500/20 rounded-lg px-4 py-2">
            Block templates loaded from defaults — run the migration &amp; reload schema cache for full DB support.
          </div>
        )}

        {/* Language + subject */}
        <div className="p-5 flex flex-wrap items-end gap-4 border-b border-border/50">
          <div className="space-y-1">
            <Label className="text-xs">Language</Label>
            <div className="flex gap-1 bg-muted/40 rounded-full p-1 border">
              <Button
                variant={language === 'fr' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs px-3 rounded-full"
                onClick={() => setLanguage('fr')}
              >
                <Globe className="h-3 w-3 mr-1" /> FR
              </Button>
              <Button
                variant={language === 'en' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs px-3 rounded-full"
                onClick={() => setLanguage('en')}
              >
                <Globe className="h-3 w-3 mr-1" /> EN
              </Button>
            </div>
          </div>
          <div className="space-y-1 flex-1 min-w-[260px]">
            <Label className="text-xs">Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
        </div>

        {/* Editor + preview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Email Blocks</h4>
              <Badge variant="outline" className="text-[10px]">
                {blocksConfig.filter((b) => b.enabled).length}/{blocksConfig.length} enabled
              </Badge>
            </div>
            <BlockEditor
              blocks={blocksConfig}
              blockTemplates={blockTemplates}
              language={language}
              onChange={setBlocksConfig}
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Preview</h4>
              <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setShowPreview(true)}>
                <Eye className="h-3 w-3" /> Full screen
              </Button>
            </div>
            <div className="border rounded-xl overflow-hidden bg-card">
              <iframe
                srcDoc={previewHtml || '<div style="padding:40px;text-align:center;color:#666;font-family:sans-serif;">Preview will appear here</div>'}
                className="w-full border-0"
                style={{ minHeight: '500px', height: '60vh' }}
                title="Email preview"
                sandbox=""
              />
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div className="p-4 flex items-center justify-end gap-3 border-t border-border/50 bg-muted/20">
          <Button variant="outline" className="gap-2" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button className="gap-2" onClick={() => setShowSendDialog(true)} disabled={sending}>
            <Send className="h-4 w-4" />
            Send Email
          </Button>
        </div>
      </CardContent>

      {/* Send confirmation */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Onboarding Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Are you sure you want to send this email?</p>
            <div className="p-3 rounded-lg bg-muted/30 space-y-1 text-sm">
              <p><strong>To:</strong> {recipient.first_name} {recipient.last_name}</p>
              <p><strong>Email:</strong> {deliveryEmail} {usingPersonal ? <span className="text-emerald-600 text-xs">(personal)</span> : <span className="text-amber-600 text-xs">(corporate — fallback)</span>}</p>
              <p><strong>Subject:</strong> {subject}</p>
              <p><strong>Language:</strong> <Badge variant="secondary" className="text-[10px] uppercase">{language}</Badge></p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>Cancel</Button>
            <Button onClick={handleSend} disabled={sending} className="gap-2">
              <Send className="h-4 w-4" />
              {sending ? 'Sending...' : 'Confirm & Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full preview */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Email Preview</DialogTitle></DialogHeader>
          <iframe
            srcDoc={previewHtml}
            className="w-full border rounded-lg"
            style={{ height: '70vh' }}
            title="Full email preview"
            sandbox=""
          />
        </DialogContent>
      </Dialog>
    </Card>
  )
}
