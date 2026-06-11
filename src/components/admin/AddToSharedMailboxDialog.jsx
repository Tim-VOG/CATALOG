import { useState, useEffect } from 'react'
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
export function AddToSharedMailboxDialog({ request, open, onClose, onCreated }) {
  const createMailbox = useCreateSharedMailbox()
  const showToast = useUIStore((s) => s.showToast)

  const [form, setForm] = useState({
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

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

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
      showToast('Mailbox added to Shared Mailboxes inventory')
      onCreated?.(created)
      onClose?.()
    } catch (err) {
      showToast(err.message || 'Failed to add to inventory', 'error')
    }
  }

  // Pre-filled readonly summary
  const prefilled = [
    ['Name', request.project_name],
    ['Mail', request.email_to_create],
    ['Company', request.agency],
    ['Display name', request.display_name],
    ['Project leader', request.project_leader],
    ['Job title', request.signature_title],
    ['Access', request.who_needs_access],
    ['Archive to', request.archive_date],
    ['Delete on', request.deletion_date],
  ].filter(([, v]) => v)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-violet-600" />
            Add to Shared Mailboxes inventory
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">
            The mailbox creation request is fulfilled — let's log it in the FMB inventory so it's
            tracked alongside the rest. The fields below come from the request; you only need to
            fill in the IT-side decisions.
          </p>

          {/* Pre-filled section */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              From the request (auto-filled)
            </div>
            {prefilled.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No data captured from the request.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {prefilled.map(([label, value]) => (
                  <div key={label} className="flex items-start gap-2">
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
              IT side decisions
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Category *</Label>
                <Select value={form.category} onChange={(e) => setField('category', e.target.value)}>
                  {CATEGORIES.map((o) => <option key={o} value={o}>{o}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Licence *</Label>
                <Select value={form.licence} onChange={(e) => setField('licence', e.target.value)}>
                  {LICENCES.map((o) => <option key={o} value={o}>{o}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Created in</Label>
                <Select value={form.created_in} onChange={(e) => setField('created_in', e.target.value)}>
                  {CREATED_IN.map((o) => <option key={o} value={o}>{o}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Profile</Label>
                <Select value={form.profile} onChange={(e) => setField('profile', e.target.value)}>
                  {PROFILES.map((o) => <option key={o} value={o}>{o}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Archive from (optional)</Label>
                <Input
                  type="date"
                  value={form.archive_from}
                  onChange={(e) => setField('archive_from', e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground">Date when archiving the mailbox should begin.</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={createMailbox.isPending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMailbox.isPending} className="gap-2">
            {createMailbox.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Add to inventory
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
