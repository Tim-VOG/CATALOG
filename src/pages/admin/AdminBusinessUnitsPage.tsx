import { useState } from 'react'
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react'
import {
  useBusinessUnits,
  useCreateBusinessUnit,
  useUpdateBusinessUnit,
  useDeleteBusinessUnit,
} from '@/hooks/use-business-units'
import type { BusinessUnit, EmailPattern } from '@/lib/api/business-units'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { useUIStore } from '@/stores/ui-store'

type FormState = {
  value: string
  domain: string
  email_pattern: EmailPattern
  sort_order: string
}

const EMPTY_FORM: FormState = {
  value: '',
  domain: '',
  email_pattern: 'initial_last',
  sort_order: '0',
}

const PATTERN_LABEL: Record<EmailPattern, string> = {
  initial_last: 'jdoe@ (first initial + last name)',
  first: 'john@ (first name)',
  initials: 'jd@ (initials)',
}

const PATTERN_EXAMPLE: Record<EmailPattern, string> = {
  initial_last: 'jdoe@',
  first: 'john@',
  initials: 'jd@',
}

export function AdminBusinessUnitsPage() {
  const { data: units = [], isLoading } = useBusinessUnits()
  const createUnit = useCreateBusinessUnit()
  const updateUnit = useUpdateBusinessUnit()
  const deleteUnit = useDeleteBusinessUnit()
  const showToast = useUIStore((s) => s.showToast)

  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<BusinessUnit | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowDialog(true)
  }

  const openEdit = (unit: BusinessUnit) => {
    setEditing(unit)
    setForm({
      value: unit.value,
      domain: unit.domain,
      email_pattern: unit.email_pattern,
      sort_order: String(unit.sort_order),
    })
    setShowDialog(true)
  }

  const handleSave = async () => {
    const value = form.value.trim().toUpperCase()
    const domain = form.domain.trim().toLowerCase()
    if (!value || !domain) {
      showToast('Name and domain are required', 'error')
      return
    }
    const payload = {
      value,
      domain,
      email_pattern: form.email_pattern,
      sort_order: Number.parseInt(form.sort_order, 10) || 0,
    }
    try {
      if (editing) {
        await updateUnit.mutateAsync({ id: editing.id, ...payload })
        showToast('Business unit updated')
      } else {
        await createUnit.mutateAsync(payload)
        showToast('Business unit created')
      }
      setShowDialog(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed'
      showToast(message, 'error')
    }
  }

  const handleDelete = async (unit: BusinessUnit) => {
    if (!confirm(`Delete "${unit.value}"?\n\nUsers and requests already linked to this BU will keep the text label but the dropdown will no longer offer it.`)) {
      return
    }
    try {
      await deleteUnit.mutateAsync(unit.id)
      showToast('Business unit deleted')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed'
      showToast(message, 'error')
    }
  }

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Business Units"
        description="Manage the list of business units and their corporate email domains. Used by onboarding forms and corporate email generation."
      >
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Add Business Unit
        </Button>
      </AdminPageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-muted/30 rounded-full px-4 py-1.5 text-sm">
          <Building2 className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold">{units.length}</span>
          <span className="text-muted-foreground">business unit{units.length === 1 ? '' : 's'}</span>
        </div>
      </div>

      {units.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No business units"
          description="Add a business unit so it shows up in onboarding forms and powers corporate email generation."
        />
      ) : (
        <Card>
          <CardContent className="p-4 space-y-2">
            {units.map((unit: any) => (
              <div
                key={unit.id}
                className="flex items-center gap-3 p-3 rounded-lg border transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{unit.value}</span>
                    <Badge className="text-[10px] bg-blue-500/20 text-blue-400">
                      {unit.domain}
                    </Badge>
                    <Badge className="text-[10px] bg-muted/50 text-muted-foreground">
                      {PATTERN_EXAMPLE[unit.email_pattern]}
                    </Badge>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    sort order: {unit.sort_order}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(unit)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => handleDelete(unit)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Business Unit' : 'Add Business Unit'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input
                value={form.value}
                onChange={(e: any) => setForm({ ...form, value: e.target.value })}
                placeholder="e.g. VO EUROPE"
              />
              <p className="text-[10px] text-muted-foreground">Displayed in onboarding forms. Stored in uppercase.</p>
            </div>
            <div className="space-y-1">
              <Label>Email domain *</Label>
              <Input
                value={form.domain}
                onChange={(e: any) => setForm({ ...form, domain: e.target.value })}
                placeholder="e.g. vo-europe.eu"
              />
              <p className="text-[10px] text-muted-foreground">Used to generate the new hire's corporate email. Stored in lowercase.</p>
            </div>
            <div className="space-y-1">
              <Label>Email pattern *</Label>
              <Select
                value={form.email_pattern}
                onChange={(e: any) => setForm({ ...form, email_pattern: e.target.value as EmailPattern })}
              >
                <option value="initial_last">{PATTERN_LABEL.initial_last}</option>
                <option value="first">{PATTERN_LABEL.first}</option>
                <option value="initials">{PATTERN_LABEL.initials}</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Sort order</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e: any) => setForm({ ...form, sort_order: e.target.value })}
              />
              <p className="text-[10px] text-muted-foreground">Lower values appear first in dropdowns.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createUnit.isPending || updateUnit.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
