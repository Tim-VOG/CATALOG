import { useState, useEffect } from 'react'
import { useProcessReturn } from '@/hooks/use-loan-requests'
import { useEmailTemplates } from '@/hooks/use-email-templates'
import { useNotificationRecipients } from '@/hooks/use-notification-recipients'
import { generateReturnDraft } from '@/lib/email-draft'
import { useUIStore } from '@/stores/ui-store'
import { Undo2, Check, Copy, ChevronRight, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  const showToast = useUIStore((s) => s.showToast)

  const [step, setStep] = useState(1)
  const [adminNotes, setAdminNotes] = useState('')
  const [emailDraft, setEmailDraft] = useState(null)

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
      setStep(1)
      setAdminNotes('')
      setEmailDraft(null)
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

      // Generate email draft
      const returnTemplate = templates.find((t) => t.template_key === 'return_confirmation')
      const draft = generateReturnDraft({
        template: returnTemplate,
        request,
        items,
        itemReturns,
        recipients,
      })
      setEmailDraft(draft)
      setStep(2)
      showToast('Return processed successfully')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleCopyEmail = () => {
    if (!emailDraft) return
    const text = [
      `To: ${emailDraft.to}`,
      emailDraft.cc.length > 0 ? `CC: ${emailDraft.cc.join(', ')}` : null,
      `Subject: ${emailDraft.subject}`,
      '',
      emailDraft.body,
    ]
      .filter((line) => line !== null)
      .join('\n')

    navigator.clipboard.writeText(text)
    showToast('Email draft copied to clipboard')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="h-5 w-5" />
            Process Return — {step === 1 ? 'Item Checklist' : 'Email Draft'}
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <>
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
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <p className="text-sm text-muted-foreground">
                Return has been processed. Copy the email draft below and send it manually.
              </p>

              {emailDraft && (
                <Card>
                  <CardHeader className="pb-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Email Draft</CardTitle>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={handleCopyEmail}>
                        <Copy className="h-3.5 w-3.5" /> Copy to Clipboard
                      </Button>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-muted-foreground">To:</span> {emailDraft.to}</p>
                      {emailDraft.cc.length > 0 && (
                        <p><span className="text-muted-foreground">CC:</span> {emailDraft.cc.join(', ')}</p>
                      )}
                      <p><span className="text-muted-foreground">Subject:</span> {emailDraft.subject}</p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {emailDraft.isHtml ? (
                      <iframe
                        srcDoc={emailDraft.body}
                        className="w-full rounded-md border"
                        style={{ height: '400px' }}
                        title="Email preview"
                      />
                    ) : (
                      <div className="rounded-md bg-muted p-4 whitespace-pre-wrap text-sm leading-relaxed font-mono">
                        {emailDraft.body}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
