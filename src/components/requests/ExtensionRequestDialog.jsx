import { useState } from 'react'
import { addDays, format } from 'date-fns'
import { useCreateExtension } from '@/hooks/use-extension-requests'
import { useAuth } from '@/lib/auth'
import { useUIStore } from '@/stores/ui-store'
import { CalendarPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

export function ExtensionRequestDialog({ open, onOpenChange, request }) {
  const { user } = useAuth()
  const createExtension = useCreateExtension()
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
