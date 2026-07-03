import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useOffboardingFormFields,
  useCreateOffboardingField,
  useUpdateOffboardingField,
  useDeleteOffboardingField,
} from '@/hooks/use-offboarding'
import { useUIStore } from '@/stores/ui-store'
import {
  Settings, Plus, GripVertical, Pencil, Trash2, Lock,
  Eye, EyeOff, ChevronRight, AlertCircle, Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { cn } from '@/lib/utils'

// Note: `label` below holds the i18n key suffix (admin.offboardingFormBuilder.<label>), not display text.
const FIELD_TYPES = [
  { value: 'text', label: 'fieldTypeText' },
  { value: 'textarea', label: 'fieldTypeTextarea' },
  { value: 'select', label: 'fieldTypeSelect' },
  { value: 'multi_select', label: 'fieldTypeMultiSelect' },
  { value: 'date', label: 'fieldTypeDate' },
  { value: 'checkbox', label: 'fieldTypeCheckbox' },
  { value: 'toggle', label: 'fieldTypeToggle' },
]

const STEPS = [
  { value: 'general', label: 'stepGeneral' },
  { value: 'it-revocation', label: 'stepItRevocation' },
  { value: 'equipment', label: 'stepEquipment' },
  { value: 'exit', label: 'stepExit' },
]

const OPERATORS = [
  { value: 'equals', label: 'operatorEquals' },
  { value: 'not_equals', label: 'operatorNotEquals' },
  { value: 'contains', label: 'operatorContains' },
  { value: 'is_true', label: 'operatorIsTrue' },
  { value: 'is_false', label: 'operatorIsFalse' },
]

const TYPE_COLORS = {
  text: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  textarea: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  select: 'bg-violet-500/15 text-violet-600 border-violet-500/30',
  multi_select: 'bg-violet-500/15 text-violet-600 border-violet-500/30',
  date: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  checkbox: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  toggle: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
}

const STEP_COLORS = {
  general: 'bg-primary/15 text-primary border-primary/30',
  'it-revocation': 'bg-cyan-500/15 text-cyan-600 border-cyan-500/30',
  equipment: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  exit: 'bg-gray-500/15 text-gray-600 border-gray-500/30',
}

function generateFieldKey(label: any) {
  return (label || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 50)
}

const EMPTY_FIELD = {
  label: '',
  field_key: '',
  field_type: 'text',
  step: 'general',
  placeholder: '',
  help_text: '',
  is_required: false,
  options: [],
  condition_field: '',
  condition_operator: '',
  condition_value: '',
  is_active: true,
}

// ── Field row component (no drag) ──
function FieldRow({ field, allFields, onEdit, onDelete, onToggleActive  }: any) {
  const { t } = useTranslation()
  const hasCondition = !!field.condition_field
  const conditionField = hasCondition ? allFields.find((f: any) => f.field_key === field.condition_field) : null

  const fieldTypeInfo = FIELD_TYPES.find((x: any) => x.value === field.field_type)
  const fieldTypeLabel = fieldTypeInfo
    ? t(`admin.offboardingFormBuilder.${fieldTypeInfo.label}`, { defaultValue: field.field_type })
    : field.field_type

  const stepInfo = STEPS.find((s: any) => s.value === field.step)
  const stepLabel = stepInfo
    ? t(`admin.offboardingFormBuilder.${stepInfo.label}`, { defaultValue: field.step })
    : field.step

  return (
    <Card variant="elevated" className={cn('transition-all', !field.is_active && 'opacity-50')}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-3">
          {/* Static grip icon (visual only, no drag) */}
          <div className="shrink-0 p-1">
            <GripVertical className="h-4 w-4 text-muted-foreground/20" />
          </div>

          {/* Field info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{field.label}</span>
              {field.is_system && (
                <Lock className="h-3 w-3 text-muted-foreground/50" />
              )}
              <Badge variant="outline" className={cn('text-[10px]', (TYPE_COLORS as Record<string, any>)[field.field_type] || '')}>
                {fieldTypeLabel}
              </Badge>
              <Badge variant="outline" className={cn('text-[10px]', (STEP_COLORS as Record<string, any>)[field.step] || '')}>
                {stepLabel}
              </Badge>
              {field.is_required && (
                <Badge variant="outline" className="text-[10px] bg-destructive/15 text-destructive border-destructive/30">
                  {t('admin.offboardingFormBuilder.required')}
                </Badge>
              )}
              {hasCondition && (
                <Badge variant="outline" className="text-[10px] bg-amber-500/15 text-amber-600 border-amber-500/30 gap-1">
                  <Zap className="h-2.5 w-2.5" />
                  {conditionField?.label || field.condition_field} {field.condition_operator} {field.condition_value || ''}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              <code className="text-[10px] bg-muted px-1 py-0.5 rounded">{field.field_key}</code>
              {field.help_text && <span className="ml-2">{field.help_text}</span>}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <Switch
              checked={field.is_active}
              onCheckedChange={() => onToggleActive(field)}
              className="scale-75"
            />
            <Button variant="ghost" size="sm" onClick={() => onEdit(field)} className="h-8 w-8 p-0">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            {!field.is_system && (
              <Button variant="ghost" size="sm" onClick={() => onDelete(field)} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function AdminOffboardingFormBuilderPage() {
  const { t } = useTranslation()
  const { data: fields = [], isLoading } = useOffboardingFormFields()
  const createField = useCreateOffboardingField()
  const updateField = useUpdateOffboardingField()
  const deleteField = useDeleteOffboardingField()
  const showToast = useUIStore((s: any) => s.showToast)

  const [editDialog, setEditDialog] = useState<any>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null)
  const [optionsText, setOptionsText] = useState('')

  // Group fields by step for display
  const groupedFields = useMemo(() => {
    const groups: Record<string, any> = {}
    for (const step of STEPS) {
      groups[step.value] = fields.filter((f: any) => f.step === step.value)
    }
    return groups
  }, [fields])

  // ── Open add dialog ──
  const handleAdd = () => {
    setEditDialog({ ...EMPTY_FIELD, _isNew: true })
    setOptionsText('')
  }

  // ── Open edit dialog ──
  const handleEdit = (field: any) => {
    setEditDialog({
      ...field,
      options: field.options || [],
      condition_field: field.condition_field || '',
      condition_operator: field.condition_operator || '',
      condition_value: field.condition_value || '',
      _isNew: false,
    })
    setOptionsText(
      Array.isArray(field.options) ? field.options.join('\n') : ''
    )
  }

  // ── Save field ──
  const handleSave = async () => {
    if (!editDialog) return
    const { _isNew, id, created_at, updated_at, ...payload } = editDialog

    // Parse options from text
    if (['select', 'multi_select'].includes(payload.field_type)) {
      payload.options = optionsText
        .split('\n')
        .map((s: any) => s.trim())
        .filter(Boolean)
    } else {
      payload.options = []
    }

    // Auto-generate field_key for new fields
    if (_isNew && !payload.field_key) {
      payload.field_key = generateFieldKey(payload.label)
    }

    // Clean up empty condition
    if (!payload.condition_field) {
      payload.condition_field = null
      payload.condition_operator = null
      payload.condition_value = null
    }

    // Set sort_order for new fields
    if (_isNew) {
      payload.sort_order = (fields.length + 1) * 10
    }

    try {
      if (_isNew) {
        await createField.mutateAsync(payload)
        showToast(t('admin.offboardingFormBuilder.fieldCreated'))
      } else {
        // System fields: restrict what can be edited
        const updates = editDialog.is_system
          ? {
              label: payload.label,
              help_text: payload.help_text,
              is_required: payload.is_required,
              is_active: payload.is_active,
              placeholder: payload.placeholder,
              condition_field: payload.condition_field,
              condition_operator: payload.condition_operator,
              condition_value: payload.condition_value,
            }
          : payload
        await updateField.mutateAsync({ id, ...updates })
        showToast(t('admin.offboardingFormBuilder.fieldUpdated'))
      }
      setEditDialog(null)
    } catch (err: any) {
      showToast(err.message || t('admin.offboardingFormBuilder.saveFailed'), 'error')
    }
  }

  // ── Toggle active ──
  const handleToggleActive = async (field: any) => {
    try {
      await updateField.mutateAsync({ id: field.id, is_active: !field.is_active })
    } catch (err: any) {
      showToast(err.message || t('admin.offboardingFormBuilder.toggleFailed'), 'error')
    }
  }

  // ── Delete ──
  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      await deleteField.mutateAsync(deleteConfirm.id)
      showToast(t('admin.offboardingFormBuilder.fieldDeleted'))
    } catch (err: any) {
      showToast(err.message || t('admin.offboardingFormBuilder.deleteFailed'), 'error')
    }
    setDeleteConfirm(null)
  }

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-6">
      {/* Header */}
      <AdminPageHeader
        title={t('admin.offboardingFormBuilder.title')}
        description={t('admin.offboardingFormBuilder.formBuilderSummary', { count: fields.length })}
      >
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('admin.offboardingFormBuilder.addField')}
        </Button>
      </AdminPageHeader>

      {/* Fields list grouped by step */}
      {STEPS.map((step: any) => {
        const stepFields = groupedFields[step.value] || []
        if (stepFields.length === 0) return null
        return (
          <div key={step.value} className="space-y-2">
            <h3 className="text-xs font-bold text-muted-foreground/70 uppercase tracking-widest flex items-center gap-2">
              <ChevronRight className="h-3 w-3" />
              {t(`admin.offboardingFormBuilder.${step.label}`, { defaultValue: step.value })}
              <span className="text-[10px] font-normal">({stepFields.length})</span>
            </h3>
            <div className="space-y-1.5">
              {stepFields.map((field: any) => (
                <FieldRow
                  key={field.id}
                  field={field}
                  allFields={fields}
                  onEdit={handleEdit}
                  onDelete={setDeleteConfirm}
                  onToggleActive={handleToggleActive}
                />
              ))}
            </div>
          </div>
        )
      })}

      {fields.length === 0 && (
        <div className="text-center py-16">
          <Settings className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">{t('admin.offboardingFormBuilder.noFieldsYet')}</p>
          <Button variant="outline" className="mt-4 gap-2" onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            {t('admin.offboardingFormBuilder.addFirstField')}
          </Button>
        </div>
      )}

      {/* ── Add/Edit dialog ── */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editDialog?._isNew ? t('admin.offboardingFormBuilder.addField') : t('admin.offboardingFormBuilder.editField')}
              {editDialog?.is_system && (
                <Badge variant="outline" className="ml-2 text-[10px]">
                  <Lock className="h-2.5 w-2.5 mr-1" />
                  {t('admin.offboardingFormBuilder.system')}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {editDialog && (
            <div className="space-y-4">
              {/* Label */}
              <div className="space-y-1.5">
                <Label>{t('admin.offboardingFormBuilder.fieldLabel')} *</Label>
                <Input
                  value={editDialog.label}
                  onChange={(e: any) => {
                    const label = e.target.value
                    setEditDialog((prev: any) => ({
                      ...prev,
                      label,
                      ...(prev._isNew ? { field_key: generateFieldKey(label) } : {}),
                    }))
                  }}
                  placeholder={t('admin.offboardingFormBuilder.fieldLabelPlaceholder')}
                />
              </div>

              {/* Field key */}
              <div className="space-y-1.5">
                <Label>{t('admin.offboardingFormBuilder.fieldKey')}</Label>
                <Input
                  value={editDialog.field_key}
                  onChange={(e: any) => setEditDialog((prev: any) => ({ ...prev, field_key: e.target.value }))}
                  placeholder={t('admin.offboardingFormBuilder.fieldKeyPlaceholder')}
                  disabled={editDialog.is_system || !editDialog._isNew}
                  className="font-mono text-sm"
                />
                {editDialog.is_system && (
                  <p className="text-[10px] text-muted-foreground">{t('admin.offboardingFormBuilder.systemFieldKeyLocked')}</p>
                )}
              </div>

              {/* Type + Step row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t('admin.offboardingFormBuilder.type')}</Label>
                  <Select
                    value={editDialog.field_type}
                    onChange={(e: any) => setEditDialog((prev: any) => ({ ...prev, field_type: e.target.value }))}
                    disabled={editDialog.is_system}
                  >
                    {FIELD_TYPES.map((ft: any) => (
                      <option key={ft.value} value={ft.value}>{t(`admin.offboardingFormBuilder.${ft.label}`, { defaultValue: ft.value })}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t('admin.offboardingFormBuilder.step')}</Label>
                  <Select
                    value={editDialog.step}
                    onChange={(e: any) => setEditDialog((prev: any) => ({ ...prev, step: e.target.value }))}
                    disabled={editDialog.is_system}
                  >
                    {STEPS.map((s: any) => (
                      <option key={s.value} value={s.value}>{t(`admin.offboardingFormBuilder.${s.label}`, { defaultValue: s.value })}</option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Placeholder */}
              <div className="space-y-1.5">
                <Label>{t('admin.offboardingFormBuilder.placeholderLabel')}</Label>
                <Input
                  value={editDialog.placeholder}
                  onChange={(e: any) => setEditDialog((prev: any) => ({ ...prev, placeholder: e.target.value }))}
                  placeholder={t('admin.offboardingFormBuilder.placeholderTextPlaceholder')}
                />
              </div>

              {/* Help text */}
              <div className="space-y-1.5">
                <Label>{t('admin.offboardingFormBuilder.helpText')}</Label>
                <Input
                  value={editDialog.help_text}
                  onChange={(e: any) => setEditDialog((prev: any) => ({ ...prev, help_text: e.target.value }))}
                  placeholder={t('admin.offboardingFormBuilder.helpTextPlaceholder')}
                />
              </div>

              {/* Options (for select/multi_select) */}
              {['select', 'multi_select'].includes(editDialog.field_type) && (
                <div className="space-y-1.5">
                  <Label>{t('admin.offboardingFormBuilder.optionsLabel')}</Label>
                  <Textarea
                    value={optionsText}
                    onChange={(e: any) => setOptionsText(e.target.value)}
                    placeholder={t('admin.offboardingFormBuilder.optionsPlaceholder')}
                    rows={4}
                    disabled={editDialog.is_system}
                  />
                  {editDialog.is_system && (
                    <p className="text-[10px] text-muted-foreground">{t('admin.offboardingFormBuilder.systemFieldOptionsLocked')}</p>
                  )}
                </div>
              )}

              {/* Required toggle */}
              <div className="flex items-center justify-between">
                <Label>{t('admin.offboardingFormBuilder.required')}</Label>
                <Switch
                  checked={editDialog.is_required}
                  onCheckedChange={(v: any) => setEditDialog((prev: any) => ({ ...prev, is_required: v }))}
                />
              </div>

              {/* ── Conditional Logic ── */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <Label className="text-sm font-semibold">{t('admin.offboardingFormBuilder.conditionalLogic')}</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('admin.offboardingFormBuilder.conditionalLogicDescription')}
                </p>

                {/* Condition field */}
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('admin.offboardingFormBuilder.ifField')}</Label>
                  <Select
                    value={editDialog.condition_field || '_none'}
                    onChange={(e: any) => {
                      const v = e.target.value
                      setEditDialog((prev: any) => ({
                        ...prev,
                        condition_field: v === '_none' ? '' : v,
                        condition_operator: v === '_none' ? '' : prev.condition_operator || 'equals',
                        condition_value: v === '_none' ? '' : prev.condition_value,
                      }))
                    }}
                  >
                    <option value="_none">{t('admin.offboardingFormBuilder.noCondition')}</option>
                    {fields
                      .filter((f: any) => f.id !== editDialog.id)
                      .map((f: any) => (
                        <option key={f.field_key} value={f.field_key}>
                          {f.label}
                        </option>
                      ))}
                  </Select>
                </div>

                {editDialog.condition_field && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t('admin.offboardingFormBuilder.operator')}</Label>
                      <Select
                        value={editDialog.condition_operator || 'equals'}
                        onChange={(e: any) => setEditDialog((prev: any) => ({ ...prev, condition_operator: e.target.value }))}
                      >
                        {OPERATORS.map((o: any) => (
                          <option key={o.value} value={o.value}>{t(`admin.offboardingFormBuilder.${o.label}`, { defaultValue: o.value })}</option>
                        ))}
                      </Select>
                    </div>
                    {!['is_true', 'is_false'].includes(editDialog.condition_operator) && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t('admin.offboardingFormBuilder.value')}</Label>
                        <Input
                          value={editDialog.condition_value}
                          onChange={(e: any) => setEditDialog((prev: any) => ({ ...prev, condition_value: e.target.value }))}
                          placeholder={t('admin.offboardingFormBuilder.expectedValuePlaceholder')}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>{t('admin.offboardingFormBuilder.cancel')}</Button>
            <Button
              onClick={handleSave}
              disabled={!editDialog?.label?.trim()}
            >
              {editDialog?._isNew ? t('admin.offboardingFormBuilder.create') : t('admin.offboardingFormBuilder.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ── */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              {t('admin.offboardingFormBuilder.deleteFieldTitle')}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('admin.offboardingFormBuilder.deleteFieldWarningPre')} <strong>{deleteConfirm?.label}</strong>{t('admin.offboardingFormBuilder.deleteFieldWarningPost')}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>{t('admin.offboardingFormBuilder.cancel')}</Button>
            <Button variant="destructive" onClick={handleDelete}>{t('admin.offboardingFormBuilder.delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
