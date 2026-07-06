import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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

const PATTERN_EXAMPLE: Record<EmailPattern, string> = {
  initial_last: 'jdoe@',
  first: 'john@',
  initials: 'jd@',
}

export function AdminBusinessUnitsPage() {
  const { t } = useTranslation()
  const { data: units = [], isLoading } = useBusinessUnits()
  const createUnit = useCreateBusinessUnit()
  const updateUnit = useUpdateBusinessUnit()
  const deleteUnit = useDeleteBusinessUnit()
  const showToast = useUIStore((s: any) => s.showToast)

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
      showToast(t('admin.businessUnits.nameDomainRequired'), 'error')
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
        showToast(t('admin.businessUnits.updated'))
      } else {
        await createUnit.mutateAsync(payload)
        showToast(t('admin.businessUnits.created'))
      }
      setShowDialog(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : t('admin.businessUnits.saveFailed')
      showToast(message, 'error')
    }
  }

  const handleDelete = async (unit: BusinessUnit) => {
    if (!confirm(t('admin.businessUnits.confirmDelete', { name: unit.value }))) {
      return
    }
    try {
      await deleteUnit.mutateAsync(unit.id)
      showToast(t('admin.businessUnits.deleted'))
    } catch (err) {
      const message = err instanceof Error ? err.message : t('admin.businessUnits.deleteFailed')
      showToast(message, 'error')
    }
  }

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t('admin.businessUnits.title')}
        description={t('admin.businessUnits.description')}
      >
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> {t('admin.businessUnits.add')}
        </Button>
      </AdminPageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-muted/30 rounded-full px-4 py-1.5 text-sm">
          <Building2 className="h-3.5 w-3.5 text-primary" />
          <span className="text-muted-foreground">{t('admin.businessUnits.count', { count: units.length })}</span>
        </div>
      </div>

      {units.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={t('admin.businessUnits.empty')}
          description={t('admin.businessUnits.emptyDesc')}
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
                      {(PATTERN_EXAMPLE as Record<string, any>)[unit.email_pattern]}
                    </Badge>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {t('admin.businessUnits.sortOrder', { n: unit.sort_order })}
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
            <DialogTitle>{editing ? t('admin.businessUnits.edit') : t('admin.businessUnits.add')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>{t('admin.businessUnits.name')} *</Label>
              <Input
                value={form.value}
                onChange={(e: any) => setForm({ ...form, value: e.target.value })}
                placeholder={t('admin.businessUnits.namePlaceholder')}
              />
              <p className="text-[10px] text-muted-foreground">{t('admin.businessUnits.nameHelp')}</p>
            </div>
            <div className="space-y-1">
              <Label>{t('admin.businessUnits.domain')} *</Label>
              <Input
                value={form.domain}
                onChange={(e: any) => setForm({ ...form, domain: e.target.value })}
                placeholder={t('admin.businessUnits.domainPlaceholder')}
              />
              <p className="text-[10px] text-muted-foreground">{t('admin.businessUnits.domainHelp')}</p>
            </div>
            <div className="space-y-1">
              <Label>{t('admin.businessUnits.pattern')} *</Label>
              <Select
                value={form.email_pattern}
                onChange={(e: any) => setForm({ ...form, email_pattern: e.target.value as EmailPattern })}
              >
                <option value="initial_last">{t('admin.businessUnits.patternInitialLast')}</option>
                <option value="first">{t('admin.businessUnits.patternFirst')}</option>
                <option value="initials">{t('admin.businessUnits.patternInitials')}</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t('admin.businessUnits.sortOrderLabel')}</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e: any) => setForm({ ...form, sort_order: e.target.value })}
              />
              <p className="text-[10px] text-muted-foreground">{t('admin.businessUnits.sortOrderHelp')}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>{t('admin.businessUnits.cancel')}</Button>
            <Button onClick={handleSave} disabled={createUnit.isPending || updateUnit.isPending}>
              {t('admin.businessUnits.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
