import { useState, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useEmailTemplates, useUpdateEmailTemplate } from '@/hooks/use-email-templates'
import { wrapEmailHtml } from '@/lib/email-html'
import { useAppSettings } from '@/hooks/use-settings'
import { Mail, Pencil, Save, Eye, UserPlus, Inbox, ClipboardList, Bell, Blocks, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { NotificationRecipientsManager } from '@/components/admin/NotificationRecipientsManager'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { ReminderSettingsCard } from '@/components/admin/ReminderSettingsCard'
import { useUIStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'

const TEMPLATE_ICONS = {
  request_confirmed: '📋',
  request_in_progress: '⏳',
  request_ready: '✅',
  request_return_reminder: '🔔',
  user_invitation: '📧',
  mailbox_confirmation: '📬',
  onboarding_confirmation: '👋',
}

const TEMPLATE_DESCRIPTION_KEYS: Record<string, string> = {
  request_confirmed: 'descRequestConfirmed',
  request_in_progress: 'descRequestInProgress',
  request_ready: 'descRequestReady',
  request_return_reminder: 'descRequestReturnReminder',
  user_invitation: 'descUserInvitation',
  mailbox_confirmation: 'descMailboxConfirmation',
  onboarding_confirmation: 'descOnboardingConfirmation',
}

const CATEGORIES = [
  { key: 'invitations', labelKey: 'categoryInvitations',  icon: UserPlus,      tint: 'bg-violet-500/10 text-violet-600' },
  { key: 'requests',    labelKey: 'categoryRequests', icon: ClipboardList, tint: 'bg-blue-500/10 text-blue-600' },
  { key: 'mailbox',     labelKey: 'categoryMailbox',       icon: Inbox,          tint: 'bg-emerald-500/10 text-emerald-600' },
  { key: 'onboarding',  labelKey: 'categoryOnboarding',    icon: UserPlus,       tint: 'bg-amber-500/10 text-amber-600' },
  { key: 'reminders',   labelKey: 'categoryReminders',     icon: Bell,           tint: 'bg-rose-500/10 text-rose-600' },
  { key: 'other',       labelKey: 'categoryOther',         icon: Mail,           tint: 'bg-muted text-muted-foreground' },
]

export function AdminEmailTemplatesPage() {
  const { t } = useTranslation()
  const { data: templates = [], isLoading, isError, error, refetch } = useEmailTemplates()
  const { data: settings } = useAppSettings()
  const updateTemplate = useUpdateEmailTemplate()
  const showToast = useUIStore((s: any) => s.showToast)

  const [activeTab, setActiveTab] = useState('templates')
  const [editing, setEditing] = useState<any>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [editTab, setEditTab] = useState('edit')

  const previewHtml = useMemo(() => {
    if (!body) return ''
    const sample = {
      first_name: 'John', last_name: 'Doe', requester_name: 'John Doe',
      app_name: settings?.app_name || 'VO Hub',
      login_url: `${window.location.origin}/login`,
      tracking_url: `${window.location.origin}/track/sample`,
      request_type: 'equipment', product_name: 'MacBook Pro 16"',
      return_date: '15 Jun 2026',
    }
    const resolved = body.replace(/\{\{(\w+)\}\}/g, (_: string, k: string) => (sample as any)[k] ?? `[${k}]`)
    const raw = /^\s*</.test(resolved)
    return wrapEmailHtml(resolved, {
      appName: settings?.app_name || 'VO Hub',
      logoUrl: settings?.logo_url || '',
      tagline: settings?.email_tagline || '',
      logoHeight: settings?.email_logo_height || 0,
      raw,
    })
  }, [body, settings])

  const openEdit = (template: any) => {
    setEditing(template)
    setSubject(template.subject)
    setBody(template.body)
    setEditTab('edit')
  }

  const openPreview = (template: any) => {
    setEditing(template)
    setSubject(template.subject)
    setBody(template.body)
    setEditTab('preview')
  }

  const handleSave = async () => {
    if (!editing) return
    try {
      await updateTemplate.mutateAsync({ id: editing.id, subject, body })
      showToast(t('admin.emailTemplates.toastUpdated'))
      setEditing(null)
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  if (isLoading) return <PageLoading />

  if (isError) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title={t('admin.emailTemplates.pageTitle')} description={t('admin.emailTemplates.pageDescription')} />
        <Card variant="elevated" className="border-destructive/30">
          <CardContent className="p-6 space-y-3">
            <h3 className="font-semibold text-sm text-destructive">{t('admin.emailTemplates.loadErrorTitle')}</h3>
            <p className="text-xs text-muted-foreground">
              {error?.message || t('admin.emailTemplates.unknownError')}
            </p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>{t('admin.emailTemplates.retry')}</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const activeTemplates = templates.filter((t: any) => t.is_active)
  const byCategory = CATEGORIES.map((cat: any) => ({
    ...cat,
    templates: activeTemplates.filter((t: any) => (t.category || 'other') === cat.key),
  })).filter((c: any) => c.templates.length > 0 || c.key === 'onboarding')

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('admin.emailTemplates.pageTitle')} description={t('admin.emailTemplates.pageDescription')} />

      <ReminderSettingsCard />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates" className="gap-2">
            <Mail className="h-3.5 w-3.5" /> {t('admin.emailTemplates.tabTemplates')}
          </TabsTrigger>
          <TabsTrigger value="recipients" className="gap-2">
            <Mail className="h-3.5 w-3.5" /> {t('admin.emailTemplates.tabRecipients')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-6 space-y-8">
          {activeTemplates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t('admin.emailTemplates.noActiveTemplates')}</p>
          ) : (
            byCategory.map((cat: any) => {
              const Icon = cat.icon
              return (
                <div key={cat.key} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center', cat.tint)}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t(`admin.emailTemplates.${cat.labelKey}`)}</h2>
                  </div>

                  {cat.templates.map((template: any) => {
                    const icon = (TEMPLATE_ICONS as Record<string, any>)[template.template_key] || '📧'
                    const descKey = TEMPLATE_DESCRIPTION_KEYS[template.template_key]
                    const desc = template.description || (descKey ? t(`admin.emailTemplates.${descKey}`) : '')
                    return (
                      <Card key={template.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-5">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg shrink-0">
                              {icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-sm">{template.name}</h3>
                                <Badge variant="outline" className="text-[10px]">{template.template_key}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">{t('admin.emailTemplates.subjectLabel', { subject: template.subject })}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => openPreview(template)}>
                                <Eye className="h-3 w-3" /> {t('admin.emailTemplates.preview')}
                              </Button>
                              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => openEdit(template)}>
                                <Pencil className="h-3 w-3" /> {t('admin.emailTemplates.edit')}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}

                  {cat.key === 'onboarding' && (
                    <Link to="/admin/onboarding/requests">
                      <Card className="hover:shadow-md transition-shadow border-dashed">
                        <CardContent className="p-5">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                              <Blocks className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-sm">{t('admin.emailTemplates.onboardingBlocksTitle')}</h3>
                                <Badge variant="outline" className="text-[10px]">{t('admin.emailTemplates.advancedBadge')}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {t('admin.emailTemplates.onboardingBlocksDescription')}
                              </p>
                            </div>
                            <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                              {t('admin.emailTemplates.openButton')} <ArrowRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  )}
                </div>
              )
            })
          )}
        </TabsContent>

        <TabsContent value="recipients" className="mt-6">
          <NotificationRecipientsManager />
        </TabsContent>
      </Tabs>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-2xl p-6">
          <DialogHeader>
            <DialogTitle>{t('admin.emailTemplates.editDialogTitle', { name: editing?.name })}</DialogTitle>
          </DialogHeader>

          <Tabs value={editTab} onValueChange={setEditTab}>
            <TabsList>
              <TabsTrigger value="edit">{t('admin.emailTemplates.edit')}</TabsTrigger>
              <TabsTrigger value="preview">{t('admin.emailTemplates.preview')}</TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="space-y-4 mt-4">
              <div className="space-y-1">
                <Label>{t('admin.emailTemplates.subjectFieldLabel')}</Label>
                <Input value={subject} onChange={(e: any) => setSubject(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>{t('admin.emailTemplates.bodyFieldLabel')}</Label>
                <Textarea value={body} onChange={(e: any) => setBody(e.target.value)} rows={12} className="font-mono text-xs" />
              </div>
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              <div className="border rounded-xl overflow-hidden bg-muted/30">
                <iframe
                  title={t('admin.emailTemplates.emailPreviewTitle')}
                  srcDoc={previewHtml}
                  className="w-full h-[600px] bg-white"
                  sandbox=""
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>{t('admin.emailTemplates.cancel')}</Button>
            <Button onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" /> {t('admin.emailTemplates.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
