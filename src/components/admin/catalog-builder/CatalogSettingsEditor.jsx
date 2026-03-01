import { useState, useEffect } from 'react'
import { Save, RotateCcw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { useAppSettings, useUpdateAppSettings } from '@/hooks/use-settings'
import { useUIStore } from '@/stores/ui-store'
import { ColorPickerPopover, GradientPicker } from './ColorPickerPopover'

const DEFAULT_CATALOG_SETTINGS = {
  hero_title: 'Equipment Catalog',
  hero_subtitle: 'Browse and reserve equipment for your projects',
  default_gradient_from: '#f97316',
  default_gradient_to: '#f59e0b',
  cards_per_row: 4,
  show_availability_badge: true,
  show_includes_chips: true,
  category_pill_style: 'rounded',
}

/**
 * CatalogSettingsEditor — Global catalog page settings.
 * Stored in app_settings.catalog_settings JSONB.
 */
export function CatalogSettingsEditor() {
  const { data: appSettings, isLoading } = useAppSettings()
  const updateSettings = useUpdateAppSettings()
  const showToast = useUIStore((s) => s.showToast)

  const [settings, setSettings] = useState(DEFAULT_CATALOG_SETTINGS)
  const [dirty, setDirty] = useState(false)

  // Initialize from DB
  useEffect(() => {
    if (appSettings?.catalog_settings) {
      setSettings({ ...DEFAULT_CATALOG_SETTINGS, ...appSettings.catalog_settings })
    }
  }, [appSettings])

  const update = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }))
    setDirty(true)
  }

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({ catalog_settings: settings })
      setDirty(false)
      showToast('Catalog settings saved')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleReset = () => {
    setSettings(DEFAULT_CATALOG_SETTINGS)
    setDirty(true)
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Catalog Page Settings</h3>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleReset}>
            <RotateCcw className="h-3 w-3" /> Reset
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={handleSave}
            disabled={!dirty || updateSettings.isPending}
          >
            <Save className="h-3 w-3" /> {updateSettings.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Hero section settings */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hero Section</h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Title</Label>
              <Input
                value={settings.hero_title}
                onChange={(e) => update('hero_title', e.target.value)}
                placeholder="Equipment Catalog"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Subtitle</Label>
              <Input
                value={settings.hero_subtitle}
                onChange={(e) => update('hero_subtitle', e.target.value)}
                placeholder="Browse and reserve..."
                className="h-8 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid settings */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Grid Layout</h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Cards per row (desktop)</Label>
              <Select
                value={settings.cards_per_row}
                onChange={(e) => update('cards_per_row', Number(e.target.value))}
                className="h-8 text-xs"
              >
                <option value={3}>3 columns</option>
                <option value={4}>4 columns (default)</option>
                <option value={5}>5 columns</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Category pill style</Label>
              <Select
                value={settings.category_pill_style}
                onChange={(e) => update('category_pill_style', e.target.value)}
                className="h-8 text-xs"
              >
                <option value="rounded">Rounded pills</option>
                <option value="square">Square chips</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Display toggles */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Display Options</h4>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.show_availability_badge}
                onChange={(e) => update('show_availability_badge', e.target.checked)}
                className="rounded border-border"
              />
              <div>
                <span className="text-xs font-medium">Show availability badge</span>
                <p className="text-[10px] text-muted-foreground">Display stock count on each product card</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.show_includes_chips}
                onChange={(e) => update('show_includes_chips', e.target.checked)}
                className="rounded border-border"
              />
              <div>
                <span className="text-xs font-medium">Show "includes" chips</span>
                <p className="text-[10px] text-muted-foreground">Display what's included on product cards</p>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Default gradient */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Default Gradient</h4>
          <p className="text-[10px] text-muted-foreground">
            Default gradient used for products without custom display settings.
          </p>
          <GradientPicker
            from={settings.default_gradient_from}
            to={settings.default_gradient_to}
            onChangeFrom={(v) => update('default_gradient_from', v)}
            onChangeTo={(v) => update('default_gradient_to', v)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
