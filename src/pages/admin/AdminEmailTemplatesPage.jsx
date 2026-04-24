import { useState, useRef } from 'react'
import { useEmailTemplates, useUpdateEmailTemplate } from '@/hooks/use-email-templates'
import { Mail, Pencil, Save, Eye } from 'lucide-react'
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
  user_invitation: '📧',
}

const TEMPLATE_DESCRIPTIONS = {
  request_confirmed: 'Sent when a request is submitted',
  request_in_progress: 'Sent when admin starts processing',
  request_ready: 'Sent when the request is completed',
  user_invitation: 'Sent when inviting a new user',
}

export function AdminEmailTemplatesPage() {
  const { data: templates = [], isLoading } = useEmailTemplates()
  const updateTemplate = useUpdateEmailTemplate()
  const showToast = useUIStore((s) => s.showToast)

  const [activeTab, setActiveTab] = useState('templates')
  const [editing, setEditing] = useState(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [editTab, setEditTab] = useState('edit')

  const openEdit = (template) => {
    setEditing(template)
    setSubject(template.subject)
    setBody(template.body)
    setEditTab('edit')
  }

  const handleSave = async () => {
    if (!editing) return
    try {
      await updateTemplate.mutateAsync({ id: editing.id, subject, body })
      showToast('Template updated')
      setEditing(null)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  if (isLoading) return <PageLoading />

  const activeTemplates = templates.filter((t) => t.is_active)

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

        <TabsContent value="templates" className="mt-6 space-y-3">
          {activeTemplates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No active email templates</p>
          ) : (
            activeTemplates.map((template) => {
              const icon = TEMPLATE_ICONS[template.template_key] || '📧'
              const desc = TEMPLATE_DESCRIPTIONS[template.template_key] || ''
              return (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg shrink-0">
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm">{template.name}</h3>
                          <Badge variant="outline" className="text-[10px]">{template.template_key}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Subject: {template.subject}</p>
                      </div>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => openEdit(template)}>
                        <Pencil className="h-3 w-3" /> Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
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
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Body (HTML)</Label>
                <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} className="font-mono text-xs" />
              </div>
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              <div className="border rounded-xl overflow-hidden bg-white">
                <div className="p-4" dangerouslySetInnerHTML={{ __html: body }} />
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
