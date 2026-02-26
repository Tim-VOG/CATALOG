import { useState } from 'react'
import { addDays, format } from 'date-fns'
import { useCreateExtension } from '@/hooks/use-extension-requests'
import { useAuth } from '@/lib/auth'
import { useAppSettings } from '@/hooks/use-settings'
import { useUIStore } from '@/stores/ui-store'
import { sendEmail } from '@/lib/api/send-email'
import { getNotificationRecipients } from '@/lib/api/notification-recipients'
import { wrapEmailHtml, generateDetailsCard, escapeHtml } from '@/lib/email-html'
import { CalendarPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

export function ExtensionRequestDialog({ open, onOpenChange, request }) {
  const { user, profile } = useAuth()
  const createExtension = useCreateExtension()
  const { data: settings } = useAppSettings()
  const showToast = useUIStore((s) => s.showToast)

  const [days, setDays] = useState(3)
  const [reason, setReason] = useState('')

  const projectedDate = request?.return_date
    ? format(addDays(new Date(request.return_date), days), 'dd MMM yyyy')
    : ''

  const handleSubmit = async () => {
    if (!reason.trim()) {
      showToast('Please provide a reason', 'error')
      return
    }
    if (days < 1) {
      showToast('At least 1 day required', 'error')
      return
    }
    try {
      await createExtension.mutateAsync({
        request_id: request.id,
        user_id: user.id,
        requested_days: days,
        reason,
      })
      showToast('Extension request submitted')

      // Send admin notification email (fire & forget)
      const appName = settings?.app_name || 'VO Gear Hub'
      const logoUrl = settings?.logo_url || ''
      const tagline = settings?.email_tagline || ''
      const logoHeight = settings?.email_logo_height || 0
      const requesterName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || user?.email
      const currentReturn = request?.return_date ? format(new Date(request.return_date), 'dd MMM yyyy') : '—'
      const detailsCard = generateDetailsCard({
        project_name: request?.project_name || '',
        pickup_date: request?.pickup_date ? format(new Date(request.pickup_date), 'dd MMM yyyy') : '',
        return_date: currentReturn,
        return_date_new: projectedDate,
      })
      const adminBody = wrapEmailHtml(
        `<strong style="color:#f1f5f9;">${escapeHtml(requesterName)}</strong> has requested a loan extension.\n\n` +
        detailsCard + '\n\n' +
        `<div style="margin-bottom:4px;"><span style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Requested</span></div>` +
        `<span style="display:inline-block;padding:4px 12px;border-radius:6px;background:rgba(249,115,22,0.1);border:1px solid rgba(249,115,22,0.25);color:#f97316;font-weight:600;font-size:13px;">+${days} days</span>\n\n` +
        `<div style="margin-bottom:4px;"><span style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Reason</span></div>` +
        `<div style="padding:12px 16px;border-radius:8px;background:rgba(15,20,25,0.5);border:1px solid #1e293b;color:#cbd5e1;font-size:14px;font-style:italic;">${escapeHtml(reason)}</div>`,
        { appName, logoUrl, tagline, logoHeight }
      )
      getNotificationRecipients()
        .then(async (recipients) => {
          const adminEmails = (recipients || [])
            .filter((r) => r.is_active && r.notify_on_new_request)
            .map((r) => r.email)
          if (adminEmails.length > 0) {
            await sendEmail({
              to: adminEmails,
              subject: `[${appName}] Extension request: ${request?.project_name || ''} — by ${requesterName} (+${days} days)`,
              body: adminBody,
              isHtml: true,
            })
          }
        })
        .catch(() => {})

      setDays(3)
      setReason('')
      onOpenChange(false)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" /> Request Extension
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md bg-muted p-3 text-sm space-y-1">
            <p>Current return date: <strong>{request?.return_date ? format(new Date(request.return_date), 'dd MMM yyyy') : '—'}</strong></p>
            <p>Projected new date: <strong className="text-primary">{projectedDate}</strong></p>
          </div>

          <div className="space-y-1">
            <Label>Extra days requested</Label>
            <Input
              type="number"
              min={1}
              max={30}
              value={days}
              onChange={(e) => setDays(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>

          <div className="space-y-1">
            <Label>Reason *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Explain why you need extra time..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createExtension.isPending} className="gap-2">
            <CalendarPlus className="h-4 w-4" />
            {createExtension.isPending ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
