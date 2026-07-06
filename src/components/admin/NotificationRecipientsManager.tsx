import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const { data: recipients = [], isLoading } = useNotificationRecipients()
  const createRecipient = useCreateNotificationRecipient()
  const updateRecipient = useUpdateNotificationRecipient()
  const deleteRecipient = useDeleteNotificationRecipient()
  const showToast = useUIStore((s: any) => s.showToast)

  const [showRecipientDialog, setShowRecipientDialog] = useState(false)
  const [recipientForm, setRecipientForm] = useState<any>({ email: '', name: '' })

  const handleAddRecipient = async () => {
    if (!recipientForm.email.trim()) {
      showToast(t('comp.notifRecipients.emailRequired'), 'error')
      return
    }
    try {
      await createRecipient.mutateAsync(recipientForm)
      showToast(t('comp.notifRecipients.recipientAdded'))
      setShowRecipientDialog(false)
      setRecipientForm({ email: '', name: '' })
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  const handleToggleRecipientNotif = async (recipient: any, key: any) => {
    try {
      await updateRecipient.mutateAsync({ id: recipient.id, [key]: !recipient[key] })
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  const handleDeleteRecipient = async (id: any) => {
    if (!confirm(t('comp.notifRecipients.confirmRemove'))) return
    try {
      await deleteRecipient.mutateAsync(id)
      showToast(t('comp.notifRecipients.recipientRemoved'))
    } catch (err: any) {
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
              <Mail className="h-5 w-5" /> {t('comp.notifRecipients.title')}
            </CardTitle>
            <Button size="sm" onClick={() => setShowRecipientDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" /> {t('comp.notifRecipients.addRecipient')}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('comp.notifRecipients.description')}
          </p>
        </CardHeader>
        <CardContent>
          {recipients.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground text-sm">{t('comp.notifRecipients.noRecipients')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('comp.notifRecipients.recipient')}</TableHead>
                  <TableHead className="text-center">{t('comp.notifRecipients.newRequest')}</TableHead>
                  <TableHead className="text-center">{t('comp.notifRecipients.statusChange')}</TableHead>
                  <TableHead className="text-center">{t('comp.notifRecipients.return')}</TableHead>
                  <TableHead className="w-16">{t('comp.notifRecipients.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipients.map((r: any) => (
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
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteRecipient(r.id)} aria-label={t('comp.notifRecipients.removeAriaLabel', { email: r.email })}>
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
            <DialogTitle>{t('comp.notifRecipients.addDialogTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>{t('comp.notifRecipients.emailLabel')}</Label>
              <Input
                type="email"
                value={recipientForm.email}
                onChange={(e: any) => setRecipientForm({ ...recipientForm, email: e.target.value })}
                placeholder={t('comp.notifRecipients.emailPlaceholder')}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('comp.notifRecipients.nameLabel')}</Label>
              <Input
                value={recipientForm.name}
                onChange={(e: any) => setRecipientForm({ ...recipientForm, name: e.target.value })}
                placeholder={t('comp.notifRecipients.namePlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecipientDialog(false)}>{t('comp.notifRecipients.cancel')}</Button>
            <Button onClick={handleAddRecipient}>{t('comp.notifRecipients.addRecipient')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
