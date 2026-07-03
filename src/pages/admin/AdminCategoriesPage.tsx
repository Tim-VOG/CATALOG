import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCategories, useCreateCategory, useDeleteCategory } from '@/hooks/use-categories'
import { Plus, Trash2, FolderTree } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { EmptyState } from '@/components/common/EmptyState'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { useUIStore } from '@/stores/ui-store'

export function AdminCategoriesPage() {
  const { t } = useTranslation()
  const { data: categories = [], isLoading } = useCategories()
  const createCategory = useCreateCategory()
  const deleteCategory = useDeleteCategory()
  const showToast = useUIStore((s: any) => s.showToast)

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#6b7280')

  const handleCreate = async () => {
    if (!name.trim()) return
    try {
      await createCategory.mutateAsync({ name: name.trim(), color })
      showToast(t('admin.categories.created'))
      setShowForm(false)
      setName('')
      setColor('#6b7280')
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  const handleDelete = async (id: any) => {
    if (!confirm(t('admin.categories.confirmDelete'))) return
    try {
      await deleteCategory.mutateAsync(id)
      showToast(t('admin.categories.deleted'))
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('admin.categories.title')} description={t('admin.categories.count', { count: categories.length })}>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" /> {t('admin.categories.add')}
        </Button>
      </AdminPageHeader>

      {categories.length === 0 ? (
        <EmptyState icon={FolderTree} title={t('admin.categories.empty')} description={t('admin.categories.emptyDesc')} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat: any) => (
            <Card key={cat.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">{cat.name}</CardTitle>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(cat.id)} aria-label={t('admin.categories.deleteAria', { name: cat.name })}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardHeader>
              <CardContent>
                <Badge style={{ backgroundColor: cat.color || '#6b7280' }}>{cat.name}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.categories.add')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>{t('admin.categories.name')}</Label>
              <Input value={name} onChange={(e: any) => setName(e.target.value)} placeholder={t('admin.categories.namePlaceholder')} />
            </div>
            <div className="space-y-1">
              <Label>{t('admin.categories.color')}</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={color} onChange={(e: any) => setColor(e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
                <Badge style={{ backgroundColor: color }}>{t('admin.categories.preview')}</Badge>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>{t('admin.categories.cancel')}</Button>
            <Button onClick={handleCreate}>{t('admin.categories.create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
