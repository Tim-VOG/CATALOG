import { useState } from 'react'
import { addDays, format } from 'date-fns'
import { useApproveExtension, useRejectExtension } from '@/hooks/use-extension-requests'
import { useLoanRequest } from '@/hooks/use-loan-requests'
import { useAppSettings } from '@/hooks/use-settings'
import { useUIStore } from '@/stores/ui-store'
import { sendEmail } from '@/lib/api/send-email'
import { getEmailTemplateByKey } from '@/lib/api/email-templates'
import { generateExtensionEmailDraft } from '@/lib/email-draft'
import { Check, X, CalendarPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

export function ExtensionApprovalDialog({ open, onOpenChange, extension }) {
  const approveExtension = useApproveExtension()
  const rejectExtension = useRejectExtension()
  const { data: loanRequest } = useLoanRequest(extension?.request_id)
  const { data: settings } = useAppSettings()
  const showToast = useUIStore((s) => s.showToast)
  const ccEmails = loanRequest?.custom_fields?.cc_emails || []

  const [grantedDays, setGrantedDays] = useState(extension?.requested_days || 3)
  const [adminNotes, setAdminNotes] = useState('')

  const projectedDate = extension?.return_date
    ? format(addDays(new Date(extension.return_date), grantedDays), 'dd MMM yyyy')
    : ''

  const appName = settings?.app_name || 'VO Gear Hub'
  const logoUrl = settings?.logo_url || ''
  const commentValid = adminNotes.trim().length > 0

  // Send extension decision email (fire & forget)
  const sendExtensionEmail = async (templateKey, updatedExtension) => {
    try {
      const template = await getEmailTemplateByKey(templateKey)
      if (!template || !template.is_active) return
      const draft = generateExtensionEmailDraft({
        template,
        extension: updatedExtension,
        appName,
        logoUrl,
      })
      if (draft.to) {
        sendEmail({ to: draft.to, cc: ccEmails.length > 0 ? ccEmails : undefined, subject: draft.subject, body: draft.body, isHtml: draft.isHtml })
      }
    } catch {
      // Email is non-critical
    }
  }

  const handleApprove = async () => {
    try {
      await approveExtension.mutateAsync({
        id: extension.id,
        granted_days: grantedDays,
        admin_notes: adminNotes,
      })

      // Send approval email with the full extension data
      sendExtensionEmail('extension_approved', {
        ...extension,
        status: 'approved',
        granted_days: grantedDays,
        admin_notes: adminNotes,
      })

      showToast(`Extension approved — ${grantedDays} extra days`)
      onOpenChange(false)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleReject = async () => {
    try {
      await rejectExtension.mutateAsync({
        id: extension.id,
        admin_notes: adminNotes,
      })

      // Send rejection email
      sendExtensionEmail('extension_rejected', {
        ...extension,
        status: 'rejected',
        admin_notes: adminNotes,
      })

      showToast('Extension rejected')
      onOpenChange(false)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  if (!extension) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" /> Review Extension Request
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md bg-muted p-3 text-sm space-y-1.5">
            <p><span className="text-muted-foreground">User:</span> <strong>{extension.user_first_name} {extension.user_last_name}</strong></p>
            <p><span className="text-muted-foreground">Project:</span> <strong>{extension.project_name}</strong></p>
            <p><span className="text-muted-foreground">Current return:</span> <strong>{extension.return_date ? format(new Date(extension.return_date), 'dd MMM yyyy') : '—'}</strong></p>
            <p><span className="text-muted-foreground">Requested:</span> <strong>{extension.requested_days} extra days</strong></p>
          </div>

          <div className="rounded-md bg-muted/50 border p-3 text-sm">
            <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Reason</p>
            <p>{extension.reason}</p>
          </div>

          <div className="space-y-1">
            <Label>Days to grant</Label>
            <Input
              type="number"
              min={1}
              max={30}
              value={grantedDays}
              onChange={(e) => setGrantedDays(Math.max(1, parseInt(e.target.value) || 1))}
            />
            <p className="text-xs text-muted-foreground">
              New return date: <strong className="text-primary">{projectedDate}</strong>
            </p>
          </div>

          <div className="space-y-1">
            <Label>Comment (required) <span className="text-destructive">*</span></Label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={2}
              placeholder="Justify your decision — this will be sent to the user..."
            />
            {!commentValid && adminNotes.length > 0 && (
              <p className="text-xs text-destructive">A comment is required to approve or reject.</p>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={rejectExtension.isPending || !commentValid}
            className="gap-1"
          >
            <X className="h-4 w-4" /> Reject
          </Button>
          <Button
            variant="success"
            onClick={handleApprove}
            disabled={approveExtension.isPending || !commentValid}
            className="gap-1"
          >
            <Check className="h-4 w-4" /> Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
