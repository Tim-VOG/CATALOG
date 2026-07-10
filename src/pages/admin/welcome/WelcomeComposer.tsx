import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useOnboardingBlockTemplates, useOnboardingEmailsByRequest, useCreateEmail, useUpdateEmail, useSaveBlockTemplateDefaults } from '@/hooks/use-onboarding'
import { useUpdateItRequest } from '@/hooks/use-it-requests'
import { useProfiles } from '@/hooks/use-profiles'
import { sendEmail } from '@/lib/api/send-email'
import { buildMjmlFromBlocks } from '@/lib/onboarding-mjml'
import { DEFAULT_BLOCK_TEMPLATES } from '@/lib/onboarding-defaults'
import { Save, Send, Eye, Globe, X, Users, ChevronDown, Bookmark } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
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
export function WelcomeComposer({ recipient, requestId, onSent, onClose  }: any) {
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const { data: settings } = useAppSettings()
  const showToast = useUIStore((s: any) => s.showToast)

  // The recipient's business unit drives which template set we load — a BU
  // inherits VO Group's blocks until it has its own saved copy.
  const recipientBU = recipient?.company || recipient?.team || ''
  const { data: dbBlockTemplates = [], isLoading: blocksLoading, error: blocksError } = useOnboardingBlockTemplates(recipientBU)
  const { data: existingEmails = [] } = useOnboardingEmailsByRequest(requestId)
  const createEmail = useCreateEmail()
  const updateEmail = useUpdateEmail()
  const updateItRequest = useUpdateItRequest()
  const saveDefaults = useSaveBlockTemplateDefaults()
  const [savingTemplate, setSavingTemplate] = useState(false)

  const blockTemplates = dbBlockTemplates.length > 0 ? dbBlockTemplates : DEFAULT_BLOCK_TEMPLATES

  // Resume the most recent draft for this request, if any
  const existingDraft = useMemo(
    () => existingEmails.find((e: any) => e.status === 'draft') || null,
    [existingEmails]
  )

  const [emailDbId, setEmailDbId] = useState<any>(null)
  const deliveryEmail = recipient?.personal_email || recipient?.email || ''
  const usingPersonal = !!recipient?.personal_email
  const [language, setLanguage] = useState(() => {
    const l = String(recipient?.language || 'fr').slice(0, 2).toLowerCase()
    return l === 'en' || l === 'nl' ? l : 'fr'
  })
  const [subject, setSubject] = useState('')
  const [blocksConfig, setBlocksConfig] = useState<any[]>([])
  const [ccOpen, setCcOpen] = useState(false)
  const [ccSelected, setCcSelected] = useState<Set<string>>(new Set())
  const [ccExtra, setCcExtra] = useState<string[]>([]) // manually-added emails (any address)
  const [ccInput, setCcInput] = useState('')

  const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())
  const addExtraEmail = (raw: string) => {
    const e = raw.trim().toLowerCase()
    if (!isEmail(e)) return
    setCcExtra((prev) => (prev.includes(e) ? prev : [...prev, e]))
    setCcInput('')
  }
  const removeExtraEmail = (e: string) => setCcExtra((prev) => prev.filter((x) => x !== e))
  const ccAll = useMemo(() => Array.from(new Set([...Array.from(ccSelected), ...ccExtra])), [ccSelected, ccExtra])

  // Managers (role = 'manager') grouped by their business unit, so the admin
  // can pick which managers to CC on the welcome email.
  const { data: allProfiles = [] } = useProfiles()
  const managersByBU = useMemo(() => {
    const groups: Record<string, any[]> = {}
    for (const p of allProfiles as any[]) {
      if (p.role !== 'manager' || !p.email || p.is_active === false) continue
      const bu = p.business_unit || '—'
      ;(groups[bu] || (groups[bu] = [])).push(p)
    }
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]))
  }, [allProfiles])
  const hasManagers = managersByBU.length > 0

  const toggleMgr = (email: string) => setCcSelected((prev) => {
    const n = new Set(prev)
    n.has(email) ? n.delete(email) : n.add(email)
    return n
  })
  const toggleBu = (mgrs: any[]) => setCcSelected((prev) => {
    const n = new Set(prev)
    const allIn = mgrs.every((m: any) => n.has(m.email))
    mgrs.forEach((m: any) => (allIn ? n.delete(m.email) : n.add(m.email)))
    return n
  })
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
      const initial = blockTemplates.map((t: any) => ({
        block_key: t.block_key,
        enabled: t.default_enabled ?? true,
        content_fr: t.default_content_fr,
        content_en: t.default_content_en,
        content_nl: t.default_content_nl,
        options: { ...(t.default_options || {}) },
      }))
      setBlocksConfig(initial)
      const name = recipient?.first_name || 'Name'
      const company = recipient?.company || recipient?.team || 'VO Group'
      setSubject(
        language === 'fr'
          ? `Bienvenue chez ${company}, ${name}`
          : language === 'nl'
          ? `Welkom bij ${company}, ${name}`
          : `Welcome to ${company}, ${name}`
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
        logoHeight: settings?.email_logo_height || 36,
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
      } catch (err: any) {
        if (/Failed to fetch dynamically imported module|Importing a module script failed/i.test(err?.message || '')) {
          // Stale chunk after a deploy — let main.jsx reload handler kick in
          throw err
        }
        if (!cancelled) setPreviewHtml(`<div style="padding:40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#525f7f;line-height:1.6;text-align:center;"><div style="font-size:32px;margin-bottom:12px;">⚠️</div><div style="font-weight:600;color:#0a2540;font-size:15px;margin-bottom:6px;">Preview unavailable</div><div style="font-size:13px;">Reload the page to retry. The email will still send correctly.</div><div style="font-size:11px;color:#aab7c4;margin-top:14px;">${(err.message || '').replace(/</g,'&lt;')}</div></div>`)
      }
    }
    const timer = setTimeout(render, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [buildPreview, blocksConfig, language])

  const handleSave = async () => {
    if (!recipient?.id) {
      showToast(t('admin.welcomeComposer.recipientMissing'), 'error')
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
        subject: subject || `Welcome to ${recipient.company || recipient.team || 'VO Group'}, ${recipient.first_name}!`,
        blocks_config: currentBlocks,
        status: 'draft',
        created_by: user?.id,
        it_request_id: requestId || null,
      }
      if (emailDbId) {
        await updateEmail.mutateAsync({ id: emailDbId, ...payload })
        showToast(t('admin.welcomeComposer.draftSaved'))
        return emailDbId
      } else {
        const created = await createEmail.mutateAsync(payload)
        setEmailDbId(created.id)
        showToast(t('admin.welcomeComposer.draftSaved'))
        return created.id
      }
    } catch (err: any) {
      showToast(err.message, 'error')
      return null
    } finally {
      setSaving(false)
    }
  }

  // Save the current blocks as the reusable template for this recipient's
  // business unit, so future onboardings in that BU pre-fill with this
  // content. Labels/icons are carried over from the loaded templates.
  const handleSaveAsTemplate = async () => {
    const bu = String(recipientBU || '').trim()
    if (!bu) {
      showToast(t('admin.welcomeComposer.templateNoBu'), 'error')
      return
    }
    setSavingTemplate(true)
    try {
      const metaByKey = new Map<string, any>((blockTemplates as any[]).map((b: any) => [b.block_key, b]))
      const enriched = blocksRef.current.map((b: any) => {
        const meta = metaByKey.get(b.block_key) || {}
        return { ...b, label_fr: meta.label_fr, label_en: meta.label_en, icon: meta.icon }
      })
      await saveDefaults.mutateAsync({ blocksConfig: enriched, businessUnit: bu })
      showToast(t('admin.welcomeComposer.templateSaved', { bu: bu.toUpperCase() }))
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setSavingTemplate(false)
    }
  }

  const handleSend = async () => {
    setSending(true)
    try {
      const savedId = await handleSave()
      const mjmlSource = buildPreview()
      const { default: mjml2html } = await import('mjml-browser')
      const { html } = mjml2html(mjmlSource, { validationLevel: 'soft' })
      const subjectLine = subject || `Welcome to ${recipient.company || recipient.team || 'VO Group'}, ${recipient.first_name}!`

      const result = await sendEmail({
        to: deliveryEmail,
        cc: ccAll.length ? ccAll : undefined,
        subject: subjectLine,
        body: html,
        isHtml: true,
      })

      if (result?.error) {
        if (savedId) await updateEmail.mutateAsync({ id: savedId, status: 'failed', error_message: result.error, rendered_html: html })
        showToast(t('admin.welcomeComposer.sendFailed', { error: result.error }), 'error')
      } else {
        if (savedId) await updateEmail.mutateAsync({ id: savedId, status: 'sent', sent_at: new Date().toISOString(), rendered_html: html })
        if (requestId) {
          try { await updateItRequest.mutateAsync({ id: requestId, updates: { status: 'ready' } }) } catch {}
        }
        showToast(t('admin.welcomeComposer.emailSentSuccess'))
        if (onSent) onSent()
      }
    } catch (err: any) {
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
          {t('admin.welcomeComposer.recipientRequired')}
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
              <h3 className="font-semibold text-sm">{t('admin.welcomeComposer.composeTitle')}</h3>
              <p className="text-[11px] text-muted-foreground">
                {t('admin.welcomeComposer.toLabel')} {recipient.first_name} {recipient.last_name} &mdash; {deliveryEmail}
                {usingPersonal && <span className="ml-1 text-emerald-600">{t('admin.welcomeComposer.personalTag')}</span>}
                {!usingPersonal && <span className="ml-1 text-amber-600">{t('admin.welcomeComposer.corporateWarning')}</span>}
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
            {t('admin.welcomeComposer.blockTemplatesDefaultNotice')}
          </div>
        )}

        {/* Language + subject */}
        <div className="p-5 flex flex-wrap items-end gap-4 border-b border-border/50">
          <div className="space-y-1">
            <Label className="text-xs">{t('admin.welcomeComposer.languageLabel')}</Label>
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
              <Button
                variant={language === 'nl' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs px-3 rounded-full"
                onClick={() => setLanguage('nl')}
              >
                <Globe className="h-3 w-3 mr-1" /> NL
              </Button>
            </div>
          </div>
          <div className="space-y-1 flex-1 min-w-[260px]">
            <Label className="text-xs">{t('admin.welcomeComposer.subjectLabel')}</Label>
            <Input value={subject} onChange={(e: any) => setSubject(e.target.value)} />
          </div>
        </div>

        {/* CC managers — pick which ones, grouped by business unit */}
        <div className="px-5 pb-4 -mt-1 border-b border-border/50">
          <button
            type="button"
            onClick={() => setCcOpen((o) => !o)}
            className={cn(
              'flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-sm transition hover:bg-muted/30',
              ccAll.length > 0 && 'border-primary/40 bg-primary/5',
            )}
          >
            <Users className="h-4 w-4 text-primary shrink-0" />
            <span className="text-foreground font-medium">{t('admin.welcomeComposer.ccTitle')}</span>
            {ccAll.length > 0 && <Badge className="text-[10px] bg-primary text-primary-foreground">{t('admin.welcomeComposer.ccSelected', { count: ccAll.length })}</Badge>}
            <ChevronDown className={cn('h-4 w-4 ml-auto text-muted-foreground transition-transform', ccOpen && 'rotate-180')} />
          </button>

          {ccOpen && (
            <div className="mt-2 max-h-72 space-y-3 overflow-y-auto rounded-xl border border-border/60 p-2.5">
              {/* Free-form emails (anyone, incl. personal) */}
              <div>
                <div className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t('admin.welcomeComposer.ccAddEmailLabel')}</div>
                <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border/60 px-2 py-1.5">
                  {ccExtra.map((e) => (
                    <span key={e} className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      {e}
                      <button type="button" onClick={() => removeExtraEmail(e)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                  <input
                    value={ccInput}
                    onChange={(e: any) => setCcInput(e.target.value)}
                    onKeyDown={(e: any) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addExtraEmail(ccInput) } }}
                    onBlur={() => ccInput.trim() && addExtraEmail(ccInput)}
                    placeholder={t('admin.welcomeComposer.ccAddEmailPlaceholder')}
                    className="min-w-[140px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                    type="email"
                  />
                </div>
              </div>

              {hasManagers && <div className="px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t('admin.welcomeComposer.ccManagersLabel')}</div>}
              {managersByBU.map(([bu, mgrs]) => {
                const allIn = mgrs.every((m: any) => ccSelected.has(m.email))
                return (
                  <div key={bu}>
                    <div className="mb-1 flex items-center justify-between px-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{bu}</span>
                      <button type="button" onClick={() => toggleBu(mgrs)} className="text-[10px] font-medium text-primary hover:underline">
                        {allIn ? t('admin.welcomeComposer.ccDeselectAll') : t('admin.welcomeComposer.ccSelectAll')}
                      </button>
                    </div>
                    {mgrs.map((m: any) => (
                      <label key={m.email} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted/40">
                        <Checkbox checked={ccSelected.has(m.email)} onCheckedChange={() => toggleMgr(m.email)} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{[m.first_name, m.last_name].filter(Boolean).join(' ') || m.email}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{m.email}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )
              })}
            </div>
          )}

          {ccAll.length > 0 && (
            <p className="mt-1.5 truncate text-[11px] text-muted-foreground">
              {t('admin.welcomeComposer.ccLabel')} {ccAll.join(', ')}
            </p>
          )}
        </div>

        {/* Editor + preview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">{t('admin.welcomeComposer.emailBlocksTitle')}</h4>
              <Badge variant="outline" className="text-[10px]">
                {t('admin.welcomeComposer.enabledCount', { enabled: blocksConfig.filter((b: any) => b.enabled).length, total: blocksConfig.length })}
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
              <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">{t('admin.welcomeComposer.previewTitle')}</h4>
              <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setShowPreview(true)}>
                <Eye className="h-3 w-3" /> {t('admin.welcomeComposer.fullScreen')}
              </Button>
            </div>
            <div className="border rounded-xl overflow-hidden bg-card">
              <iframe
                srcDoc={previewHtml || `<div style="padding:40px;text-align:center;color:#666;font-family:sans-serif;">${t('admin.welcomeComposer.previewPlaceholder')}</div>`}
                className="w-full border-0"
                style={{ minHeight: '500px', height: '60vh' }}
                title={t('admin.welcomeComposer.previewIframeTitle')}
                sandbox=""
              />
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/50 bg-muted/20">
          {/* Save current blocks as the reusable template for this BU */}
          <Button
            variant="ghost"
            className="gap-2 text-xs"
            onClick={handleSaveAsTemplate}
            disabled={savingTemplate || !recipientBU}
            title={recipientBU ? '' : t('admin.welcomeComposer.templateNoBu')}
          >
            <Bookmark className="h-4 w-4" />
            {savingTemplate
              ? t('admin.welcomeComposer.templateSaving')
              : t('admin.welcomeComposer.saveAsTemplate', { bu: String(recipientBU || '').toUpperCase() || '—' })}
          </Button>
          <div className="flex items-center gap-3 ml-auto">
            <Button variant="outline" className="gap-2" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? t('admin.welcomeComposer.saving') : t('admin.welcomeComposer.saveDraft')}
            </Button>
            <Button className="gap-2" onClick={() => setShowSendDialog(true)} disabled={sending}>
              <Send className="h-4 w-4" />
              {t('admin.welcomeComposer.sendEmail')}
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Send confirmation */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.welcomeComposer.sendDialogTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('admin.welcomeComposer.sendConfirmQuestion')}</p>
            <div className="p-3 rounded-lg bg-muted/30 space-y-1 text-sm">
              <p><strong>{t('admin.welcomeComposer.toFieldLabel')}</strong> {recipient.first_name} {recipient.last_name}</p>
              <p><strong>{t('admin.welcomeComposer.emailFieldLabel')}</strong> {deliveryEmail} {usingPersonal ? <span className="text-emerald-600 text-xs">{t('admin.welcomeComposer.personalTag')}</span> : <span className="text-amber-600 text-xs">{t('admin.welcomeComposer.corporateFallback')}</span>}</p>
              <p><strong>{t('admin.welcomeComposer.subjectFieldLabel')}</strong> {subject}</p>
              <p><strong>{t('admin.welcomeComposer.languageFieldLabel')}</strong> <Badge variant="secondary" className="text-[10px] uppercase">{language}</Badge></p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>{t('admin.welcomeComposer.cancel')}</Button>
            <Button onClick={handleSend} disabled={sending} className="gap-2">
              <Send className="h-4 w-4" />
              {sending ? t('admin.welcomeComposer.sending') : t('admin.welcomeComposer.confirmAndSend')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full preview */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle>{t('admin.welcomeComposer.fullPreviewTitle')}</DialogTitle></DialogHeader>
          <iframe
            srcDoc={previewHtml}
            className="w-full border rounded-lg"
            style={{ height: '70vh' }}
            title={t('admin.welcomeComposer.fullPreviewIframeTitle')}
            sandbox=""
          />
        </DialogContent>
      </Dialog>
    </Card>
  )
}
