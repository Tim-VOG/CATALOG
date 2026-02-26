import { useState } from 'react'
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from '@/hooks/use-products'
import { useCategories } from '@/hooks/use-categories'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CategoryBadge } from '@/components/common/CategoryBadge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { ResponsiveTable } from '@/components/admin/ResponsiveTable'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { ImageUpload } from '@/components/admin/ImageUpload'
import { useUIStore } from '@/stores/ui-store'

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold">Products</h1>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </div>

      <ResponsiveTable
        columns={[
          { key: 'product', label: 'Product' },
          { key: 'category', label: 'Category' },
          { key: 'stock', label: 'Stock' },
          { key: 'actions', label: 'Actions', className: 'w-24' },
        ]}
        data={products}
        keyExtractor={(p) => p.id}
        renderRow={(p) => (
          <>
            <TableCell>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded overflow-hidden bg-muted shrink-0">
                  <img src={p.image_url || 'https://via.placeholder.com/40'} alt="" className="h-full w-full object-cover" />
                </div>
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[300px]">{p.description}</div>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <CategoryBadge name={p.category_name} color={p.category_color} />
            </TableCell>
            <TableCell>{p.total_stock}</TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(p)} aria-label={`Edit ${p.name}`}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(p.id)} aria-label={`Delete ${p.name}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </TableCell>
          </>
        )}
        renderMobileCard={(p) => (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-lg overflow-hidden bg-muted shrink-0">
                  <img src={p.image_url || 'https://via.placeholder.com/56'} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="font-medium truncate">{p.name}</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <CategoryBadge name={p.category_name} color={p.category_color} />
                    <span className="text-xs text-muted-foreground">Stock: {p.total_stock}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => openEdit(p)} aria-label={`Edit ${p.name}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => handleDelete(p.id)} aria-label={`Delete ${p.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      />

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
