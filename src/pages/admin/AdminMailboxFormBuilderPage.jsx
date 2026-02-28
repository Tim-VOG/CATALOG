import { useState, useMemo } from 'react'
import {
  useMailboxFormFields,
  useCreateMailboxFormField,
  useUpdateMailboxFormField,
  useDeleteMailboxFormField,
  useReorderMailboxFormFields,
} from '@/hooks/use-mailbox-form-fields'
import { useUIStore } from '@/stores/ui-store'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { CSS } from '@dnd-kit/utilities'
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { cn } from '@/lib/utils'

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'select', label: 'Select (Single)' },
  { value: 'multi_select', label: 'Multi Select' },
  { value: 'date', label: 'Date' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'toggle', label: 'Toggle' },
  { value: 'file', label: 'File Upload' },
  { value: 'email_tags', label: 'Email Tags' },
]

const STEPS = [
  { value: 'general', label: 'Functional Mailbox' },
  { value: 'signature', label: 'Signature' },
  { value: 'management', label: 'Email Management' },
  { value: 'requester', label: 'Requested By' },
  { value: 'additional', label: 'Additional' },
]

const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'is_true', label: 'Is true' },
  { value: 'is_false', label: 'Is false' },
]

const TYPE_COLORS = {
  text: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  textarea: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  select: 'bg-violet-500/15 text-violet-600 border-violet-500/30',
  multi_select: 'bg-violet-500/15 text-violet-600 border-violet-500/30',
  date: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  checkbox: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  toggle: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  file: 'bg-rose-500/15 text-rose-600 border-rose-500/30',
  email_tags: 'bg-cyan-500/15 text-cyan-600 border-cyan-500/30',
}

const STEP_COLORS = {
  general: 'bg-primary/15 text-primary border-primary/30',
  signature: 'bg-cyan-500/15 text-cyan-600 border-cyan-500/30',
  management: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  requester: 'bg-violet-500/15 text-violet-600 border-violet-500/30',
  additional: 'bg-gray-500/15 text-gray-600 border-gray-500/30',
}

function generateFieldKey(label) {
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
  step: 'additional',
  placeholder: '',
  help_text: '',
  is_required: false,
  options: [],
  condition_field: '',
  condition_operator: '',
  condition_value: '',
  is_active: true,
}

// ── Sortable row component ──
function SortableFieldRow({ field, allFields, onEdit, onDelete, onToggleActive }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }

  const hasCondition = !!field.condition_field
  const conditionField = hasCondition ? allFields.find((f) => f.field_key === field.condition_field) : null

  return (
    <div ref={setNodeRef} style={style} className={cn('group', isDragging && 'opacity-50')}>
      <Card variant="elevated" className={cn(
        'transition-all',
        !field.is_active && 'opacity-50',
        isDragging && 'shadow-lg ring-2 ring-primary/30'
      )}>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-3">
            {/* Drag handle */}
            <button
              {...attributes}
              {...listeners}
              className="shrink-0 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted/50 transition-colors"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground/40" />
            </button>

            {/* Field info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{field.label}</span>
                {field.is_system && (
                  <Lock className="h-3 w-3 text-muted-foreground/50" />
                )}
                <Badge variant="outline" className={cn('text-[10px]', TYPE_COLORS[field.field_type] || '')}>
                  {field.field_type.replace('_', ' ')}
                </Badge>
                <Badge variant="outline" className={cn('text-[10px]', STEP_COLORS[field.step] || '')}>
                  {STEPS.find((s) => s.value === field.step)?.label || field.step}
                </Badge>
                {field.is_required && (
                  <Badge variant="outline" className="text-[10px] bg-destructive/15 text-destructive border-destructive/30">
                    Required
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
    </div>
  )
}

export function AdminMailboxFormBuilderPage() {
  const { data: fields = [], isLoading } = useMailboxFormFields()
  const createField = useCreateMailboxFormField()
  const updateField = useUpdateMailboxFormField()
  const deleteField = useDeleteMailboxFormField()
  const reorderFields = useReorderMailboxFormFields()
  const showToast = useUIStore((s) => s.showToast)

  const [editDialog, setEditDialog] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [optionsText, setOptionsText] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Group fields by step for display
  const groupedFields = useMemo(() => {
    const groups = {}
    for (const step of STEPS) {
      groups[step.value] = fields.filter((f) => f.step === step.value)
    }
    return groups
  }, [fields])

  // ── Drag end: reorder ──
  const handleDragEnd = async (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = fields.findIndex((f) => f.id === active.id)
    const newIndex = fields.findIndex((f) => f.id === over.id)
    const reordered = arrayMove(fields, oldIndex, newIndex)

    try {
      await reorderFields.mutateAsync(
        reordered.map((f, i) => ({ id: f.id, sort_order: (i + 1) * 10 }))
      )
    } catch (err) {
      showToast(err.message || 'Reorder failed', 'error')
    }
  }

  // ── Open add dialog ──
  const handleAdd = () => {
    setEditDialog({ ...EMPTY_FIELD, _isNew: true })
    setOptionsText('')
  }

  // ── Open edit dialog ──
  const handleEdit = (field) => {
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
        .map((s) => s.trim())
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
        showToast('Field created')
      } else {
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
        await updateField.mutateAsync({ id, updates })
        showToast('Field updated')
      }
      setEditDialog(null)
    } catch (err) {
      showToast(err.message || 'Save failed', 'error')
    }
  }

  // ── Toggle active ──
  const handleToggleActive = async (field) => {
    try {
      await updateField.mutateAsync({ id: field.id, updates: { is_active: !field.is_active } })
    } catch (err) {
      showToast(err.message || 'Toggle failed', 'error')
    }
  }

  // ── Delete ──
  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      await deleteField.mutateAsync(deleteConfirm.id)
      showToast('Field deleted')
    } catch (err) {
      showToast(err.message || 'Delete failed', 'error')
    }
    setDeleteConfirm(null)
  }

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-6">
      {/* Header */}
      <AdminPageHeader title="Mailbox Form Builder" description={`${fields.length} field${fields.length !== 1 ? 's' : ''} · Drag to reorder · Add conditional logic`}>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Field
        </Button>
      </AdminPageHeader>

      {/* Fields list with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <SortableContext
          items={fields.map((f) => f.id)}
          strategy={verticalListSortingStrategy}
        >
          {STEPS.map((step) => {
            const stepFields = groupedFields[step.value] || []
            if (stepFields.length === 0) return null
            return (
              <div key={step.value} className="space-y-2">
                <h3 className="text-xs font-bold text-muted-foreground/70 uppercase tracking-widest flex items-center gap-2">
                  <ChevronRight className="h-3 w-3" />
                  {step.label}
                  <span className="text-[10px] font-normal">({stepFields.length})</span>
                </h3>
                <div className="space-y-1.5">
                  {stepFields.map((field) => (
                    <SortableFieldRow
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
        </SortableContext>
      </DndContext>

      {fields.length === 0 && (
        <div className="text-center py-16">
          <Settings className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No form fields yet</p>
          <Button variant="outline" className="mt-4 gap-2" onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            Add your first field
          </Button>
        </div>
      )}

      {/* ── Add/Edit dialog ── */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editDialog?._isNew ? 'Add Field' : 'Edit Field'}
              {editDialog?.is_system && (
                <Badge variant="outline" className="ml-2 text-[10px]">
                  <Lock className="h-2.5 w-2.5 mr-1" />
                  System
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {editDialog && (
            <div className="space-y-4">
              {/* Label */}
              <div className="space-y-1.5">
                <Label>Label *</Label>
                <Input
                  value={editDialog.label}
                  onChange={(e) => {
                    const label = e.target.value
                    setEditDialog((prev) => ({
                      ...prev,
                      label,
                      ...(prev._isNew ? { field_key: generateFieldKey(label) } : {}),
                    }))
                  }}
                  placeholder="Field label"
                />
              </div>

              {/* Field key */}
              <div className="space-y-1.5">
                <Label>Field Key</Label>
                <Input
                  value={editDialog.field_key}
                  onChange={(e) => setEditDialog((prev) => ({ ...prev, field_key: e.target.value }))}
                  placeholder="field_key"
                  disabled={editDialog.is_system || !editDialog._isNew}
                  className="font-mono text-sm"
                />
                {editDialog.is_system && (
                  <p className="text-[10px] text-muted-foreground">System field keys cannot be changed</p>
                )}
              </div>

              {/* Type + Step row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select
                    value={editDialog.field_type}
                    onChange={(e) => setEditDialog((prev) => ({ ...prev, field_type: e.target.value }))}
                    disabled={editDialog.is_system}
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Step</Label>
                  <Select
                    value={editDialog.step}
                    onChange={(e) => setEditDialog((prev) => ({ ...prev, step: e.target.value }))}
                    disabled={editDialog.is_system}
                  >
                    {STEPS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Placeholder */}
              <div className="space-y-1.5">
                <Label>Placeholder</Label>
                <Input
                  value={editDialog.placeholder}
                  onChange={(e) => setEditDialog((prev) => ({ ...prev, placeholder: e.target.value }))}
                  placeholder="Placeholder text"
                />
              </div>

              {/* Help text */}
              <div className="space-y-1.5">
                <Label>Help Text</Label>
                <Input
                  value={editDialog.help_text}
                  onChange={(e) => setEditDialog((prev) => ({ ...prev, help_text: e.target.value }))}
                  placeholder="Displayed below the field"
                />
              </div>

              {/* Options (for select/multi_select) */}
              {['select', 'multi_select'].includes(editDialog.field_type) && (
                <div className="space-y-1.5">
                  <Label>Options (one per line)</Label>
                  <Textarea
                    value={optionsText}
                    onChange={(e) => setOptionsText(e.target.value)}
                    placeholder={'Option 1\nOption 2\nOption 3'}
                    rows={4}
                    disabled={editDialog.is_system}
                  />
                  {editDialog.is_system && (
                    <p className="text-[10px] text-muted-foreground">System field options cannot be changed here</p>
                  )}
                </div>
              )}

              {/* Required toggle */}
              <div className="flex items-center justify-between">
                <Label>Required</Label>
                <Switch
                  checked={editDialog.is_required}
                  onCheckedChange={(v) => setEditDialog((prev) => ({ ...prev, is_required: v }))}
                />
              </div>

              {/* ── Conditional Logic ── */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <Label className="text-sm font-semibold">Conditional Logic</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Show this field only when another field meets a condition.
                </p>

                {/* Condition field */}
                <div className="space-y-1.5">
                  <Label className="text-xs">If field</Label>
                  <Select
                    value={editDialog.condition_field || '_none'}
                    onChange={(e) => {
                      const v = e.target.value
                      setEditDialog((prev) => ({
                        ...prev,
                        condition_field: v === '_none' ? '' : v,
                        condition_operator: v === '_none' ? '' : prev.condition_operator || 'equals',
                        condition_value: v === '_none' ? '' : prev.condition_value,
                      }))
                    }}
                  >
                    <option value="_none">No condition (always show)</option>
                    {fields
                      .filter((f) => f.id !== editDialog.id)
                      .map((f) => (
                        <option key={f.field_key} value={f.field_key}>
                          {f.label}
                        </option>
                      ))}
                  </Select>
                </div>

                {editDialog.condition_field && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Operator</Label>
                      <Select
                        value={editDialog.condition_operator || 'equals'}
                        onChange={(e) => setEditDialog((prev) => ({ ...prev, condition_operator: e.target.value }))}
                      >
                        {OPERATORS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </Select>
                    </div>
                    {!['is_true', 'is_false'].includes(editDialog.condition_operator) && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Value</Label>
                        <Input
                          value={editDialog.condition_value}
                          onChange={(e) => setEditDialog((prev) => ({ ...prev, condition_value: e.target.value }))}
                          placeholder="Expected value"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={!editDialog?.label?.trim()}
            >
              {editDialog?._isNew ? 'Create' : 'Save'}
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
              Delete Field?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete the field <strong>{deleteConfirm?.label}</strong>.
            Existing data for this field won&apos;t be affected.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
