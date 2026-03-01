import { useState } from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/**
 * SpecsEditor — Edit product specifications as an array of { label, value }.
 * Supports drag reorder (simple manual move), add/remove.
 *
 * @param {Array} specs - Array of { label, value }
 * @param {function} onChange - Called with updated specs array
 */
export function SpecsEditor({ specs = [], onChange }) {
  const addSpec = () => {
    onChange([...specs, { label: '', value: '' }])
  }

  const removeSpec = (index) => {
    onChange(specs.filter((_, i) => i !== index))
  }

  const updateSpec = (index, field, value) => {
    const updated = specs.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    onChange(updated)
  }

  const moveUp = (index) => {
    if (index === 0) return
    const updated = [...specs]
    ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
    onChange(updated)
  }

  const moveDown = (index) => {
    if (index === specs.length - 1) return
    const updated = [...specs]
    ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
    onChange(updated)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">Specifications</Label>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addSpec}>
          <Plus className="h-3 w-3" /> Add
        </Button>
      </div>

      {specs.length === 0 ? (
        <p className="text-xs text-muted-foreground py-3 text-center bg-muted/20 rounded-lg">
          No specifications yet. Click "Add" to create one.
        </p>
      ) : (
        <div className="space-y-1.5">
          {specs.map((spec, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 group"
            >
              {/* Move buttons */}
              <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => moveUp(i)}
                  disabled={i === 0}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-20 text-[10px]"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => moveDown(i)}
                  disabled={i === specs.length - 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-20 text-[10px]"
                >
                  ▼
                </button>
              </div>

              <Input
                value={spec.label}
                onChange={(e) => updateSpec(i, 'label', e.target.value)}
                placeholder="Label (e.g. Processor)"
                className="h-7 text-xs flex-1"
              />
              <Input
                value={spec.value}
                onChange={(e) => updateSpec(i, 'value', e.target.value)}
                placeholder="Value (e.g. M3 Pro)"
                className="h-7 text-xs flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-destructive/60 hover:text-destructive"
                onClick={() => removeSpec(i)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
