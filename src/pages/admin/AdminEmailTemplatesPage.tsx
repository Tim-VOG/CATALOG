import { useState, useRef, useMemo } from 'react'
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

const TEMPLATE_DESCRIPTIONS = {
  request_confirmed: 'Sent when a request is submitted',
  request_in_progress: 'Sent when admin starts processing',
  request_ready: 'Sent when the request is completed',
  request_return_reminder: 'Sent 3 days before the expected return date',
  user_invitation: 'Sent when inviting a new user',
  mailbox_confirmation: 'Sent when a functional mailbox has been created',
  onboarding_confirmation: 'Sent to the requester when an onboarding request is submitted (with HR reminder)',
}

const CATEGORIES = [
  { key: 'invitations', label: 'Invitations',  icon: UserPlus,      tint: 'bg-violet-500/10 text-violet-600' },
  { key: 'requests',    label: 'Request status', icon: ClipboardList, tint: 'bg-blue-500/10 text-blue-600' },
  { key: 'mailbox',     label: 'Mailbox',       icon: Inbox,          tint: 'bg-emerald-500/10 text-emerald-600' },
  { key: 'onboarding',  label: 'Onboarding',    icon: UserPlus,       tint: 'bg-amber-500/10 text-amber-600' },
  { key: 'reminders',   label: 'Reminders',     icon: Bell,           tint: 'bg-rose-500/10 text-rose-600' },
  { key: 'other',       label: 'Other',         icon: Mail,           tint: 'bg-muted text-muted-foreground' },
]

export function AdminEmailTemplatesPage() {
  const { data: templates = [], isLoading, isError, error, refetch } = useEmailTemplates()
  const { data: settings } = useAppSettings()
  const updateTemplate = useUpdateEmailTemplate()
  const showToast = useUIStore((s) => s.showToast)

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
    const resolved = body.replace(/\{\{(\w+)\}\}/g, (_, k) => sample[k] ?? `[${k}]`)
    const raw = /^\s*</.test(resolved)
    return wrapEmailHtml(resolved, {
      appName: settings?.app_name || 'VO Hub',
      logoUrl: settings?.logo_url || '',
      tagline: settings?.email_tagline || '',
      logoHeight: settings?.email_logo_height || 0,
      raw,
    })
  }, [body, settings])

  const openEdit = (template) => {
    setEditing(template)
    setSubject(template.subject)
    setBody(template.body)
    setEditTab('edit')
  }

  const openPreview = (template) => {
    setEditing(template)
    setSubject(template.subject)
    setBody(template.body)
    setEditTab('preview')
  }

  const handleSave = async () => {
    if (!editing) return
    try {
      await updateTemplate.mutateAsync({ id: editing.id, subject, body })
      showToast('Template updated')
      setEditing(null)
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  if (isLoading) return <PageLoading />

  if (isError) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Communications" description="Email templates and notification settings" />
        <Card variant="elevated" className="border-destructive/30">
          <CardContent className="p-6 space-y-3">
            <h3 className="font-semibold text-sm text-destructive">Couldn&apos;t load templates</h3>
            <p className="text-xs text-muted-foreground">
              {error?.message || 'Unknown error.'}
            </p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
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
      <AdminPageHeader title="Communications" description="Email templates and notification settings" />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates" className="gap-2">
            <Mail className="h-3.5 w-3.5" /> Email Templates
          </TabsTrigger>
          <TabsTrigger value="recipients" className="gap-2">
            <Mail className="h-3.5 w-3.5" /> Notification Recipients
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-6 space-y-8">
          {activeTemplates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No active email templates</p>
          ) : (
            byCategory.map((cat: any) => {
              const Icon = cat.icon
              return (
                <div key={cat.key} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center', cat.tint)}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{cat.label}</h2>
                  </div>

                  {cat.templates.map((template: any) => {
                    const icon = TEMPLATE_ICONS[template.template_key] || '📧'
                    const desc = template.description || TEMPLATE_DESCRIPTIONS[template.template_key] || ''
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
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">Subject: {template.subject}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => openPreview(template)}>
                                <Eye className="h-3 w-3" /> Preview
                              </Button>
                              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => openEdit(template)}>
                                <Pencil className="h-3 w-3" /> Edit
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
                                <h3 className="font-semibold text-sm">Onboarding email blocks</h3>
                                <Badge variant="outline" className="text-[10px]">advanced</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Block-based composer (MJML) used to send the full multi-section welcome email.
                              </p>
                            </div>
                            <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                              Open <ArrowRight className="h-3 w-3" />
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
            <DialogTitle>Edit: {editing?.name}</DialogTitle>
          </DialogHeader>

          <Tabs value={editTab} onValueChange={setEditTab}>
            <TabsList>
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="space-y-4 mt-4">
              <div className="space-y-1">
                <Label>Subject</Label>
                <Input value={subject} onChange={(e: any) => setSubject(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Body (HTML)</Label>
                <Textarea value={body} onChange={(e: any) => setBody(e.target.value)} rows={12} className="font-mono text-xs" />
              </div>
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              <div className="border rounded-xl overflow-hidden bg-muted/30">
                <iframe
                  title="Email preview"
                  srcDoc={previewHtml}
                  className="w-full h-[600px] bg-white"
                  sandbox=""
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
