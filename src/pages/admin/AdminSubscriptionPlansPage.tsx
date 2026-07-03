import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAllSubscriptionPlans, useCreateSubscriptionPlan, useUpdateSubscriptionPlan, useDeleteSubscriptionPlan } from '@/hooks/use-subscription-plans'
import { Plus, Pencil, Trash2, CreditCard, Phone, Wifi, PhoneCall } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { useUIStore } from '@/stores/ui-store'

const typeLabel = (translate: any, type: any) => translate(`admin.subscriptionPlans.${({ call: 'typeCall', data: 'typeData', both: 'typeCombo' } as Record<string, any>)[type] || 'typeCall'}`)
const typeColor = (t: any) => (({
  call: 'bg-blue-500/20 text-blue-400',
  data: 'bg-purple-500/20 text-purple-400',
  both: 'bg-cyan-500/20 text-cyan-400',
} as Record<string, any>)[t] || '')
const typeIcon = (t: any) => (({
  call: PhoneCall,
  data: Wifi,
  both: Phone,
} as Record<string, any>)[t] || CreditCard)

export function AdminSubscriptionPlansPage() {
  const { t } = useTranslation()
  const { data: plans = [], isLoading } = useAllSubscriptionPlans()
  const createPlan = useCreateSubscriptionPlan()
  const updatePlan = useUpdateSubscriptionPlan()
  const deletePlan = useDeleteSubscriptionPlan()
  const showToast = useUIStore((s: any) => s.showToast)

  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>({ name: '', type: 'call', price: '', description: '' })

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', type: 'call', price: '', description: '' })
    setShowDialog(true)
  }

  const openEdit = (plan: any) => {
    setEditing(plan)
    setForm({
      name: plan.name,
      type: plan.type,
      price: plan.price,
      description: plan.description || '',
    })
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.price.trim()) {
      showToast(t('admin.subscriptionPlans.nameAndPriceRequired'), 'error')
      return
    }
    try {
      if (editing) {
        await updatePlan.mutateAsync({ id: editing.id, ...form })
        showToast(t('admin.subscriptionPlans.planUpdated'))
      } else {
        await createPlan.mutateAsync(form)
        showToast(t('admin.subscriptionPlans.planCreated'))
      }
      setShowDialog(false)
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  const handleToggle = async (plan: any) => {
    try {
      await updatePlan.mutateAsync({ id: plan.id, is_active: !plan.is_active })
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  const handleDelete = async (plan: any) => {
    if (!confirm(t('admin.subscriptionPlans.deleteConfirm', { name: plan.name }))) return
    try {
      await deletePlan.mutateAsync(plan.id)
      showToast(t('admin.subscriptionPlans.planDeleted'))
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  if (isLoading) return <PageLoading />

  // Group plans by type
  const callPlans = plans.filter((p: any) => p.type === 'call')
  const dataPlans = plans.filter((p: any) => p.type === 'data')
  const comboPlans = plans.filter((p: any) => p.type === 'both')

  const renderPlanGroup = (title: any, icon: any, groupPlans: any) => {
    const Icon = icon
    if (groupPlans.length === 0) return null
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <Icon className="h-3.5 w-3.5" /> {title}
        </h3>
        {groupPlans.map((plan: any) => (
          <div
            key={plan.id}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${!plan.is_active ? 'opacity-50' : ''}`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{plan.name}</span>
                <Badge className={`text-[10px] ${typeColor(plan.type)}`}>{typeLabel(t, plan.type)}</Badge>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">{plan.price}</span>
                {plan.description && (
                  <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">— {plan.description}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => handleToggle(plan)}>
                <Badge className={plan.is_active ? 'bg-green-500/20 text-green-400 text-[10px]' : 'bg-red-500/20 text-red-400 text-[10px]'}>
                  {plan.is_active ? t('admin.subscriptionPlans.statusOn') : t('admin.subscriptionPlans.statusOff')}
                </Badge>
              </Button>
              <Button variant="ghost" size="icon" onClick={() => openEdit(plan)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(plan)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('admin.subscriptionPlans.pageTitle')} description={t('admin.subscriptionPlans.pageDescription')} section={t('admin.eyebrow.inventory')}>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> {t('admin.subscriptionPlans.addPlan')}
        </Button>
      </AdminPageHeader>

      {/* Stats */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-muted/30 rounded-full px-4 py-1.5 text-sm">
          <CreditCard className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold">{plans.length}</span>
          <span className="text-muted-foreground">{t('admin.subscriptionPlans.totalPlans')}</span>
        </div>
        <div className="flex items-center gap-2 bg-muted/30 rounded-full px-4 py-1.5 text-sm">
          <span className="font-semibold text-green-400">{plans.filter((p: any) => p.is_active).length}</span>
          <span className="text-muted-foreground">{t('admin.subscriptionPlans.active')}</span>
        </div>
      </div>

      {plans.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={t('admin.subscriptionPlans.emptyTitle')}
          description={t('admin.subscriptionPlans.emptyDescription')}
        />
      ) : (
        <Card>
          <CardContent className="p-6 space-y-6">
            {renderPlanGroup(t('admin.subscriptionPlans.callPlans'), PhoneCall, callPlans)}
            {renderPlanGroup(t('admin.subscriptionPlans.dataPlans'), Wifi, dataPlans)}
            {renderPlanGroup(t('admin.subscriptionPlans.comboPlans'), Phone, comboPlans)}
          </CardContent>
        </Card>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? t('admin.subscriptionPlans.editPlan') : t('admin.subscriptionPlans.addSubscriptionPlan')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>{t('admin.subscriptionPlans.nameLabel')}</Label>
              <Input
                value={form.name}
                onChange={(e: any) => setForm({ ...form, name: e.target.value })}
                placeholder={t('admin.subscriptionPlans.namePlaceholder')}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('admin.subscriptionPlans.typeLabel')}</Label>
              <Select value={form.type} onChange={(e: any) => setForm({ ...form, type: e.target.value })}>
                <option value="call">{t('admin.subscriptionPlans.typeCall')}</option>
                <option value="data">{t('admin.subscriptionPlans.typeData')}</option>
                <option value="both">{t('admin.subscriptionPlans.typeCombo')}</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t('admin.subscriptionPlans.priceLabel')}</Label>
              <Input
                value={form.price}
                onChange={(e: any) => setForm({ ...form, price: e.target.value })}
                placeholder={t('admin.subscriptionPlans.pricePlaceholder')}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('admin.subscriptionPlans.descriptionLabel')}</Label>
              <Textarea
                value={form.description}
                onChange={(e: any) => setForm({ ...form, description: e.target.value })}
                placeholder={t('admin.subscriptionPlans.descriptionPlaceholder')}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>{t('admin.subscriptionPlans.cancel')}</Button>
            <Button onClick={handleSave}>{t('admin.subscriptionPlans.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
