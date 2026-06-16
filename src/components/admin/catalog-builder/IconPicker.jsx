import { useState, useMemo, createElement } from 'react'
import { icons as lucideIcons } from 'lucide-react'
import { Search, X } from 'lucide-react'
import { APPLE_DEVICE_ICONS, getAppleDeviceIconList } from '@/lib/apple-device-icons'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Curated list of commonly used lucide icons for equipment catalog.
 * Shown first, before the full list.
 */
const FEATURED_ICONS = [
  'Laptop', 'Smartphone', 'Tablet', 'Monitor', 'Headphones',
  'Camera', 'Mic', 'Printer', 'Keyboard', 'Mouse',
  'Speaker', 'Tv', 'Watch', 'Router', 'HardDrive',
  'Cpu', 'Cable', 'Usb', 'Projector', 'Gamepad2',
  'Wifi', 'Bluetooth', 'Battery', 'Zap', 'Power',
  'Package', 'Box', 'Briefcase', 'ShoppingBag', 'Wrench',
]

/**
 * IconPicker — Searchable grid of lucide icons + Apple device SVGs.
 *
 * @param {string} value - Current icon name (lucide PascalCase or apple key)
 * @param {function} onChange - Called with icon name string
 * @param {string} iconColor - Color to preview icons with
 */
export function IconPicker({ value, onChange, iconColor }) {
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('featured') // 'featured' | 'all' | 'apple'

  const appleIcons = useMemo(() => getAppleDeviceIconList(), [])

  // Filter lucide icons by search
  const allIconNames = useMemo(() => Object.keys(lucideIcons).sort(), [])

  const filteredIcons = useMemo(() => {
    const q = search.toLowerCase()
    if (tab === 'apple') {
      return appleIcons.filter(
        (a) => a.name.toLowerCase().includes(q) || a.tags.some((t) => t.includes(q))
      )
    }
    const source = tab === 'featured' ? FEATURED_ICONS : allIconNames
    if (!q) return source
    return source.filter((name) => name.toLowerCase().includes(q))
  }, [search, tab, allIconNames, appleIcons])

  const previewColor = iconColor || undefined

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search icons..."
          className="h-8 pl-8 pr-8 text-xs"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 bg-muted/40 rounded-lg p-0.5">
        {[
          { key: 'featured', label: 'Featured' },
          { key: 'all', label: `All (${allIconNames.length})` },
          { key: 'apple', label: `Apple (${appleIcons.length})` },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              'flex-1 text-[10px] font-medium py-1 rounded-md transition-all',
              tab === t.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Currently selected */}
      {value && (
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-primary/5 border border-primary/20">
          <div style={{ color: previewColor }}>
            {APPLE_DEVICE_ICONS[value] ? (
              <div
                className="h-5 w-5"
                dangerouslySetInnerHTML={{ __html: APPLE_DEVICE_ICONS[value].svg }}
              />
            ) : lucideIcons[value] ? (
              createElement(lucideIcons[value], { className: 'h-5 w-5', strokeWidth: 1.5 })
            ) : (
              <span className="text-xs">{value}</span>
            )}
          </div>
          <span className="text-xs font-medium flex-1">{value}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] px-2"
            onClick={() => onChange('')}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Icon grid */}
      <div className="max-h-48 overflow-y-auto rounded-lg border border-border/30 p-2">
        {tab === 'apple' ? (
          <div className="grid grid-cols-6 gap-1">
            {filteredIcons.map((icon) => (
              <button
                key={icon.key}
                type="button"
                onClick={() => onChange(icon.key)}
                className={cn(
                  'flex items-center justify-center h-9 w-full rounded-lg transition-all hover:bg-muted/60',
                  value === icon.key && 'bg-primary/10 ring-1 ring-primary'
                )}
                title={icon.name}
              >
                <div
                  className="h-5 w-5"
                  style={{ color: previewColor }}
                  dangerouslySetInnerHTML={{ __html: icon.svg }}
                />
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-8 gap-1">
            {filteredIcons.slice(0, 200).map((name) => {
              const IconComp = lucideIcons[name]
              if (!IconComp) return null
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => onChange(name)}
                  className={cn(
                    'flex items-center justify-center h-8 w-full rounded-md transition-all hover:bg-muted/60',
                    value === name && 'bg-primary/10 ring-1 ring-primary'
                  )}
                  title={name}
                >
                  <IconComp className="h-4 w-4" style={{ color: previewColor }} strokeWidth={1.5} />
                </button>
              )
            })}
          </div>
        )}
        {filteredIcons.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-4">No icons found</p>
        )}
        {tab === 'all' && filteredIcons.length > 200 && (
          <p className="text-center text-[10px] text-muted-foreground py-2">
            Showing first 200 — use search to find more
          </p>
        )}
      </div>
    </div>
  )
}
