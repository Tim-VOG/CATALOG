import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useOnboardingRecipients, useOnboardingBlockTemplates, useOnboardingEmail, useCreateEmail, useUpdateEmail } from '@/hooks/use-onboarding'
import { sendEmail } from '@/lib/api/send-email'
import { buildMjmlFromBlocks } from '@/lib/onboarding-mjml'
import { motion } from 'motion/react'
import { Save, Send, Eye, Globe, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { BlockEditor } from '@/components/admin/onboarding/BlockEditor'
import { OnboardingTabNav } from './OnboardingRecipientsPage'
import { useUIStore } from '@/stores/ui-store'
import { useAuth } from '@/lib/auth'

export function OnboardingComposerPage() {
  const { emailId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const showToast = useUIStore((s) => s.showToast)

  const { data: recipients = [] } = useOnboardingRecipients()
  const { data: blockTemplates = [], isLoading: blocksLoading } = useOnboardingBlockTemplates()
  const { data: existingEmail, isLoading: emailLoading } = useOnboardingEmail(emailId)
  const createEmail = useCreateEmail()
  const updateEmail = useUpdateEmail()

  const [recipientId, setRecipientId] = useState(searchParams.get('recipientId') || '')
  const [language, setLanguage] = useState('fr')
  const [subject, setSubject] = useState('')
  const [blocksConfig, setBlocksConfig] = useState([])
  const [emailDbId, setEmailDbId] = useState(emailId || null)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')

  // Initialize blocks from templates when loaded
  useEffect(() => {
    if (existingEmail) {
      setRecipientId(existingEmail.recipient_id || '')
      setLanguage(existingEmail.language || 'fr')
      setSubject(existingEmail.subject || '')
      setBlocksConfig(existingEmail.blocks_config || [])
    } else if (blockTemplates.length > 0 && blocksConfig.length === 0) {
      const initial = blockTemplates.map((t) => ({
        block_key: t.block_key,
        enabled: true,
        content_fr: t.default_content_fr,
        content_en: t.default_content_en,
        options: { ...t.default_options },
      }))
      setBlocksConfig(initial)
    }
  }, [blockTemplates, existingEmail])

  // Set language from recipient when selected
  useEffect(() => {
    if (recipientId && !emailId) {
      const r = recipients.find((rec) => rec.id === recipientId)
      if (r) setLanguage(r.language || 'fr')
    }
  }, [recipientId, recipients, emailId])

  const selectedRecipient = useMemo(
    () => recipients.find((r) => r.id === recipientId),
    [recipients, recipientId]
  )

  // Build preview HTML
  const buildPreview = useCallback(() => {
    if (blocksConfig.length === 0) return ''
    try {
      const recipient = selectedRecipient || {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        team: 'IT',
        department: 'Technology',
        start_date: new Date().toISOString().split('T')[0],
      }
      const mjml = buildMjmlFromBlocks(blocksConfig, language, recipient)
      // Use mjml-browser for client-side rendering
      // For now return MJML as placeholder until mjml-browser is loaded
      return mjml
    } catch {
      return ''
    }
  }, [blocksConfig, language, selectedRecipient])

  // Lazy load mjml-browser and render preview
  useEffect(() => {
    let cancelled = false
    const render = async () => {
      if (blocksConfig.length === 0) {
        setPreviewHtml('')
        return
      }
      try {
        const mjmlSource = buildPreview()
        if (!mjmlSource) return
        const { default: mjml2html } = await import('mjml-browser')
        const { html } = mjml2html(mjmlSource, { validationLevel: 'soft' })
        if (!cancelled) setPreviewHtml(html)
      } catch (err) {
        console.error('MJML render error:', err)
        if (!cancelled) setPreviewHtml(`<pre style="color:red;padding:20px;">${err.message}</pre>`)
      }
    }
    const timer = setTimeout(render, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [buildPreview, blocksConfig, language])

  const handleSave = async () => {
    if (!recipientId) {
      showToast('Please select a recipient', 'error')
      return
    }
    setSaving(true)
    try {
      const recipient = selectedRecipient
      const payload = {
        recipient_id: recipientId,
        recipient_name: `${recipient.first_name} ${recipient.last_name}`,
        recipient_email: recipient.email,
        language,
        subject: subject || `Welcome to VO Group, ${recipient.first_name}!`,
        blocks_config: blocksConfig,
        status: 'draft',
        created_by: user?.id,
      }
      if (emailDbId) {
        await updateEmail.mutateAsync({ id: emailDbId, ...payload })
        showToast('Draft saved')
      } else {
        const created = await createEmail.mutateAsync(payload)
        setEmailDbId(created.id)
        showToast('Draft created')
      }
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSend = async () => {
    setSending(true)
    try {
      // Save first
      await handleSave()

      // Get final HTML
      const recipient = selectedRecipient
      const mjmlSource = buildPreview()
      const { default: mjml2html } = await import('mjml-browser')
      const { html } = mjml2html(mjmlSource, { validationLevel: 'soft' })

      // Send via existing edge function
      const subjectLine = subject || `Welcome to VO Group, ${recipient.first_name}!`
      const result = await sendEmail({
        to: recipient.email,
        subject: subjectLine,
        body: html,
        isHtml: true,
      })

      if (result?.error) {
        // Update status to failed
        if (emailDbId) {
          await updateEmail.mutateAsync({
            id: emailDbId,
            status: 'failed',
            error_message: result.error,
            rendered_html: html,
          })
        }
        showToast(`Send failed: ${result.error}`, 'error')
      } else {
        // Update status to sent
        if (emailDbId) {
          await updateEmail.mutateAsync({
            id: emailDbId,
            status: 'sent',
            sent_at: new Date().toISOString(),
            rendered_html: html,
          })
        }
        showToast('Email sent successfully!')
        navigate('/admin/onboarding/history')
      }
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSending(false)
      setShowSendDialog(false)
    }
  }

  if (blocksLoading || emailLoading) return <PageLoading />

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-gradient-primary">Onboarding</h1>
          <p className="text-muted-foreground mt-1">
            {emailId ? 'Edit onboarding email' : 'Compose a new onboarding email'}
          </p>
          <motion.div
            className="mt-3 h-0.5 w-16 rounded-full bg-primary/60"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{ originX: 0 }}
          />
        </div>
        <Button variant="outline" className="gap-2" onClick={() => navigate('/admin/onboarding')}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>

      <OnboardingTabNav />

      {/* Top bar: recipient, language, subject */}
      <div className="flex flex-wrap items-end gap-4 p-4 rounded-xl border bg-card">
        <div className="space-y-1 min-w-[200px]">
          <Label>Recipient *</Label>
          <Select value={recipientId} onChange={(e) => setRecipientId(e.target.value)}>
            <option value="">Select recipient...</option>
            {recipients.map((r) => (
              <option key={r.id} value={r.id}>
                {r.first_name} {r.last_name} ({r.email})
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Language</Label>
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
        <div className="space-y-1 flex-1 min-w-[250px]">
          <Label>Subject</Label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={`Welcome to VO Group, ${selectedRecipient?.first_name || 'Name'}!`}
          />
        </div>
      </div>

      {/* Two-column layout: editor + preview */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Block editor */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
              Email Blocks
            </h2>
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

        {/* Right: Preview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
              Preview
            </h2>
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setShowPreview(true)}>
              <Eye className="h-3 w-3" /> Full screen
            </Button>
          </div>
          <div className="border rounded-xl overflow-hidden bg-card sticky top-20">
            <iframe
              srcDoc={previewHtml || '<div style="padding:40px;text-align:center;color:#666;font-family:sans-serif;">Preview will appear here</div>'}
              className="w-full border-0"
              style={{ minHeight: '600px', height: '70vh' }}
              title="Email preview"
            />
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="flex items-center justify-end gap-3 p-4 rounded-xl border bg-card sticky bottom-4">
        <Button variant="outline" className="gap-2" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Draft'}
        </Button>
        <Button
          className="gap-2"
          onClick={() => setShowSendDialog(true)}
          disabled={!recipientId || sending}
        >
          <Send className="h-4 w-4" />
          Send Email
        </Button>
      </div>

      {/* Send confirmation dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Onboarding Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Are you sure you want to send this email?</p>
            {selectedRecipient && (
              <div className="p-3 rounded-lg bg-muted/30 space-y-1 text-sm">
                <p><strong>To:</strong> {selectedRecipient.first_name} {selectedRecipient.last_name}</p>
                <p><strong>Email:</strong> {selectedRecipient.email}</p>
                <p><strong>Subject:</strong> {subject || `Welcome to VO Group, ${selectedRecipient.first_name}!`}</p>
                <p><strong>Language:</strong> <Badge variant="secondary" className="text-[10px] uppercase">{language}</Badge></p>
              </div>
            )}
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

      {/* Full preview dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
          </DialogHeader>
          <iframe
            srcDoc={previewHtml}
            className="w-full border rounded-lg"
            style={{ height: '70vh' }}
            title="Full email preview"
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
