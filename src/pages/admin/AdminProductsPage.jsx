import { useState } from 'react'
import { motion } from 'motion/react'
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from '@/hooks/use-products'
import { useCategories } from '@/hooks/use-categories'
import { Plus, Pencil, Trash2, Search, Package, Box } from 'lucide-react'
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
import { EmptyState } from '@/components/common/EmptyState'
import { ScrollFadeIn } from '@/components/ui/motion'
import { useUIStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'

const emptyForm = {
  name: '', description: '', category_id: '', sub_type: '', image_url: '',
  total_stock: 1, includes: [], has_accessories: false, has_software: false,
  has_subscription: false, has_apps: false, wifi_only: false, printer_info: false,
}

export function AdminProductsPage() {
  const { data: products = [], isLoading } = useProducts()
  const { data: categories = [] } = useCategories()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()
  const showToast = useUIStore((s) => s.showToast)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [search, setSearch] = useState('')

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
      includes: product.includes || [], has_accessories: product.has_accessories,
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

  if (isLoading) return <PageLoading />

  const filtered = products.filter((p) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) || (p.category_name || '').toLowerCase().includes(q)
  })

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-gradient-primary">Products</h1>
          <p className="text-muted-foreground mt-1">{products.length} products in catalog</p>
          <motion.div
            className="mt-3 h-0.5 w-16 rounded-full bg-primary/60"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{ originX: 0 }}
          />
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </div>

      {/* Search bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="pl-9"
        />
      </div>

      {/* Product grid */}
      {filtered.length === 0 ? (
        <EmptyState icon={Package} title="No products found" description={search ? 'Try a different search term' : 'Add your first product to get started'} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((p, i) => (
            <ScrollFadeIn key={p.id} delay={i * 0.04}>
              <Card variant="elevated" className="overflow-hidden group h-full flex flex-col">
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
                  {/* Hover action overlay */}
                  <div className="absolute top-2.5 right-2.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                </div>

                {/* Info */}
                <CardContent className="p-4 flex-1 flex flex-col">
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
          ))}
        </div>
      )}

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
            <div className="space-y-1">
              <Label>Included items (comma-separated)</Label>
              <Input
                value={form.includes.join(', ')}
                onChange={(e) => setForm({ ...form, includes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
              />
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
