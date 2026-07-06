import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Mail, Loader2 } from 'lucide-react'
import { useCreateSharedMailbox } from '@/hooks/use-shared-mailboxes'
import { useUIStore } from '@/stores/ui-store'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

const CATEGORIES = ['LEGER', 'MOYEN', 'LOURD']
const LICENCES = ['SHARED MAILBOX', 'Plan 1', 'O365 Premium', 'ARCHIVED']
const PROFILES = ['WORK MAILBOX', 'ARCHIVED', 'EMPLOYEE']
const CREATED_IN = ['AD', 'Cloud']

/**
 * Add-to-FMB-inventory dialog.
 *
 * Opens with the data from a freshly-fulfilled mailbox_request pre-mapped
 * onto the shared_mailboxes columns. The admin only needs to fill the
 * four IT-side decisions (category, licence, created_in, profile) plus
 * an optional archive_from date before clicking 'Add to inventory'.
 *
 * Props:
 *   request      — mailbox_requests row used to pre-fill
 *   open         — controlled visibility
 *   onClose      — called on cancel / esc
 *   onCreated    — called with the new shared_mailbox row on success
 */
export function AddToSharedMailboxDialog({ request, open, onClose, onCreated  }: any) {
  const { t } = useTranslation()
  const createMailbox = useCreateSharedMailbox()
  const showToast = useUIStore((s: any) => s.showToast)

  const [form, setForm] = useState<any>({
    category: 'LEGER',
    licence: 'SHARED MAILBOX',
    created_in: 'AD',
    profile: 'WORK MAILBOX',
    archive_from: '',
  })

  // Reset the IT-side defaults each time the dialog re-opens for a new request
  useEffect(() => {
    if (!open) return
    setForm({
      category: 'LEGER',
      licence: 'SHARED MAILBOX',
      created_in: 'AD',
      profile: 'WORK MAILBOX',
      archive_from: '',
    })
  }, [open, request?.id])

  if (!request) return null

  const setField = (key: any, value: any) => setForm((prev: any) => ({ ...prev, [key]: value }))

  const handleSubmit = async () => {
    try {
      // Map the request → shared_mailboxes columns
      const row = {
        name: request.project_name || 'Untitled mailbox',
        mail: request.email_to_create || null,
        company: request.agency || null,
        category: form.category || null,
        created_in: form.created_in || null,
        created_time: request.creation_date ? new Date(request.creation_date).toISOString() : new Date().toISOString(),
        archive_from: form.archive_from || null,
        archive_to: request.archive_date || null,
        delete_on: request.deletion_date || null,
        display_name: request.display_name || null,
        have_access: request.who_needs_access || null,
        job_title: request.signature_title || null,
        licence: form.licence || null,
        licence_checked: false,
        profile: form.profile || null,
        project_leader: request.project_leader || null,
        notes: request.admin_notes || request.more_info || null,
      }
      const created = await createMailbox.mutateAsync(row)
      showToast(t('comp.addSharedMailbox.toastSuccess'))
      onCreated?.(created)
      onClose?.()
    } catch (err: any) {
      showToast(err.message || t('comp.addSharedMailbox.toastError'), 'error')
    }
  }

  // Pre-filled readonly summary
  const prefilled = [
    ['name', t('comp.addSharedMailbox.fieldName'), request.project_name],
    ['mail', t('comp.addSharedMailbox.fieldMail'), request.email_to_create],
    ['company', t('comp.addSharedMailbox.fieldCompany'), request.agency],
    ['displayName', t('comp.addSharedMailbox.fieldDisplayName'), request.display_name],
    ['projectLeader', t('comp.addSharedMailbox.fieldProjectLeader'), request.project_leader],
    ['jobTitle', t('comp.addSharedMailbox.fieldJobTitle'), request.signature_title],
    ['access', t('comp.addSharedMailbox.fieldAccess'), request.who_needs_access],
    ['archiveTo', t('comp.addSharedMailbox.fieldArchiveTo'), request.archive_date],
    ['deleteOn', t('comp.addSharedMailbox.fieldDeleteOn'), request.deletion_date],
  ].filter(([, , v]) => v)

  return (
    <Dialog open={open} onOpenChange={(v: any) => !v && onClose?.()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-violet-600" />
            {t('comp.addSharedMailbox.dialogTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">
            {t('comp.addSharedMailbox.introText')}
          </p>

          {/* Pre-filled section */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {t('comp.addSharedMailbox.fromRequestLabel')}
            </div>
            {prefilled.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">{t('comp.addSharedMailbox.noDataCaptured')}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {prefilled.map(([key, label, value]) => (
                  <div key={key} className="flex items-start gap-2">
                    <span className="text-muted-foreground w-24 shrink-0">{label}</span>
                    <span className="text-foreground break-all">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* IT-side decisions */}
          <div className="space-y-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('comp.addSharedMailbox.itSideDecisions')}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t('comp.addSharedMailbox.categoryLabel')}</Label>
                <Select value={form.category} onChange={(e: any) => setField('category', e.target.value)}>
                  {CATEGORIES.map((o: any) => <option key={o} value={o}>{o}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('comp.addSharedMailbox.licenceLabel')}</Label>
                <Select value={form.licence} onChange={(e: any) => setField('licence', e.target.value)}>
                  {LICENCES.map((o: any) => <option key={o} value={o}>{o}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('comp.addSharedMailbox.createdInLabel')}</Label>
                <Select value={form.created_in} onChange={(e: any) => setField('created_in', e.target.value)}>
                  {CREATED_IN.map((o: any) => <option key={o} value={o}>{o}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('comp.addSharedMailbox.profileLabel')}</Label>
                <Select value={form.profile} onChange={(e: any) => setField('profile', e.target.value)}>
                  {PROFILES.map((o: any) => <option key={o} value={o}>{o}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">{t('comp.addSharedMailbox.archiveFromLabel')}</Label>
                <Input
                  type="date"
                  value={form.archive_from}
                  onChange={(e: any) => setField('archive_from', e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground">{t('comp.addSharedMailbox.archiveFromHelp')}</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={createMailbox.isPending}>{t('comp.addSharedMailbox.cancelButton')}</Button>
          <Button onClick={handleSubmit} disabled={createMailbox.isPending} className="gap-2">
            {createMailbox.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('comp.addSharedMailbox.addButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
