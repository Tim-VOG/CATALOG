import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Preset colors matching the VO Gear Hub palette */
const COLOR_PRESETS = [
  '#3b82f6', '#2563eb', '#1d4ed8', '#60a5fa', '#93c5fd',
  '#8b5cf6', '#7c3aed', '#a855f7', '#c084fc',
  '#ec4899', '#f43f5e', '#fb7185',
  '#f97316', '#f59e0b', '#eab308', '#fbbf24',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
  '#64748b', '#94a3b8', '#475569', '#334155',
  '#000000', '#ffffff',
]

/** Gradient presets from DeviceIcon GRADIENTS */
const GRADIENT_PRESETS = [
  { label: 'Laptop', from: '#3b82f6', to: '#22d3ee' },
  { label: 'Phone', from: '#8b5cf6', to: '#d946ef' },
  { label: 'Tablet', from: '#6366f1', to: '#3b82f6' },
  { label: 'Monitor', from: '#10b981', to: '#14b8a6' },
  { label: 'Headphones', from: '#a855f7', to: '#ec4899' },
  { label: 'Camera', from: '#f43f5e', to: '#f97316' },
  { label: 'Mic', from: '#f59e0b', to: '#eab308' },
  { label: 'Speaker', from: '#f97316', to: '#ef4444' },
  { label: 'TV', from: '#06b6d4', to: '#14b8a6' },
  { label: 'Network', from: '#22c55e', to: '#10b981' },
  { label: 'Storage', from: '#14b8a6', to: '#22d3ee' },
  { label: 'Primary', from: '#f97316', to: '#f59e0b' },
]

/**
 * ColorPickerPopover — A dropdown with color presets + hex input.
 * Uses a simple open/close state instead of Radix Popover (not installed).
 */
export function ColorPickerPopover({ value, onChange, label, mode = 'color', className }) {
  const [hex, setHex] = useState(value || '')
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  // Sync hex when value changes externally
  useEffect(() => { setHex(value || '') }, [value])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handlePresetClick = (color) => {
    setHex(color)
    onChange(color)
  }

  const handleHexChange = (e) => {
    const v = e.target.value
    setHex(v)
    if (/^#[0-9A-Fa-f]{6}$/.test(v)) {
      onChange(v)
    }
  }

  const handleNativeChange = (e) => {
    setHex(e.target.value)
    onChange(e.target.value)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 h-9 px-3 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors text-sm',
          className
        )}
      >
        <span
          className="h-5 w-5 rounded-md border border-white/20 shrink-0"
          style={{ background: value || '#e2e8f0' }}
        />
        <span className="text-muted-foreground text-xs font-mono">
          {value || 'Pick color'}
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-72 p-3 space-y-3 rounded-xl border border-border/50 bg-card shadow-lg">
          {label && <Label className="text-xs font-medium">{label}</Label>}

          {/* Color presets grid */}
          <div className="grid grid-cols-8 gap-1.5">
            {COLOR_PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handlePresetClick(color)}
                className={cn(
                  'h-6 w-6 rounded-md border transition-all hover:scale-110',
                  value === color ? 'border-foreground ring-1 ring-foreground scale-110' : 'border-white/20'
                )}
                style={{ background: color }}
                title={color}
              />
            ))}
          </div>

          {/* Gradient presets (only in gradient mode) */}
          {mode === 'gradient' && (
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground uppercase">Gradient Presets</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {GRADIENT_PRESETS.map((g) => (
                  <button
                    key={g.label}
                    type="button"
                    onClick={() => handlePresetClick(g.from)}
                    className="h-6 rounded-md border border-white/20 hover:scale-105 transition-transform"
                    style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}
                    title={g.label}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Native color picker + hex input */}
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={value || '#000000'}
              onChange={handleNativeChange}
              className="h-8 w-8 rounded-md border border-border/50 cursor-pointer bg-transparent p-0"
            />
            <Input
              value={hex}
              onChange={handleHexChange}
              placeholder="#3b82f6"
              className="flex-1 h-8 text-xs font-mono"
            />
            {value && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs px-2"
                onClick={() => { setHex(''); onChange(''); setOpen(false) }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * GradientPicker — Dual color picker for from/to gradient.
 */
export function GradientPicker({ from, to, direction = '135deg', onChangeFrom, onChangeTo, onChangeDirection }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 space-y-1">
          <Label className="text-[10px] text-muted-foreground">From</Label>
          <ColorPickerPopover value={from} onChange={onChangeFrom} />
        </div>
        <div className="flex-1 space-y-1">
          <Label className="text-[10px] text-muted-foreground">To</Label>
          <ColorPickerPopover value={to} onChange={onChangeTo} />
        </div>
      </div>

      {/* Preview */}
      {(from || to) && (
        <div
          className="h-8 rounded-lg border border-white/10"
          style={{
            background: `linear-gradient(${direction}, ${from || 'transparent'}, ${to || 'transparent'})`,
          }}
        />
      )}
    </div>
  )
}
