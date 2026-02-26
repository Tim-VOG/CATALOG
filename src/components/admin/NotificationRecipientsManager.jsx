import { useState } from 'react'
import { useNotificationRecipients, useCreateNotificationRecipient, useUpdateNotificationRecipient, useDeleteNotificationRecipient } from '@/hooks/use-notification-recipients'
import { Plus, Trash2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { useUIStore } from '@/stores/ui-store'

export function NotificationRecipientsManager() {
  const { data: recipients = [], isLoading } = useNotificationRecipients()
  const createRecipient = useCreateNotificationRecipient()
  const updateRecipient = useUpdateNotificationRecipient()
  const deleteRecipient = useDeleteNotificationRecipient()
  const showToast = useUIStore((s) => s.showToast)

  const [showRecipientDialog, setShowRecipientDialog] = useState(false)
  const [recipientForm, setRecipientForm] = useState({ email: '', name: '' })

  const handleAddRecipient = async () => {
    if (!recipientForm.email.trim()) {
      showToast('Email is required', 'error')
      return
    }
    try {
      await createRecipient.mutateAsync(recipientForm)
      showToast('Recipient added')
      setShowRecipientDialog(false)
      setRecipientForm({ email: '', name: '' })
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleToggleRecipientNotif = async (recipient, key) => {
    try {
      await updateRecipient.mutateAsync({ id: recipient.id, [key]: !recipient[key] })
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleDeleteRecipient = async (id) => {
    if (!confirm('Remove this recipient?')) return
    try {
      await deleteRecipient.mutateAsync(id)
      showToast('Recipient removed')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  if (isLoading) return <PageLoading />

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="h-5 w-5" /> Notification Recipients
            </CardTitle>
            <Button size="sm" onClick={() => setShowRecipientDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Add Recipient
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            These email addresses receive notifications for order events.
          </p>
        </CardHeader>
        <CardContent>
          {recipients.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground text-sm">No recipients configured</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead className="text-center">New Request</TableHead>
                  <TableHead className="text-center">Status Change</TableHead>
                  <TableHead className="text-center">Return</TableHead>
                  <TableHead className="w-16">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipients.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium text-sm">{r.name || r.email}</div>
                      {r.name && <div className="text-xs text-muted-foreground">{r.email}</div>}
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={r.notify_on_new_request}
                        onCheckedChange={() => handleToggleRecipientNotif(r, 'notify_on_new_request')}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={r.notify_on_status_change}
                        onCheckedChange={() => handleToggleRecipientNotif(r, 'notify_on_status_change')}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={r.notify_on_return}
                        onCheckedChange={() => handleToggleRecipientNotif(r, 'notify_on_return')}
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteRecipient(r.id)} aria-label={`Remove ${r.email}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recipient Dialog */}
      <Dialog open={showRecipientDialog} onOpenChange={setShowRecipientDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Notification Recipient</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Email *</Label>
              <Input
                type="email"
                value={recipientForm.email}
                onChange={(e) => setRecipientForm({ ...recipientForm, email: e.target.value })}
                placeholder="user@company.com"
              />
            </div>
            <div className="space-y-1">
              <Label>Name (optional)</Label>
              <Input
                value={recipientForm.name}
                onChange={(e) => setRecipientForm({ ...recipientForm, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecipientDialog(false)}>Cancel</Button>
            <Button onClick={handleAddRecipient}>Add Recipient</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
