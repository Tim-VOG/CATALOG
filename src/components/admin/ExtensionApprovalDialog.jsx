import { useState } from 'react'
import { addDays, format } from 'date-fns'
import { useApproveExtension, useRejectExtension } from '@/hooks/use-extension-requests'
import { useUIStore } from '@/stores/ui-store'
import { Check, X, CalendarPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

export function ExtensionApprovalDialog({ open, onOpenChange, extension }) {
  const approveExtension = useApproveExtension()
  const rejectExtension = useRejectExtension()
  const showToast = useUIStore((s) => s.showToast)

  const [grantedDays, setGrantedDays] = useState(extension?.requested_days || 3)
  const [adminNotes, setAdminNotes] = useState('')

  const projectedDate = extension?.return_date
    ? format(addDays(new Date(extension.return_date), grantedDays), 'dd MMM yyyy')
    : ''

  const handleApprove = async () => {
    try {
      await approveExtension.mutateAsync({
        id: extension.id,
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
            <Label>Admin notes (optional)</Label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={2}
              placeholder="Notes about this decision..."
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="destructive" onClick={handleReject} disabled={rejectExtension.isPending} className="gap-1">
            <X className="h-4 w-4" /> Reject
          </Button>
          <Button variant="success" onClick={handleApprove} disabled={approveExtension.isPending} className="gap-1">
            <Check className="h-4 w-4" /> Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
