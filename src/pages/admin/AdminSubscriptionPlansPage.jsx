import { useState } from 'react'
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

const typeLabel = (t) => ({ call: 'Call', data: 'Data', both: 'Call + Data' }[t] || t)
const typeColor = (t) => ({
  call: 'bg-blue-500/20 text-blue-400',
  data: 'bg-purple-500/20 text-purple-400',
  both: 'bg-cyan-500/20 text-cyan-400',
}[t] || '')
const typeIcon = (t) => ({
  call: PhoneCall,
  data: Wifi,
  both: Phone,
}[t] || CreditCard)

export function AdminSubscriptionPlansPage() {
  const { data: plans = [], isLoading } = useAllSubscriptionPlans()
  const createPlan = useCreateSubscriptionPlan()
  const updatePlan = useUpdateSubscriptionPlan()
  const deletePlan = useDeleteSubscriptionPlan()
  const showToast = useUIStore((s) => s.showToast)

  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', type: 'call', price: '', description: '' })

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', type: 'call', price: '', description: '' })
    setShowDialog(true)
  }

  const openEdit = (plan) => {
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
      showToast('Name and price are required', 'error')
      return
    }
    try {
      if (editing) {
        await updatePlan.mutateAsync({ id: editing.id, ...form })
        showToast('Plan updated')
      } else {
        await createPlan.mutateAsync(form)
        showToast('Plan created')
      }
      setShowDialog(false)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleToggle = async (plan) => {
    try {
      await updatePlan.mutateAsync({ id: plan.id, is_active: !plan.is_active })
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleDelete = async (plan) => {
    if (!confirm(`Delete "${plan.name}"?`)) return
    try {
      await deletePlan.mutateAsync(plan.id)
      showToast('Plan deleted')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  if (isLoading) return <PageLoading />

  // Group plans by type
  const callPlans = plans.filter((p) => p.type === 'call')
  const dataPlans = plans.filter((p) => p.type === 'data')
  const comboPlans = plans.filter((p) => p.type === 'both')

  const renderPlanGroup = (title, icon, groupPlans) => {
    const Icon = icon
    if (groupPlans.length === 0) return null
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <Icon className="h-3.5 w-3.5" /> {title}
        </h3>
        {groupPlans.map((plan) => (
          <div
            key={plan.id}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${!plan.is_active ? 'opacity-50' : ''}`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{plan.name}</span>
                <Badge className={`text-[10px] ${typeColor(plan.type)}`}>{typeLabel(plan.type)}</Badge>
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
                  {plan.is_active ? 'On' : 'Off'}
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
      <AdminPageHeader title="Subscription Plans" description="Manage call, data, and combo plans linked to equipment requests">
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Add Plan
        </Button>
      </AdminPageHeader>

      {/* Stats */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-muted/30 rounded-full px-4 py-1.5 text-sm">
          <CreditCard className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold">{plans.length}</span>
          <span className="text-muted-foreground">total plans</span>
        </div>
        <div className="flex items-center gap-2 bg-muted/30 rounded-full px-4 py-1.5 text-sm">
          <span className="font-semibold text-green-400">{plans.filter(p => p.is_active).length}</span>
          <span className="text-muted-foreground">active</span>
        </div>
      </div>

      {plans.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No subscription plans"
          description="Add subscription plans that users can select when requesting phones or routers."
        />
      ) : (
        <Card>
          <CardContent className="p-6 space-y-6">
            {renderPlanGroup('Call Plans', PhoneCall, callPlans)}
            {renderPlanGroup('Data Plans', Wifi, dataPlans)}
            {renderPlanGroup('Combo Plans (Call + Data)', Phone, comboPlans)}
          </CardContent>
        </Card>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Plan' : 'Add Subscription Plan'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. 5GB Data Plan"
              />
            </div>
            <div className="space-y-1">
              <Label>Type *</Label>
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="call">Call</option>
                <option value="data">Data</option>
                <option value="both">Call + Data</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Price *</Label>
              <Input
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="e.g. 29€/month"
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional description..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
