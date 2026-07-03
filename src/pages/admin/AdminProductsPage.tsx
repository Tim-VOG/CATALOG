import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { usePaginated } from '@/hooks/use-paginated'
import { motion, AnimatePresence } from 'motion/react'
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useDeleteProducts } from '@/hooks/use-products'
import { useCreateQRCodes } from '@/hooks/use-qr-codes'
import { useCategories } from '@/hooks/use-categories'
import { Plus, Pencil, Trash2, Search, Package, Box, Layers, AlertTriangle, CheckSquare, X, Copy } from 'lucide-react'
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
import { NO_IMAGE_PLACEHOLDER } from '@/lib/image-placeholder'
import { cn } from '@/lib/utils'

function generateQRCode(prefix = 'VO') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return `${prefix}-${code}`
}

const emptyForm = {
  name: '', description: '', category_id: '', sub_type: '', image_url: '',
  total_stock: 1, includes: [], is_visible: true,
  has_subscription: false, has_apps: false, wifi_only: false, printer_info: false,
}

function BulkDeleteBar({ count, onClear, onDelete, isDeleting  }: any) {
  const { t } = useTranslation()
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
          <span className="text-sm font-semibold">{t('admin.products.selected', { count })}</span>
        </div>

        <div className="h-5 w-px bg-border/60" />

        <Button variant="ghost" size="sm" onClick={onClear} className="text-xs gap-1.5 text-muted-foreground">
          <X className="h-3.5 w-3.5" />
          {t('admin.products.clear')}
        </Button>

        {!confirmOpen ? (
          <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)} className="text-xs gap-1.5">
            <Trash2 className="h-3.5 w-3.5" />
            {t('admin.products.delete')}
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-destructive text-xs font-medium">
              <AlertTriangle className="h-3.5 w-3.5" />
              {t('admin.products.confirmShort')}
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => { onDelete(); setConfirmOpen(false) }}
              disabled={isDeleting}
              className="text-xs"
            >
              {isDeleting ? t('admin.products.deleting') : t('admin.products.yesDelete')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(false)} className="text-xs">
              {t('admin.products.cancel')}
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export function AdminProductsPage() {
  const { t } = useTranslation()
  const { data: products = [], isLoading } = useProducts()
  const { data: categories = [] } = useCategories()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()
  const bulkDelete = useDeleteProducts()
  const createQRCodes = useCreateQRCodes()
  const showToast = useUIStore((s: any) => s.showToast)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>(emptyForm)
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())

  const allIncludesItems = useMemo(() => {
    const set = new Set<string>()
    for (const p of products) {
      for (const item of p.includes || []) {
        for (const part of item.split(/[;,]/)) {
          const trimmed = part.trim()
          if (trimmed) set.add(trimmed)
        }
      }
    }
    return Array.from(set).sort((a: any, b: any) => a.localeCompare(b))
  }, [products])

  const toggleSelect = (id: any) => {
    setSelectedIds((prev: any) => {
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

  const openDuplicate = (product: any) => {
    setEditing(null)
    setForm({
      name: `${product.name} ${t('admin.products.copySuffix')}`, description: product.description || '',
      category_id: product.category_id, sub_type: product.sub_type || '',
      image_url: product.image_url || '', total_stock: 1,
      includes: (product.includes || []).flatMap((s: any) => s.split(/[;,]/).map((t: any) => t.trim()).filter(Boolean)),
      has_subscription: product.has_subscription,
      has_apps: product.has_apps, wifi_only: product.wifi_only, printer_info: product.printer_info,
    })
    setShowForm(true)
  }

  const openEdit = (product: any) => {
    setEditing(product)
    setForm({
      name: product.name, description: product.description || '',
      category_id: product.category_id, sub_type: product.sub_type || '',
      image_url: product.image_url || '', total_stock: product.total_stock,
      is_visible: product.is_visible !== false,
      includes: (product.includes || []).flatMap((s: any) => s.split(/[;,]/).map((t: any) => t.trim()).filter(Boolean)),
      has_subscription: product.has_subscription,
      has_apps: product.has_apps, wifi_only: product.wifi_only, printer_info: product.printer_info,
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    try {
      if (editing) {
        await updateProduct.mutateAsync({ id: editing.id, ...form })
        showToast(t('admin.products.updated'))
      } else {
        const created = await createProduct.mutateAsync(form)
        const stock = Math.max(0, parseInt(String(form.total_stock), 10) || 0)
        if (created?.id && stock > 0) {
          const codes = Array.from({ length: stock }, () => ({
            code: generateQRCode('VO'),
            product_id: created.id,
            is_active: true,
          }))
          await createQRCodes.mutateAsync(codes)
        }
        showToast(stock > 0 ? t('admin.products.createdWithQr', { count: stock }) : t('admin.products.created'))
      }
      setShowForm(false)
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  const handleDelete = async (id: any) => {
    if (!confirm(t('admin.products.confirmDelete'))) return
    try {
      await deleteProduct.mutateAsync(id)
      showToast(t('admin.products.deleted'))
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  const handleBulkDelete = async () => {
    try {
      await bulkDelete.mutateAsync(Array.from(selectedIds))
      showToast(t('admin.products.bulkDeleted', { count: selectedIds.size }))
      setSelectedIds(new Set())
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  const filtered = useMemo(() => products.filter((p: any) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) || (p.category_name || '').toLowerCase().includes(q)
  }), [products, search])

  const { items: visibleProducts, hasMore, loadMore, total, reset: resetPagination } = usePaginated(filtered, 60)
  useEffect(() => { resetPagination() }, [search, resetPagination])

  if (isLoading) return <PageLoading />

  const suggestions: string[] = allIncludesItems.filter((item: string) => !form.includes.includes(item))

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('admin.products.title')} description={t('admin.products.subtitle', { count: products.length })}>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> {t('admin.products.add')}
        </Button>
      </AdminPageHeader>

      {/* Quick stats bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-muted/30 rounded-full px-4 py-1.5 text-sm">
          <Package className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold">{products.length}</span>
          <span className="text-muted-foreground">{t('admin.products.statProducts')}</span>
        </div>
        <div className="flex items-center gap-2 bg-muted/30 rounded-full px-4 py-1.5 text-sm">
          <Box className="h-3.5 w-3.5 text-accent" />
          <span className="font-semibold">{products.reduce((sum: any, p: any) => sum + (p.total_stock || 0), 0)}</span>
          <span className="text-muted-foreground">{t('admin.products.statTotalStock')}</span>
        </div>
        <div className="flex items-center gap-2 bg-muted/30 rounded-full px-4 py-1.5 text-sm">
          <AlertTriangle className="h-3.5 w-3.5 text-warning" />
          <span className="font-semibold">{products.filter((p: any) => p.total_stock <= 1).length}</span>
          <span className="text-muted-foreground">{t('admin.products.statLowStock')}</span>
        </div>
        <div className="flex items-center gap-2 bg-muted/30 rounded-full px-4 py-1.5 text-sm">
          <Layers className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-semibold">{categories.length}</span>
          <span className="text-muted-foreground">{t('admin.products.statCategories')}</span>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e: any) => setSearch(e.target.value)}
          placeholder={t('admin.products.searchPlaceholder')}
          className="pl-10 rounded-full"
        />
      </div>

      {/* Product grid */}
      {filtered.length === 0 ? (
        <EmptyState icon={Package} title={t('admin.products.empty')} description={search ? t('admin.products.emptySearch') : t('admin.products.emptyAdd')} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visibleProducts.map((p: any, i: any) => {
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
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    <BlurImage
                      src={p.image_url || NO_IMAGE_PLACEHOLDER}
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
                    <div className={cn(
                      'absolute top-2.5 right-2.5 transition-opacity',
                      isSelected || selectedIds.size > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                    )}>
                      <button
                        onClick={(e: any) => { e.stopPropagation(); toggleSelect(p.id) }}
                        className={cn(
                          'h-7 w-7 rounded-md flex items-center justify-center shadow-md transition-all cursor-pointer',
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background/80 backdrop-blur-sm hover:bg-background text-muted-foreground',
                        )}
                        aria-label={isSelected ? t('admin.products.deselectAria', { name: p.name }) : t('admin.products.selectAria', { name: p.name })}
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <div className="h-4 w-4 rounded border-2 border-current" />
                        )}
                      </button>
                    </div>
                    {selectedIds.size === 0 && (
                      <div className="absolute bottom-2.5 right-2.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background shadow-md"
                          onClick={() => openDuplicate(p)}
                          aria-label={t('admin.products.duplicateAria', { name: p.name })}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background shadow-md"
                          onClick={() => openEdit(p)}
                          aria-label={t('admin.products.editAria', { name: p.name })}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-destructive hover:text-destructive-foreground shadow-md"
                          onClick={() => handleDelete(p.id)}
                          aria-label={t('admin.products.deleteAria', { name: p.name })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

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
                        <span className="text-muted-foreground text-xs">{t('admin.products.inStock')}</span>
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

      {hasMore && (
        <div className="flex items-center justify-center">
          <Button variant="outline" size="sm" onClick={loadMore} className="text-xs">
            {t('admin.products.loadMore', { count: total - visibleProducts.length })}
          </Button>
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

      {/* ─── Edit / Create Dialog ─────────────────────────────────── */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent size="xl">
          <DialogHeader>
            <DialogTitle>{editing ? t('admin.products.dialogEdit') : t('admin.products.dialogAdd')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 max-h-[75vh] overflow-y-auto px-1 py-1">

            {/* Row 1 — Name (full width) */}
            <div className="space-y-1">
              <Label>{t('admin.products.name')} *</Label>
              <Input value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} placeholder={t('admin.products.namePlaceholder')} />
            </div>

            {/* Row 2 — Category + Sub-type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>{t('admin.products.category')}</Label>
                <Select value={form.category_id} onChange={(e: any) => setForm({ ...form, category_id: e.target.value })}>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t('admin.products.subType')}</Label>
                <Input value={form.sub_type} onChange={(e: any) => setForm({ ...form, sub_type: e.target.value })} placeholder={t('admin.products.subTypePlaceholder')} />
              </div>
            </div>

            {/* Row 3 — Image (full width) */}
            <div className="space-y-1">
              <Label>{t('admin.products.image')}</Label>
              <ImageUpload
                value={form.image_url}
                onChange={(url: any) => setForm({ ...form, image_url: url })}
                bucket="product-images"
                requiredWidth={400}
                requiredHeight={300}
              />
            </div>

            {/* Row 4 — Stock + Description side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <div className="space-y-1">
                <Label>{t('admin.products.stock')} *</Label>
                <Input type="number" min="0" value={form.total_stock} onChange={(e: any) => setForm({ ...form, total_stock: parseInt(e.target.value) || 0 })} />
                {editing && <p className="text-[10px] text-muted-foreground">{t('admin.products.stockHint')}</p>}
              </div>
              <div className="space-y-1">
                <Label>{t('admin.products.description')}</Label>
                <Textarea value={form.description} onChange={(e: any) => setForm({ ...form, description: e.target.value })} rows={3} placeholder={t('admin.products.descriptionPlaceholder')} />
              </div>
            </div>

            {/* Row 5 — Included items (full width) */}
            <div className="space-y-1.5">
              <Label>{t('admin.products.includedItems')}</Label>
              <TagInput
                value={form.includes}
                onChange={(tags: any) => setForm({ ...form, includes: tags })}
                placeholder={t('admin.products.includedPlaceholder')}
              />
              {suggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {suggestions.map((item: any) => (
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

            {/* Row 6 — Product flags */}
            <div className="space-y-2">
              <Label>{t('admin.products.flags')}</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  ['is_visible', t('admin.products.flagVisible')],
                  ['has_subscription', t('admin.products.flagSubscription')],
                  ['has_apps', t('admin.products.flagApps')],
                  ['wifi_only', t('admin.products.flagWifi')],
                  ['printer_info', t('admin.products.flagPrinter')],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={form[key]} onCheckedChange={(v: any) => setForm({ ...form, [key]: v })} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>{t('admin.products.cancel')}</Button>
            <Button onClick={handleSave}>{t('admin.products.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
