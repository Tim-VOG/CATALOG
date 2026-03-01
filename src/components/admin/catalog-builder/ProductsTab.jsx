import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Search, Plus, Trash2, Save, RotateCcw, X,
  Package, Palette, FileText, Image, Tag, Check,
  CheckSquare, Eye, Move, Maximize2,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useDeleteProducts } from '@/hooks/use-products'
import { useCategories } from '@/hooks/use-categories'
import { useUIStore } from '@/stores/ui-store'
import { DeviceIconInline } from '@/components/common/DeviceIcon'
import { ImageUpload } from '@/components/admin/ImageUpload'
import { TagInput } from '@/components/ui/tag-input'
import { IconPicker } from './IconPicker'
import { ColorPickerPopover, GradientPicker } from './ColorPickerPopover'
import { SpecsEditor } from './SpecsEditor'
import { LivePreview } from './LivePreview'
import { cn } from '@/lib/utils'

const emptyForm = {
  name: '', description: '', category_id: '', sub_type: '', image_url: '',
  total_stock: 1, includes: [], has_accessories: false, has_software: false,
  has_subscription: false, has_apps: false, wifi_only: false, printer_info: false,
}

const EDITOR_TABS = [
  { key: 'details', label: 'Details', icon: Package },
  { key: 'visual', label: 'Visual', icon: Palette },
  { key: 'specs', label: 'Specs', icon: FileText },
]

/**
 * ProductsTab — Master-detail product management.
 * Left: product list with search/filter/create.
 * Right: full product editor (details + visual + specs) with live preview.
 */
export function ProductsTab() {
  const { data: products = [], isLoading } = useProducts()
  const { data: categories = [] } = useCategories()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()
  const bulkDelete = useDeleteProducts()
  const showToast = useUIStore((s) => s.showToast)

  // Selection state
  const [selectedId, setSelectedId] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('All')
  const [selectedIds, setSelectedIds] = useState(new Set())

  // Editor state
  const [form, setForm] = useState(emptyForm)
  const [ds, setDs] = useState({})
  const [specs, setSpecs] = useState([])
  const [dirty, setDirty] = useState(false)
  const [editorTab, setEditorTab] = useState('details')

  // Track which ID we loaded into editor (prevents re-init on data refetch)
  const loadedIdRef = useRef(null)

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedId),
    [products, selectedId]
  )

  // Collect all unique included items for suggestions
  const allIncludesItems = useMemo(() => {
    const set = new Set()
    for (const p of products) {
      for (const item of p.includes || []) {
        for (const part of item.split(/[;,]/)) {
          const trimmed = part.trim()
          if (trimmed) set.add(trimmed)
        }
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [products])

  const suggestions = allIncludesItems.filter((item) => !form.includes.includes(item))

  // Initialize editor when selecting a DIFFERENT product (not on data refetch)
  useEffect(() => {
    if (isCreating) return
    if (!selectedId || selectedId === loadedIdRef.current) return
    const product = products.find((p) => p.id === selectedId)
    if (!product) return

    loadedIdRef.current = selectedId
    setForm({
      name: product.name,
      description: product.description || '',
      category_id: product.category_id,
      sub_type: product.sub_type || '',
      image_url: product.image_url || '',
      total_stock: product.total_stock,
      includes: (product.includes || []).flatMap((s) =>
        s.split(/[;,]/).map((t) => t.trim()).filter(Boolean)
      ),
      has_accessories: product.has_accessories,
      has_software: product.has_software,
      has_subscription: product.has_subscription,
      has_apps: product.has_apps,
      wifi_only: product.wifi_only,
      printer_info: product.printer_info,
    })
    setDs(product.display_settings || {})
    setSpecs(Array.isArray(product.specs) ? product.specs : [])
    setDirty(false)
    setEditorTab('details')
  }, [selectedId, products, isCreating])

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

  // --- Actions ---

  const handleSelectProduct = (id) => {
    if (dirty && !confirm('You have unsaved changes. Discard?')) return
    setIsCreating(false)
    loadedIdRef.current = null // Force re-init
    setSelectedId(id)
  }

  const handleCreate = () => {
    if (dirty && !confirm('You have unsaved changes. Discard?')) return
    setSelectedId(null)
    loadedIdRef.current = null
    setIsCreating(true)
    setForm({ ...emptyForm, category_id: categories[0]?.id || '' })
    setDs({})
    setSpecs([])
    setDirty(false)
    setEditorTab('details')
  }

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

  const updateForm = (updates) => {
    setForm((prev) => ({ ...prev, ...updates }))
    setDirty(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('Product name is required', 'error')
      return
    }
    try {
      if (isCreating) {
        const created = await createProduct.mutateAsync({
          ...form,
          display_settings: Object.keys(ds).length > 0 ? ds : {},
          specs: specs.length > 0 ? specs : [],
        })
        showToast('Product created')
        setIsCreating(false)
        loadedIdRef.current = null
        if (created?.id) setSelectedId(created.id)
      } else if (selectedId) {
        await updateProduct.mutateAsync({
          id: selectedId,
          ...form,
          display_settings: ds,
          specs,
        })
        setDirty(false)
        showToast('Product saved')
      }
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return
    try {
      await deleteProduct.mutateAsync(id)
      showToast('Product deleted')
      if (selectedId === id) {
        setSelectedId(null)
        loadedIdRef.current = null
        setIsCreating(false)
      }
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleBulkDelete = async () => {
    try {
      await bulkDelete.mutateAsync(Array.from(selectedIds))
      showToast(`${selectedIds.size} product${selectedIds.size > 1 ? 's' : ''} deleted`)
      setSelectedIds(new Set())
      if (selectedIds.has(selectedId)) {
        setSelectedId(null)
        loadedIdRef.current = null
      }
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleResetVisual = () => {
    setDs({})
    setDirty(true)
  }

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const showEditor = isCreating || selectedId

  return (
    <div className="flex gap-6 min-h-[600px]">
      {/* ── LEFT PANEL: Product List ─────────────────────────── */}
      <div className="w-72 shrink-0 space-y-3">
        {/* Create button */}
        <Button onClick={handleCreate} className="w-full gap-2 h-9">
          <Plus className="h-4 w-4" /> Add Product
        </Button>

        {/* Search + filter */}
        <div className="space-y-2">
          <div className="relative">
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
            className="h-8 text-xs"
          >
            <option value="All">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </Select>
        </div>

        {/* Product count */}
        <div className="flex items-center justify-between px-1">
          <p className="text-[10px] text-muted-foreground font-medium">
            {filtered.length} product{filtered.length !== 1 ? 's' : ''}
          </p>
          {selectedIds.size > 0 && (
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-[10px] text-primary hover:underline"
            >
              Clear {selectedIds.size} selected
            </button>
          )}
        </div>

        {/* Product list */}
        <div className="overflow-y-auto max-h-[calc(100vh-22rem)] space-y-1 rounded-xl border border-border/30 p-2 bg-muted/10">
          {isLoading ? (
            <div className="animate-pulse space-y-1.5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-14 bg-muted rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Package className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No products found</p>
            </div>
          ) : (
            filtered.map((p) => {
              const isActive = selectedId === p.id && !isCreating
              const isChecked = selectedIds.has(p.id)
              const hasCustom = p.display_settings && Object.keys(p.display_settings).length > 0
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectProduct(p.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-left transition-all text-xs group',
                    isActive
                      ? 'bg-primary/10 border border-primary/30 shadow-sm'
                      : 'hover:bg-muted/50 border border-transparent'
                  )}
                >
                  {/* Bulk select checkbox */}
                  <div
                    className={cn(
                      'shrink-0 transition-opacity',
                      selectedIds.size > 0 || isChecked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    )}
                    onClick={(e) => { e.stopPropagation(); toggleSelect(p.id) }}
                  >
                    <div className={cn(
                      'h-5 w-5 rounded-md flex items-center justify-center border transition-colors cursor-pointer',
                      isChecked
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-border/60 hover:border-foreground/40'
                    )}>
                      {isChecked && <Check className="h-3 w-3" />}
                    </div>
                  </div>

                  <DeviceIconInline
                    name={p.name}
                    category={p.category_name}
                    subType={p.sub_type}
                    displaySettings={p.display_settings}
                    className="!h-8 !w-8"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate leading-tight">{p.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{p.category_name}</span>
                      <span className="text-[10px] text-muted-foreground/40">|</span>
                      <span className={cn(
                        'text-[10px] font-semibold',
                        p.total_stock > 3 ? 'text-success' : p.total_stock > 0 ? 'text-warning' : 'text-destructive'
                      )}>
                        {p.total_stock} in stock
                      </span>
                    </div>
                  </div>
                  {hasCustom && (
                    <span className="text-[7px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0 uppercase">
                      Custom
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL: Product Editor ──────────────────────── */}
      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          {showEditor ? (
            <motion.div
              key={isCreating ? 'create' : selectedId}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Editor header */}
              <div className="flex items-center justify-between gap-4 pb-3 border-b border-border/30">
                <div className="flex items-center gap-3 min-w-0">
                  {!isCreating && selectedProduct && (
                    <DeviceIconInline
                      name={selectedProduct.name}
                      category={selectedProduct.category_name}
                      subType={selectedProduct.sub_type}
                      displaySettings={ds}
                      className="!h-10 !w-10"
                    />
                  )}
                  <div className="min-w-0">
                    <h3 className="font-semibold text-base truncate">
                      {isCreating ? 'New Product' : form.name || 'Untitled'}
                    </h3>
                    {!isCreating && selectedProduct && (
                      <p className="text-[11px] text-muted-foreground">{selectedProduct.category_name}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {dirty && (
                    <span className="text-[10px] text-warning font-medium">Unsaved changes</span>
                  )}
                  {!isCreating && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs gap-1.5 text-destructive/70 hover:text-destructive"
                      onClick={() => handleDelete(selectedId)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="h-8 text-xs gap-1.5 min-w-[80px]"
                    onClick={handleSave}
                    disabled={!dirty && !isCreating}
                  >
                    <Save className="h-3.5 w-3.5" />
                    {createProduct.isPending || updateProduct.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>

              {/* Editor sub-tabs */}
              <div className="flex gap-1 bg-muted/30 rounded-lg p-0.5">
                {EDITOR_TABS.map((tab) => {
                  const active = editorTab === tab.key
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setEditorTab(tab.key)}
                      className={cn(
                        'relative flex items-center gap-1.5 flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all',
                        active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="product-editor-tab"
                          className="absolute inset-0 bg-background rounded-md shadow-sm border border-border/40"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1.5">
                        <tab.icon className="h-3.5 w-3.5" />
                        {tab.label}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Editor content + preview */}
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
                {/* Form area */}
                <div className="space-y-4 min-w-0">
                  {editorTab === 'details' && (
                    <DetailsForm
                      form={form}
                      updateForm={updateForm}
                      categories={categories}
                      suggestions={suggestions}
                    />
                  )}
                  {editorTab === 'visual' && (
                    <VisualForm
                      ds={ds}
                      updateField={updateField}
                      onReset={handleResetVisual}
                    />
                  )}
                  {editorTab === 'specs' && (
                    <SpecsEditor
                      specs={specs}
                      onChange={(s) => { setSpecs(s); setDirty(true) }}
                    />
                  )}
                </div>

                {/* Live preview (sticky) */}
                <div className="xl:sticky xl:top-36 self-start">
                  <LivePreview
                    product={isCreating ? { ...form, name: form.name || 'New Product', category_name: categories.find(c => c.id === form.category_id)?.name || '' } : selectedProduct}
                    displaySettings={ds}
                  />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <div className="h-16 w-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
                <Package className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <h3 className="font-semibold text-sm text-muted-foreground">Select a product</h3>
              <p className="text-xs text-muted-foreground/60 mt-1 max-w-[200px]">
                Choose a product from the list or create a new one to start editing
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bulk delete bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-card border border-border shadow-xl backdrop-blur-xl">
              <CheckSquare className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">{selectedIds.size} selected</span>
              <div className="h-5 w-px bg-border/60" />
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} className="text-xs gap-1.5">
                <X className="h-3.5 w-3.5" /> Clear
              </Button>
              <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkDelete.isPending} className="text-xs gap-1.5">
                <Trash2 className="h-3.5 w-3.5" /> {bulkDelete.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Details Form ────────────────────────────────────────── */
function DetailsForm({ form, updateForm, categories, suggestions }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Name *</Label>
          <Input
            value={form.name}
            onChange={(e) => updateForm({ name: e.target.value })}
            placeholder="Product name"
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Category</Label>
          <Select
            value={form.category_id}
            onChange={(e) => updateForm({ category_id: e.target.value })}
            className="h-9"
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Sub-type</Label>
          <Input
            value={form.sub_type}
            onChange={(e) => updateForm({ sub_type: e.target.value })}
            placeholder="e.g. 16-inch, Pro Max"
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Stock *</Label>
          <Input
            type="number"
            min="1"
            value={form.total_stock}
            onChange={(e) => updateForm({ total_stock: parseInt(e.target.value) || 1 })}
            className="h-9"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Product Image</Label>
        <ImageUpload
          value={form.image_url}
          onChange={(url) => updateForm({ image_url: url })}
          bucket="product-images"
          requiredWidth={400}
          requiredHeight={300}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => updateForm({ description: e.target.value })}
          placeholder="Product description..."
          rows={2}
          className="text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Included items</Label>
        <TagInput
          value={form.includes}
          onChange={(tags) => updateForm({ includes: tags })}
          placeholder="Type item and press Enter..."
        />
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {suggestions.slice(0, 15).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => updateForm({ includes: [...form.includes, item] })}
                className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border/50 transition-colors cursor-pointer"
              >
                <Plus className="h-2 w-2" />
                {item}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Options</Label>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {[
            ['has_accessories', 'Accessories'],
            ['has_software', 'Software'],
            ['has_subscription', 'Subscription'],
            ['has_apps', 'Apps'],
            ['wifi_only', 'WiFi only'],
            ['printer_info', 'Printer'],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox
                checked={form[key]}
                onCheckedChange={(v) => updateForm({ [key]: v })}
              />
              {label}
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Visual Form — Redesigned with proper spacing ────────── */
function VisualForm({ ds, updateField, onReset }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Customize how this product appears in the catalog</p>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onReset}>
          <RotateCcw className="h-3 w-3" /> Reset to auto
        </Button>
      </div>

      {/* ── Section 1: Icon ─────────────────────────────── */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground border-b border-border/20 pb-2">
            <Palette className="h-3.5 w-3.5" /> Icon
          </div>

          <IconPicker
            value={ds.icon_name || ''}
            onChange={(v) => updateField('icon_name', v)}
            iconColor={ds.icon_color}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground">Icon Color</Label>
              <ColorPickerPopover
                value={ds.icon_color || ''}
                onChange={(v) => updateField('icon_color', v)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Maximize2 className="h-3 w-3" /> Size
              </Label>
              <Select
                value={ds.icon_size || 'md'}
                onChange={(e) => updateField('icon_size', e.target.value)}
                className="h-8 text-xs"
              >
                <option value="sm">Small</option>
                <option value="md">Medium (default)</option>
                <option value="lg">Large</option>
                <option value="xl">Extra Large</option>
              </Select>
            </div>
          </div>

          {/* Icon Position — pixel-precise offset */}
          <div className="space-y-2">
            <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Move className="h-3 w-3" /> Icon Position Offset (px)
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-mono">X</span>
                  <span className="text-[10px] text-foreground font-mono font-medium">{ds.icon_offset_x || 0}px</span>
                </div>
                <input
                  type="range"
                  min={-50}
                  max={50}
                  value={ds.icon_offset_x || 0}
                  onChange={(e) => updateField('icon_offset_x', parseInt(e.target.value) || 0)}
                  className="w-full h-1.5 rounded-full appearance-none bg-muted cursor-pointer accent-primary"
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-mono">Y</span>
                  <span className="text-[10px] text-foreground font-mono font-medium">{ds.icon_offset_y || 0}px</span>
                </div>
                <input
                  type="range"
                  min={-50}
                  max={50}
                  value={ds.icon_offset_y || 0}
                  onChange={(e) => updateField('icon_offset_y', parseInt(e.target.value) || 0)}
                  className="w-full h-1.5 rounded-full appearance-none bg-muted cursor-pointer accent-primary"
                />
              </div>
            </div>
            {(ds.icon_offset_x || ds.icon_offset_y) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => { updateField('icon_offset_x', 0); updateField('icon_offset_y', 0) }}
              >
                Reset position
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Section 2: Colors & Gradient ────────────────── */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground border-b border-border/20 pb-2">
            <Palette className="h-3.5 w-3.5" /> Colors & Gradient
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground">Card Background</Label>
            <ColorPickerPopover
              value={ds.card_bg || ''}
              onChange={(v) => updateField('card_bg', v)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground">Gradient</Label>
            <GradientPicker
              from={ds.gradient_from || ''}
              to={ds.gradient_to || ''}
              onChangeFrom={(v) => updateField('gradient_from', v)}
              onChangeTo={(v) => updateField('gradient_to', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Section 3: Custom Image ─────────────────────── */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground border-b border-border/20 pb-2">
            <Image className="h-3.5 w-3.5" /> Custom Image
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground">Image URL (replaces icon)</Label>
            <Input
              value={ds.custom_image_url || ''}
              onChange={(e) => updateField('custom_image_url', e.target.value)}
              placeholder="https://... or upload in Asset Library"
              className="h-8 text-xs"
            />
          </div>
          {ds.custom_image_url && (
            <div className="flex items-center gap-3">
              <img
                src={ds.custom_image_url}
                alt="Preview"
                className="h-14 w-14 object-contain rounded-lg border border-border/30 bg-muted/20 p-1"
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

      {/* ── Section 4: Badge ────────────────────────────── */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground border-b border-border/20 pb-2">
            <Tag className="h-3.5 w-3.5" /> Badge
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground">Badge Text</Label>
              <Input
                value={ds.badge_text || ''}
                onChange={(e) => updateField('badge_text', e.target.value)}
                placeholder="e.g. New, Popular, Pro"
                className="h-8 text-xs"
              />
            </div>
            {ds.badge_text && (
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground">Badge Color</Label>
                <ColorPickerPopover
                  value={ds.badge_color || '#f97316'}
                  onChange={(v) => updateField('badge_color', v)}
                />
              </div>
            )}
          </div>
          {ds.badge_text && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Preview:</span>
              <span
                className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full text-white"
                style={{ background: ds.badge_color || '#f97316' }}
              >
                {ds.badge_text}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
