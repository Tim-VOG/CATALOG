import { useState } from 'react'
import { useFormFields, useCreateFormField, useUpdateFormField, useDeleteFormField } from '@/hooks/use-form-fields'
import { Plus, Pencil, Trash2, GripVertical, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { useUIStore } from '@/stores/ui-store'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { CSS } from '@dnd-kit/utilities'

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'url', label: 'URL' },
  { value: 'select', label: 'Dropdown' },
  { value: 'multi_select', label: 'Multi Select' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'radio', label: 'Radio Buttons' },
  { value: 'date', label: 'Date' },
]

// System field types are not editable
const SYSTEM_FIELD_TYPES = ['location', 'priority']

const HAS_OPTIONS = ['select', 'multi_select', 'radio']

const emptyField = {
  label: '',
  field_key: '',
  field_type: 'text',
  placeholder: '',
  help_text: '',
  is_required: false,
  options: [],
  sort_order: 0,
  is_active: true,
}

const fieldTypeLabel = (type) => {
  if (type === 'location') return 'Location Picker'
  if (type === 'priority') return 'Priority Selector'
  return FIELD_TYPES.find((t) => t.value === type)?.label || type
}

function SortableFieldRow({ field, onToggle, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: isDragging ? 'relative' : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-lg border ${!field.is_active ? 'opacity-50' : ''} ${isDragging ? 'shadow-lg bg-card' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none p-1 -m-1 rounded hover:bg-muted"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{field.label}</span>
          {field.is_system && (
            <Badge variant="outline" className="text-[10px] gap-1 border-blue-500/30 text-blue-400">
              <Lock className="h-2.5 w-2.5" /> System
            </Badge>
          )}
          {field.is_required && <Badge variant="outline" className="text-[10px]">Required</Badge>}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge className="text-[10px] bg-muted text-muted-foreground">{fieldTypeLabel(field.field_type)}</Badge>
          <span className="text-[10px] text-muted-foreground font-mono">{field.field_key}</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onToggle(field)} aria-label={`Toggle ${field.label}`}>
          <Badge className={field.is_active ? 'bg-green-500/20 text-green-400 text-[10px]' : 'bg-red-500/20 text-red-400 text-[10px]'}>
            {field.is_active ? 'On' : 'Off'}
          </Badge>
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(field)} aria-label={`Edit ${field.label}`}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        {!field.is_system && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(field)} aria-label={`Delete ${field.label}`}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}

export function FormFieldsManager() {
  const { data: fields = [], isLoading } = useFormFields()
  const createField = useCreateFormField()
  const updateField = useUpdateFormField()
  const deleteField = useDeleteFormField()
  const showToast = useUIStore((s) => s.showToast)

  const [showFieldDialog, setShowFieldDialog] = useState(false)
  const [editingField, setEditingField] = useState(null)
  const [form, setForm] = useState(emptyField)
  const [optionInput, setOptionInput] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const openCreateField = () => {
    setEditingField(null)
    setForm({ ...emptyField, sort_order: fields.length })
    setOptionInput('')
    setShowFieldDialog(true)
  }

  const openEditField = (field) => {
    setEditingField(field)
    setForm({
      label: field.label,
      field_key: field.field_key,
      field_type: field.field_type,
      placeholder: field.placeholder || '',
      help_text: field.help_text || '',
      is_required: field.is_required,
      options: field.options || [],
      sort_order: field.sort_order,
      is_active: field.is_active,
    })
    setOptionInput('')
    setShowFieldDialog(true)
  }

  const handleLabelChange = (label) => {
    const key = editingField
      ? form.field_key
      : label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    setForm({ ...form, label, field_key: key })
  }

  const addOption = () => {
    if (!optionInput.trim()) return
    const value = optionInput.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')
    setForm({
      ...form,
      options: [...form.options, { label: optionInput.trim(), value }],
    })
    setOptionInput('')
  }

  const removeOption = (index) => {
    setForm({
      ...form,
      options: form.options.filter((_, i) => i !== index),
    })
  }

  const handleSaveField = async () => {
    if (!form.label.trim() || !form.field_key.trim()) {
      showToast('Label is required', 'error')
      return
    }
    try {
      const isSystem = editingField?.is_system
      const updates = isSystem
        ? { id: editingField.id, label: form.label, placeholder: form.placeholder, help_text: form.help_text, is_required: form.is_required, is_active: form.is_active }
        : editingField
          ? { id: editingField.id, ...form }
          : form

      if (editingField) {
        await updateField.mutateAsync(updates)
        showToast('Field updated')
      } else {
        await createField.mutateAsync(form)
        showToast('Field created')
      }
      setShowFieldDialog(false)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleDeleteField = async (field) => {
    if (field.is_system) {
      showToast('System fields cannot be deleted', 'error')
      return
    }
    if (!confirm('Delete this custom field?')) return
    try {
      await deleteField.mutateAsync(field.id)
      showToast('Field deleted')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleToggleField = async (field) => {
    try {
      await updateField.mutateAsync({ id: field.id, is_active: !field.is_active })
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIdx = fields.findIndex((f) => f.id === active.id)
    const newIdx = fields.findIndex((f) => f.id === over.id)
    if (oldIdx === -1 || newIdx === -1) return

    // Build new order and persist all sort_order values
    const reordered = [...fields]
    const [moved] = reordered.splice(oldIdx, 1)
    reordered.splice(newIdx, 0, moved)

    try {
      await Promise.all(
        reordered.map((f, i) =>
          f.sort_order !== i ? updateField.mutateAsync({ id: f.id, sort_order: i }) : null
        ).filter(Boolean)
      )
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
            <CardTitle className="text-lg">Checkout Form Fields</CardTitle>
            <Button size="sm" onClick={openCreateField} className="gap-2">
              <Plus className="h-4 w-4" /> Add Field
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Drag fields to reorder. System fields can be toggled, reordered, and relabeled but not deleted.
          </p>
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground text-sm">No fields configured</p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis]}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {fields.map((field) => (
                    <SortableFieldRow
                      key={field.id}
                      field={field}
                      onToggle={handleToggleField}
                      onEdit={openEditField}
                      onDelete={handleDeleteField}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Field Dialog */}
      <Dialog open={showFieldDialog} onOpenChange={setShowFieldDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingField
                ? editingField.is_system ? 'Edit System Field' : 'Edit Field'
                : 'Add Custom Field'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-1">
              <Label>Label *</Label>
              <Input value={form.label} onChange={(e) => handleLabelChange(e.target.value)} placeholder="e.g. Cost Center" />
            </div>
            {/* Hide key + type for system fields */}
            {!(editingField?.is_system) && (
              <>
                <div className="space-y-1">
                  <Label>Field Key</Label>
                  <Input
                    value={form.field_key}
                    onChange={(e) => setForm({ ...form, field_key: e.target.value })}
                    className="font-mono text-sm"
                    disabled={!!editingField}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Field Type</Label>
                  <Select value={form.field_type} onChange={(e) => setForm({ ...form, field_type: e.target.value })}>
                    {FIELD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </Select>
                </div>
              </>
            )}
            {editingField?.is_system && SYSTEM_FIELD_TYPES.includes(form.field_type) && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
                System field — type and key cannot be changed. You can edit the label, placeholder, help text, and required status.
              </p>
            )}
            <div className="space-y-1">
              <Label>Placeholder</Label>
              <Input value={form.placeholder} onChange={(e) => setForm({ ...form, placeholder: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Help Text</Label>
              <Input value={form.help_text} onChange={(e) => setForm({ ...form, help_text: e.target.value })} />
            </div>
            <label className="flex items-center gap-2">
              <Checkbox checked={form.is_required} onCheckedChange={(v) => setForm({ ...form, is_required: v })} />
              <span className="text-sm">Required field</span>
            </label>

            {HAS_OPTIONS.includes(form.field_type) && !(editingField?.is_system) && (
              <div className="space-y-2">
                <Label>Options</Label>
                <div className="flex gap-2">
                  <Input
                    value={optionInput}
                    onChange={(e) => setOptionInput(e.target.value)}
                    placeholder="Add option..."
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
                  />
                  <Button type="button" size="sm" onClick={addOption}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {form.options.map((opt, i) => (
                    <Badge key={i} variant="outline" className="gap-1 pr-1">
                      {opt.label}
                      <button onClick={() => removeOption(i)} className="ml-1 text-destructive hover:text-destructive/80">
                        &times;
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFieldDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveField}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
