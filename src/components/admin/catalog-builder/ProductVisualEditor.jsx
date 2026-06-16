import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Search, X, RotateCcw, Save, Image, Palette, Tag, ChevronRight, FileText } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { useProducts } from '@/hooks/use-products'
import { useCategories } from '@/hooks/use-categories'
import { useUpdateProductDisplaySettings, useUpdateProductSpecs } from '@/hooks/use-catalog'
import { useUIStore } from '@/stores/ui-store'
import { DeviceIconInline } from '@/components/common/DeviceIcon'
import { IconPicker } from './IconPicker'
import { ColorPickerPopover, GradientPicker } from './ColorPickerPopover'
import { SpecsEditor } from './SpecsEditor'
import { LivePreview } from './LivePreview'
import { cn } from '@/lib/utils'

/**
 * ProductVisualEditor — Select a product, edit its display_settings + specs,
 * see a live preview, and save.
 */
export function ProductVisualEditor() {
  const { data: products = [], isLoading } = useProducts()
  const { data: categories = [] } = useCategories()
  const updateDisplay = useUpdateProductDisplaySettings()
  const updateSpecs = useUpdateProductSpecs()
  const showToast = useUIStore((s) => s.showToast)

  const [selectedId, setSelectedId] = useState(null)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('All')

  // Local editing state
  const [ds, setDs] = useState({})
  const [specs, setSpecs] = useState([])
  const [dirty, setDirty] = useState(false)

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedId),
    [products, selectedId]
  )

  // Initialize editing state when product selection changes
  useEffect(() => {
    if (selectedProduct) {
      setDs(selectedProduct.display_settings || {})
      setSpecs(Array.isArray(selectedProduct.specs) ? selectedProduct.specs : [])
      setDirty(false)
    }
  }, [selectedProduct])

  // Filter products
  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = catFilter === 'All' || p.category_name === catFilter
      const matchesSearch = !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(search.toLowerCase())
      return matchesCat && matchesSearch
    })
  }, [products, search, catFilter])

  // Update a display setting field
  const updateField = useCallback((field, value) => {
    setDs((prev) => {
      const next = { ...prev }
      if (value === '' || value === null || value === undefined) {
        delete next[field]
      } else {
        next[field] = value
      }
      return next
    })
    setDirty(true)
  }, [])

  // Reset to auto-detected
  const handleReset = () => {
    setDs({})
    setSpecs(Array.isArray(selectedProduct?.specs) ? selectedProduct.specs : [])
    setDirty(true)
  }

  // Save
  const handleSave = async () => {
    if (!selectedId) return
    try {
      await updateDisplay.mutateAsync({ id: selectedId, display_settings: ds })
      await updateSpecs.mutateAsync({ id: selectedId, specs })
      setDirty(false)
      showToast('Display settings saved')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      {/* LEFT — Product list + editor */}
      <div className="space-y-4">
        {/* Search + filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="h-8 pl-8 text-xs"
            />
          </div>
          <Select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="h-8 text-xs w-36"
          >
            <option value="All">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </Select>
        </div>

        {/* Product list (scrollable) */}
        <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-border/30 p-2">
          {isLoading ? (
            <div className="animate-pulse space-y-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-9 bg-muted rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No products found</p>
          ) : (
            filtered.map((p) => {
              const hasCustom = p.display_settings && Object.keys(p.display_settings).length > 0
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all text-xs',
                    selectedId === p.id
                      ? 'bg-primary/10 border border-primary/20'
                      : 'hover:bg-muted/40'
                  )}
                >
                  <DeviceIconInline
                    name={p.name}
                    category={p.category_name}
                    subType={p.sub_type}
                    displaySettings={p.display_settings}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.category_name}</p>
                  </div>
                  {hasCustom && (
                    <span className="text-[8px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                      CUSTOM
                    </span>
                  )}
                  <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                </button>
              )
            })
          )}
        </div>

        {/* Editor panel */}
        <AnimatePresence mode="wait">
          {selectedProduct ? (
            <motion.div
              key={selectedId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">{selectedProduct.name}</h3>
                  <p className="text-[10px] text-muted-foreground">{selectedProduct.category_name}</p>
                </div>
                <div className="flex gap-1.5">
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleReset}>
                    <RotateCcw className="h-3 w-3" /> Reset
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={handleSave}
                    disabled={!dirty || updateDisplay.isPending}
                  >
                    <Save className="h-3 w-3" /> {updateDisplay.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>

              {/* Sections */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Icon section */}
                <Card>
                  <CardContent className="p-3 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <Palette className="h-3.5 w-3.5" /> Icon
                    </div>
                    <IconPicker
                      value={ds.icon_name || ''}
                      onChange={(v) => updateField('icon_name', v)}
                      iconColor={ds.icon_color}
                    />
                    <div className="space-y-1">
                      <Label className="text-[10px]">Icon Color</Label>
                      <ColorPickerPopover
                        value={ds.icon_color || ''}
                        onChange={(v) => updateField('icon_color', v)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Icon Size</Label>
                      <Select
                        value={ds.icon_size || 'md'}
                        onChange={(e) => updateField('icon_size', e.target.value === 'md' ? '' : e.target.value)}
                        className="h-7 text-xs"
                      >
                        <option value="sm">Small</option>
                        <option value="md">Medium (default)</option>
                        <option value="lg">Large</option>
                        <option value="xl">Extra Large</option>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Colors section */}
                <Card>
                  <CardContent className="p-3 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <Palette className="h-3.5 w-3.5" /> Colors & Gradient
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Card Background</Label>
                      <ColorPickerPopover
                        value={ds.card_bg || ''}
                        onChange={(v) => updateField('card_bg', v)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Gradient</Label>
                      <GradientPicker
                        from={ds.gradient_from || ''}
                        to={ds.gradient_to || ''}
                        onChangeFrom={(v) => updateField('gradient_from', v)}
                        onChangeTo={(v) => updateField('gradient_to', v)}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Image section */}
                <Card>
                  <CardContent className="p-3 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <Image className="h-3.5 w-3.5" /> Custom Image
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Image URL</Label>
                      <Input
                        value={ds.custom_image_url || ''}
                        onChange={(e) => updateField('custom_image_url', e.target.value)}
                        placeholder="https://... or upload in Asset Library"
                        className="h-7 text-xs"
                      />
                    </div>
                    {ds.custom_image_url && (
                      <div className="flex items-center gap-2">
                        <img
                          src={ds.custom_image_url}
                          alt="Preview"
                          className="h-12 w-12 object-contain rounded-lg border border-border/30"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => updateField('custom_image_url', '')}
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Badge section */}
                <Card>
                  <CardContent className="p-3 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <Tag className="h-3.5 w-3.5" /> Badge
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Badge Text</Label>
                      <Input
                        value={ds.badge_text || ''}
                        onChange={(e) => updateField('badge_text', e.target.value)}
                        placeholder="e.g. New, Popular, Pro"
                        className="h-7 text-xs"
                      />
                    </div>
                    {ds.badge_text && (
                      <div className="space-y-1">
                        <Label className="text-[10px]">Badge Color</Label>
                        <ColorPickerPopover
                          value={ds.badge_color || '#f97316'}
                          onChange={(v) => updateField('badge_color', v)}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Specs section */}
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-3">
                    <FileText className="h-3.5 w-3.5" /> Specifications
                  </div>
                  <SpecsEditor
                    specs={specs}
                    onChange={(s) => { setSpecs(s); setDirty(true) }}
                  />
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <Palette className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Select a product from the list above</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Customize its icon, colors, badge, and specs</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* RIGHT — Live Preview (sticky) */}
      <div className="lg:sticky lg:top-20 self-start">
        <LivePreview product={selectedProduct} displaySettings={ds} />
      </div>
    </div>
  )
}
