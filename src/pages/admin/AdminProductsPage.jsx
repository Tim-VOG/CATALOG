import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useDeleteProducts } from '@/hooks/use-products'
import { useCategories } from '@/hooks/use-categories'
import { Plus, Pencil, Trash2, Search, Package, Box, Layers, AlertTriangle, CheckSquare, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CategoryBadge } from '@/components/common/CategoryBadge'
import { BlurImage } from '@/components/common/BlurImage'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { ImageUpload } from '@/components/admin/ImageUpload'
import { TagInput } from '@/components/ui/tag-input'
import { EmptyState } from '@/components/common/EmptyState'
import { ScrollFadeIn } from '@/components/ui/motion'
import { useUIStore } from '@/stores/ui-store'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { cn } from '@/lib/utils'

const emptyForm = {
  name: '', description: '', category_id: '', sub_type: '', image_url: '',
  total_stock: 1, includes: [], has_accessories: false, has_software: false,
  has_subscription: false, has_apps: false, wifi_only: false, printer_info: false,
}

function BulkDeleteBar({ count, onClear, onDelete, isDeleting }) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-card border border-border shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{count} selected</span>
        </div>

        <div className="h-5 w-px bg-border/60" />

        <Button variant="ghost" size="sm" onClick={onClear} className="text-xs gap-1.5 text-muted-foreground">
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>

        {!confirmOpen ? (
          <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)} className="text-xs gap-1.5">
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-destructive text-xs font-medium">
              <AlertTriangle className="h-3.5 w-3.5" />
              Confirm?
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => { onDelete(); setConfirmOpen(false) }}
              disabled={isDeleting}
              className="text-xs"
            >
              {isDeleting ? 'Deleting...' : 'Yes, delete'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(false)} className="text-xs">
              Cancel
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export function AdminProductsPage() {
  const { data: products = [], isLoading } = useProducts()
  const { data: categories = [] } = useCategories()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()
  const bulkDelete = useDeleteProducts()
  const showToast = useUIStore((s) => s.showToast)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())

  // Collect all unique included items across products for suggestions
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

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const openCreate = () => {
    setEditing(null)
    setForm({ ...emptyForm, category_id: categories[0]?.id || '' })
    setShowForm(true)
  }

  const openEdit = (product) => {
    setEditing(product)
    setForm({
      name: product.name, description: product.description || '',
      category_id: product.category_id, sub_type: product.sub_type || '',
      image_url: product.image_url || '', total_stock: product.total_stock,
      includes: (product.includes || []).flatMap((s) => s.split(/[;,]/).map((t) => t.trim()).filter(Boolean)),
      has_accessories: product.has_accessories,
      has_software: product.has_software, has_subscription: product.has_subscription,
      has_apps: product.has_apps, wifi_only: product.wifi_only, printer_info: product.printer_info,
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    try {
      if (editing) {
        await updateProduct.mutateAsync({ id: editing.id, ...form })
        showToast('Product updated')
      } else {
        await createProduct.mutateAsync(form)
        showToast('Product created')
      }
      setShowForm(false)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return
    try {
      await deleteProduct.mutateAsync(id)
      showToast('Product deleted')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleBulkDelete = async () => {
    try {
      await bulkDelete.mutateAsync(Array.from(selectedIds))
      showToast(`${selectedIds.size} product${selectedIds.size > 1 ? 's' : ''} deleted`)
      setSelectedIds(new Set())
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  if (isLoading) return <PageLoading />

  const filtered = products.filter((p) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) || (p.category_name || '').toLowerCase().includes(q)
  })

  // Suggestions = all known items minus what's already in the form
  const suggestions = allIncludesItems.filter((item) => !form.includes.includes(item))

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Products" description={`${products.length} products in catalog`}>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </AdminPageHeader>

      {/* Quick stats bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-muted/30 rounded-full px-4 py-1.5 text-sm">
          <Package className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold">{products.length}</span>
          <span className="text-muted-foreground">products</span>
        </div>
        <div className="flex items-center gap-2 bg-muted/30 rounded-full px-4 py-1.5 text-sm">
          <Box className="h-3.5 w-3.5 text-accent" />
          <span className="font-semibold">{products.reduce((sum, p) => sum + (p.total_stock || 0), 0)}</span>
          <span className="text-muted-foreground">total stock</span>
        </div>
        <div className="flex items-center gap-2 bg-muted/30 rounded-full px-4 py-1.5 text-sm">
          <AlertTriangle className="h-3.5 w-3.5 text-warning" />
          <span className="font-semibold">{products.filter((p) => p.total_stock <= 1).length}</span>
          <span className="text-muted-foreground">low stock</span>
        </div>
        <div className="flex items-center gap-2 bg-muted/30 rounded-full px-4 py-1.5 text-sm">
          <Layers className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-semibold">{categories.length}</span>
          <span className="text-muted-foreground">categories</span>
        </div>
      </div>

      {/* Search bar — pill style */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="pl-10 rounded-full"
        />
      </div>

      {/* Product grid */}
      {filtered.length === 0 ? (
        <EmptyState icon={Package} title="No products found" description={search ? 'Try a different search term' : 'Add your first product to get started'} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((p, i) => {
            const isSelected = selectedIds.has(p.id)
            return (
              <ScrollFadeIn key={p.id} delay={i * 0.04}>
                <Card
                  variant="elevated"
                  className={cn(
                    'overflow-hidden group h-full flex flex-col transition-all',
                    isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                  )}
                >
                  {/* Image */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    <BlurImage
                      src={p.image_url || 'https://via.placeholder.com/400x300?text=No+Image'}
                      alt={p.name}
                      className="transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                    <CategoryBadge
                      className="absolute top-2.5 left-2.5"
                      name={p.category_name}
                      color={p.category_color}
                      subType={p.sub_type}
                    />
                    {/* Selection checkbox */}
                    <div className={cn(
                      'absolute top-2.5 right-2.5 transition-opacity',
                      isSelected || selectedIds.size > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                    )}>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSelect(p.id) }}
                        className={cn(
                          'h-7 w-7 rounded-md flex items-center justify-center shadow-md transition-all cursor-pointer',
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background/80 backdrop-blur-sm hover:bg-background text-muted-foreground',
                        )}
                        aria-label={isSelected ? `Deselect ${p.name}` : `Select ${p.name}`}
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <div className="h-4 w-4 rounded border-2 border-current" />
                        )}
                      </button>
                    </div>
                    {/* Hover action overlay — only when not in bulk select mode */}
                    {selectedIds.size === 0 && (
                      <div className="absolute bottom-2.5 right-2.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background shadow-md"
                          onClick={() => openEdit(p)}
                          aria-label={`Edit ${p.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-destructive hover:text-destructive-foreground shadow-md"
                          onClick={() => handleDelete(p.id)}
                          aria-label={`Delete ${p.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <CardContent className="p-5 flex-1 flex flex-col">
                    <h3 className="font-semibold text-sm leading-tight truncate">{p.name}</h3>
                    {p.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{p.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-auto pt-3 border-t mt-3">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Box className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className={cn(
                          'font-bold',
                          p.total_stock > 3 ? 'text-success' : p.total_stock > 0 ? 'text-warning' : 'text-destructive'
                        )}>
                          {p.total_stock}
                        </span>
                        <span className="text-muted-foreground text-xs">in stock</span>
                      </div>
                      <div className="flex gap-1 sm:hidden">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(p.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </ScrollFadeIn>
            )
          })}
        </div>
      )}

      {/* Bulk delete floating bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <BulkDeleteBar
            count={selectedIds.size}
            onClear={() => setSelectedIds(new Set())}
            onDelete={handleBulkDelete}
            isDeleting={bulkDelete.isPending}
          />
        )}
      </AnimatePresence>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Product' : 'Add Product'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Sub-type</Label>
                <Input value={form.sub_type} onChange={(e) => setForm({ ...form, sub_type: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Product Image</Label>
              <ImageUpload
                value={form.image_url}
                onChange={(url) => setForm({ ...form, image_url: url })}
                bucket="product-images"
                requiredWidth={400}
                requiredHeight={300}
              />
            </div>
            <div className="space-y-1">
              <Label>Stock *</Label>
              <Input type="number" min="1" value={form.total_stock} onChange={(e) => setForm({ ...form, total_stock: parseInt(e.target.value) || 1 })} />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Included items</Label>
              <TagInput
                value={form.includes}
                onChange={(tags) => setForm({ ...form, includes: tags })}
                placeholder="Type item and press Enter..."
              />
              {/* Suggestion chips from existing items */}
              {suggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {suggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setForm({ ...form, includes: [...form.includes, item] })}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border/50 transition-colors cursor-pointer"
                    >
                      <Plus className="h-2.5 w-2.5" />
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Options</Label>
              <div className="flex flex-wrap gap-4">
                {[
                  ['has_accessories', 'Accessories'], ['has_software', 'Software'],
                  ['has_subscription', 'Subscription'], ['has_apps', 'Apps'],
                  ['wifi_only', 'WiFi only'], ['printer_info', 'Printer'],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form[key]} onCheckedChange={(v) => setForm({ ...form, [key]: v })} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
