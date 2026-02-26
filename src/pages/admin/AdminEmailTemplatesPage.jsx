import { useState, useRef, useMemo } from 'react'
import { useEmailTemplates, useUpdateEmailTemplate } from '@/hooks/use-email-templates'
import { Mail, Pencil, Eye, Save, ToggleLeft, ToggleRight, FileText, Bell, Code } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { FormFieldsManager } from '@/components/admin/FormFieldsManager'
import { NotificationRecipientsManager } from '@/components/admin/NotificationRecipientsManager'
import { generateItemsHtml, generateStyledVars, wrapEmailHtml } from '@/lib/email-html'
import { useAppSettings } from '@/hooks/use-settings'
import { useUIStore } from '@/stores/ui-store'

// Chronological workflow order (inactive templates interleaved)
const TEMPLATE_ORDER = {
  order_confirmation: 1,
  order_ready: 2,
  equipment_picked_up: 3,
  return_reminder: 4,
  return_confirmation: 5,
  request_closed: 6,
  extension_approved: 7,
  extension_rejected: 8,
}

const EXTENSION_STEP = 7

const TEMPLATE_ICONS = {
  order_confirmation: '📋',
  equipment_picked_up: '📤',
  return_confirmation: '📦',
  request_closed: '✅',
  extension_approved: '📅',
  extension_rejected: '❌',
  order_ready: '✅',
  return_reminder: '⏰',
}

const SAMPLE_DATA = {
  user_name: 'John Doe',
  project_name: 'Client Demo - Acme Corp',
  pickup_date: '01 Mar 2026',
  return_date: '15 Mar 2026',
  item_list: 'MacBook Pro 14" (x1), LG 24" Monitor (x2)',
  condition: 'Good - no damage',
  project_description: 'Demo setup for Acme Corp client visit on March 3rd. Need a full workstation with external monitors.',
  justification: 'Client meeting requires live product demo with dual screen setup.',
  requested_days: '5',
  granted_days: '3',
  new_return_date: '18 Mar 2026',
  admin_comment: 'Approved for 3 days — please return promptly after the demo.',
}

// Sample items for HTML preview
const SAMPLE_ITEMS = [
  { id: '1', product_name: 'MacBook Pro 14"', product_image: '', quantity: 1, product_includes: ['Charger', 'USB-C Hub'] },
  { id: '2', product_name: 'LG 24" Monitor', product_image: '', quantity: 2, product_includes: ['HDMI Cable', 'Power Cord'] },
]
const SAMPLE_ITEM_RETURNS = [
  { id: '1', return_condition: 'good', return_notes: '', is_returned: true },
  { id: '2', return_condition: 'minor', return_notes: 'Small scratch on screen', is_returned: true },
]

export function AdminEmailTemplatesPage() {
  const { data: templates = [], isLoading } = useEmailTemplates()
  const updateTemplate = useUpdateEmailTemplate()
  const { data: settings } = useAppSettings()
  const showToast = useUIStore((s) => s.showToast)

  const [activeTab, setActiveTab] = useState('templates')
  const [editing, setEditing] = useState(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [templateFormat, setTemplateFormat] = useState('text')
  const [editTab, setEditTab] = useState('edit')
  const bodyRef = useRef(null)

  const openEdit = (template) => {
    setEditing(template)
    setSubject(template.subject)
    setBody(template.body)
    setTemplateFormat(template.format || 'text')
    setEditTab('edit')
  }

  const handleSave = async () => {
    if (!editing) return
    try {
      await updateTemplate.mutateAsync({ id: editing.id, subject, body, format: templateFormat })
      showToast('Template updated')
      setEditing(null)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleToggleActive = async (template) => {
    try {
      await updateTemplate.mutateAsync({ id: template.id, is_active: !template.is_active })
      showToast(template.is_active ? 'Template disabled' : 'Template enabled')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const insertVariable = (varName) => {
    const textarea = bodyRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const tag = `{{${varName}}}`
    const newBody = body.slice(0, start) + tag + body.slice(end)
    setBody(newBody)
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + tag.length, start + tag.length)
    }, 0)
  }

  // Build sample data for preview (plain + styled HTML versions)
  const samplePlainVars = useMemo(() => ({
    ...SAMPLE_DATA,
    items_html: generateItemsHtml(SAMPLE_ITEMS, SAMPLE_ITEM_RETURNS),
  }), [])

  const sampleStyledVars = useMemo(
    () => generateStyledVars({ ...SAMPLE_DATA, items_html: generateItemsHtml(SAMPLE_ITEMS, SAMPLE_ITEM_RETURNS), _items: SAMPLE_ITEMS }),
    []
  )

  const renderPreview = (text, useStyled = false) => {
    const vars = useStyled ? sampleStyledVars : samplePlainVars
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || `[${key}]`)
  }

  // Build full HTML preview for the edit dialog iframe
  const htmlPreview = useMemo(() => {
    if (templateFormat !== 'html') return null
    const substituted = renderPreview(body, true)
    return wrapEmailHtml(substituted, { appName: settings?.app_name || 'VO Gear Hub', logoUrl: settings?.logo_url || '', tagline: settings?.email_tagline || '', logoHeight: settings?.email_logo_height || 0 })
  }, [body, templateFormat, sampleStyledVars, settings])

  // Pre-compute HTML previews for all templates (used in timeline cards)
  const templatePreviews = useMemo(() => {
    const appName = settings?.app_name || 'VO Gear Hub'
    const logoUrl = settings?.logo_url || ''
    const tagline = settings?.email_tagline || ''
    const logoHeight = settings?.email_logo_height || 0
    const previews = {}
    for (const t of templates) {
      if (t.format === 'html' && t.body) {
        const substituted = renderPreview(t.body, true)
        previews[t.id] = wrapEmailHtml(substituted, { appName, logoUrl, tagline, logoHeight })
      }
    }
    return previews
  }, [templates, sampleStyledVars, settings])

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Communications</h1>
        <p className="text-muted-foreground mt-1">Manage email templates, checkout fields, and notification recipients</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates" className="gap-1.5">
            <Mail className="h-3.5 w-3.5" /> Email Templates
          </TabsTrigger>
          <TabsTrigger value="fields" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Checkout Fields
          </TabsTrigger>
          <TabsTrigger value="recipients" className="gap-1.5">
            <Bell className="h-3.5 w-3.5" /> Recipients
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-6">
          {(() => {
            const sorted = [...templates].sort((a, b) => (TEMPLATE_ORDER[a.template_key] ?? 99) - (TEMPLATE_ORDER[b.template_key] ?? 99))
            const mainFlow = sorted.filter((t) => (TEMPLATE_ORDER[t.template_key] ?? 99) < EXTENSION_STEP)
            const extensions = sorted.filter((t) => {
              const order = TEMPLATE_ORDER[t.template_key] ?? 99
              return order >= EXTENSION_STEP && order < 99
            })

            const renderTemplateCard = (t, stepNumber, isLast) => (
              <div key={t.id} className="flex gap-4">
                {/* Timeline dot + line */}
                <div className="flex flex-col items-center pt-1">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${t.is_active ? 'border-primary bg-primary/10 text-primary' : 'border-muted-foreground/30 bg-muted text-muted-foreground'}`}>
                    {stepNumber}
                  </div>
                  {!isLast && <div className="w-0.5 flex-1 bg-border mt-2" />}
                </div>

                {/* Card */}
                <Card className={`flex-1 mb-4 ${!t.is_active ? 'opacity-50' : ''}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span>{TEMPLATE_ICONS[t.template_key] || '📧'}</span>
                        {t.name}
                        {t.format === 'html' && (
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Code className="h-2.5 w-2.5" /> HTML
                          </Badge>
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActive(t)}
                          title={t.is_active ? 'Disable' : 'Enable'}
                        >
                          {t.is_active ? (
                            <ToggleRight className="h-4 w-4 text-green-400" />
                          ) : (
                            <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(t)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">{t.description}</p>
                    <div className="text-xs text-muted-foreground mb-3">
                      <span className="font-medium">Subject:</span> {renderPreview(t.subject)}
                    </div>
                    {templatePreviews[t.id] ? (
                      <iframe
                        srcDoc={templatePreviews[t.id]}
                        className="w-full rounded-lg border pointer-events-none"
                        style={{ height: '80px' }}
                        title={`Preview: ${t.name}`}
                        onLoad={(e) => {
                          const doc = e.target.contentDocument
                          if (doc) e.target.style.height = doc.documentElement.scrollHeight + 'px'
                        }}
                      />
                    ) : (
                      <div className="whitespace-pre-wrap text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 max-h-40 overflow-hidden">
                        {renderPreview(t.body)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )

            return (
              <div className="max-w-3xl">
                {mainFlow.map((t, i) => renderTemplateCard(t, TEMPLATE_ORDER[t.template_key], i === mainFlow.length - 1 && extensions.length === 0))}

                {extensions.length > 0 && (
                  <>
                    <div className="flex items-center gap-3 my-2 ml-3.5">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-xs text-muted-foreground font-medium">Extensions</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    {extensions.map((t, i) => renderTemplateCard(t, TEMPLATE_ORDER[t.template_key], i === extensions.length - 1))}
                  </>
                )}
              </div>
            )
          })()}
        </TabsContent>

        <TabsContent value="fields" className="mt-6">
          <FormFieldsManager />
        </TabsContent>

        <TabsContent value="recipients" className="mt-6">
          <NotificationRecipientsManager />
        </TabsContent>
      </Tabs>

      {/* Edit Template Dialog */}
      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4">
              <DialogTitle>
                Edit Template: {editing?.name}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Format:</Label>
                <div className="flex gap-1 bg-muted rounded-lg p-0.5">
                  <Button
                    variant={templateFormat === 'text' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => setTemplateFormat('text')}
                  >
                    Text
                  </Button>
                  <Button
                    variant={templateFormat === 'html' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-6 text-xs px-2 gap-1"
                    onClick={() => setTemplateFormat('html')}
                  >
                    <Code className="h-3 w-3" /> HTML
                  </Button>
                </div>
              </div>
            </div>
          </DialogHeader>

          <Tabs value={editTab} onValueChange={setEditTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-fit">
              <TabsTrigger value="edit" className="gap-1">
                <Pencil className="h-3 w-3" /> Edit
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-1">
                <Eye className="h-3 w-3" /> Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="flex-1 overflow-y-auto space-y-4 mt-4">
              <div className="space-y-1">
                <Label>Subject Line</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label>Available Variables</Label>
                <div className="flex flex-wrap gap-1">
                  {(editing?.variables || []).map((v) => (
                    <Badge
                      key={v}
                      variant="outline"
                      className={`cursor-pointer hover:bg-primary/20 transition-colors text-xs ${v === 'items_html' || v === 'details_card' ? 'border-primary/50 text-primary' : ''}`}
                      onClick={() => insertVariable(v)}
                    >
                      {`{{${v}}}`}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Click a variable to insert it at cursor position
                  {templateFormat === 'html' && (
                    <span className="text-primary"> — Use <code className="bg-muted px-1 rounded">{`{{items_html}}`}</code> for a product table, <code className="bg-muted px-1 rounded">{`{{details_card}}`}</code> for a summary card</span>
                  )}
                </p>
              </div>

              <div className="space-y-1">
                <Label>Email Body {templateFormat === 'html' && <span className="text-primary text-xs">(HTML)</span>}</Label>
                <Textarea
                  ref={bodyRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={14}
                  className="font-mono text-sm"
                />
              </div>
            </TabsContent>

            <TabsContent value="preview" className="flex-1 overflow-y-auto mt-4">
              {templateFormat === 'html' && htmlPreview ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Subject: <span className="font-medium text-foreground">{renderPreview(subject)}</span></p>
                  <iframe
                    srcDoc={htmlPreview}
                    className="w-full rounded-lg border"
                    style={{ height: '500px' }}
                    title="Email preview"
                  />
                </div>
              ) : (
                <Card>
                  <CardHeader className="pb-2">
                    <p className="text-xs text-muted-foreground">Subject</p>
                    <p className="font-medium">{renderPreview(subject)}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {renderPreview(body)}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={updateTemplate.isPending} className="gap-2">
              <Save className="h-4 w-4" />
              {updateTemplate.isPending ? 'Saving...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
