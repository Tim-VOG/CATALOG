import { useState, useEffect } from 'react'
import { useProcessReturn } from '@/hooks/use-loan-requests'
import { useEmailTemplates } from '@/hooks/use-email-templates'
import { useNotificationRecipients } from '@/hooks/use-notification-recipients'
import { generateReturnDraft } from '@/lib/email-draft'
import { sendEmail } from '@/lib/api/send-email'
import { useAppSettings } from '@/hooks/use-settings'
import { useUIStore } from '@/stores/ui-store'
import { Undo2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

const CONDITIONS = [
  { value: 'good', label: 'Good', color: 'text-green-400' },
  { value: 'minor', label: 'Minor issues', color: 'text-yellow-400' },
  { value: 'damaged', label: 'Damaged', color: 'text-orange-400' },
  { value: 'lost', label: 'Lost', color: 'text-red-400' },
]

export function ReturnProcessDialog({ open, onOpenChange, request, items }) {
  const processReturn = useProcessReturn()
  const { data: templates = [] } = useEmailTemplates()
  const { data: recipients = [] } = useNotificationRecipients()
  const { data: settings } = useAppSettings()
  const showToast = useUIStore((s) => s.showToast)

  const [adminNotes, setAdminNotes] = useState('')

  // Item return states
  const [itemReturns, setItemReturns] = useState([])

  // Initialize item returns when dialog opens
  useEffect(() => {
    if (open && items.length > 0) {
      setItemReturns(
        items.map((item) => ({
          id: item.id,
          return_condition: item.return_condition || 'good',
          return_notes: item.return_notes || '',
          is_returned: item.is_returned !== false,
        }))
      )
      setAdminNotes('')
    }
  }, [open, items])

  const updateItemReturn = (itemId, field, value) => {
    setItemReturns((prev) =>
      prev.map((r) => (r.id === itemId ? { ...r, [field]: value } : r))
    )
  }

  const handleConfirmReturn = async () => {
    try {
      await processReturn.mutateAsync({
        requestId: request.id,
        itemReturns,
        admin_notes: adminNotes,
      })

      // Auto-send return confirmation email (fire & forget)
      const returnTemplate = templates.find((t) => t.template_key === 'return_confirmation')
      if (returnTemplate && returnTemplate.is_active) {
        const draft = generateReturnDraft({
          template: returnTemplate,
          request,
          items,
          itemReturns,
          recipients,
          appName: settings?.app_name || 'VO Gear Hub',
          logoUrl: settings?.logo_url || '',
        })
        if (draft.to) {
          const requestCc = request.custom_fields?.cc_emails || []
          const allCc = [...(draft.cc || []), ...requestCc].filter((e, i, a) => a.indexOf(e) === i)
          sendEmail({
            to: draft.to,
            cc: allCc.length > 0 ? allCc : undefined,
            subject: draft.subject,
            body: draft.body,
            isHtml: draft.isHtml,
          }).catch(() => {}) // non-critical
        }
      }

      showToast('Return processed — confirmation email sent')
      onOpenChange(false)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="h-5 w-5" />
            Process Return — Item Checklist
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Item checklist */}
          <div className="space-y-3">
            {items.map((item) => {
              const ret = itemReturns.find((r) => r.id === item.id) || {}
              return (
                <div key={item.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded overflow-hidden bg-muted shrink-0">
                      <img src={item.product_image} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">&times; {item.quantity}</p>
                      {item.product_includes?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.product_includes.map((inc) => (
                            <Badge key={inc} variant="outline" className="text-[10px]">{inc}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <label className="flex items-center gap-2 shrink-0">
                      <Checkbox
                        checked={ret.is_returned !== false}
                        onCheckedChange={(v) => updateItemReturn(item.id, 'is_returned', v)}
                      />
                      <span className="text-xs">Returned</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Condition</Label>
                      <Select
                        value={ret.return_condition || 'good'}
                        onChange={(e) => updateItemReturn(item.id, 'return_condition', e.target.value)}
                      >
                        {CONDITIONS.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Notes</Label>
                      <Input
                        value={ret.return_notes || ''}
                        onChange={(e) => updateItemReturn(item.id, 'return_notes', e.target.value)}
                        placeholder="Any issues..."
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="space-y-1">
            <Label>Admin Notes</Label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={2}
              placeholder="Overall return notes..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="success"
            onClick={handleConfirmReturn}
            disabled={processReturn.isPending}
            className="gap-2"
          >
            <Check className="h-4 w-4" />
            {processReturn.isPending ? 'Processing...' : 'Confirm Return'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
