import { useState } from 'react'
import { useAllProductOptions, useCreateProductOption, useUpdateProductOption, useDeleteProductOption } from '@/hooks/use-product-options'
import { useAllSubscriptionPlans, useCreateSubscriptionPlan, useUpdateSubscriptionPlan, useDeleteSubscriptionPlan } from '@/hooks/use-subscription-plans'
import { Plus, Pencil, Trash2, Keyboard, Monitor, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { useUIStore } from '@/stores/ui-store'

// ─── Option Section (accessories / software) ─────────────────────
function OptionSection({ title, icon: Icon, options, optionType, onCreate, onUpdate, onDelete }) {
  const showToast = useUIStore((s) => s.showToast)
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState(null)
  const [label, setLabel] = useState('')

  const openCreate = () => {
    setEditing(null)
    setLabel('')
    setShowDialog(true)
  }

  const openEdit = (opt) => {
    setEditing(opt)
    setLabel(opt.label)
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!label.trim()) {
      showToast('Label is required', 'error')
      return
    }
    try {
      if (editing) {
        await onUpdate({ id: editing.id, label: label.trim() })
        showToast('Option updated')
      } else {
        const value = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
        await onCreate({
          option_type: optionType,
          label: label.trim(),
          value,
          sort_order: options.length,
        })
        showToast('Option created')
      }
      setShowDialog(false)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleToggle = async (opt) => {
    try {
      await onUpdate({ id: opt.id, is_active: !opt.is_active })
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleDelete = async (opt) => {
    if (!confirm(`Delete "${opt.label}"?`)) return
    try {
      await onDelete(opt.id)
      showToast('Option deleted')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Icon className="h-4 w-4" /> {title}
          </CardTitle>
          <Button size="sm" onClick={openCreate} className="gap-2">
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No options yet</p>
        ) : (
          <div className="space-y-2">
            {options.map((opt) => (
              <div
                key={opt.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${!opt.is_active ? 'opacity-50' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm">{opt.label}</span>
                  <span className="ml-2 text-[10px] text-muted-foreground font-mono">{opt.value}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggle(opt)} aria-label={`Toggle ${opt.name}`}>
                    <Badge className={opt.is_active ? 'bg-green-500/20 text-green-400 text-[10px]' : 'bg-red-500/20 text-red-400 text-[10px]'}>
                      {opt.is_active ? 'On' : 'Off'}
                    </Badge>
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(opt)} aria-label={`Edit ${opt.name}`}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(opt)} aria-label={`Delete ${opt.name}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Option' : `Add ${title.slice(0, -1)}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Label *</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. USB Hub"
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ─── Subscription Plans Section ──────────────────────────────────
function SubscriptionSection({ plans, onCreate, onUpdate, onDelete }) {
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
        await onUpdate({ id: editing.id, ...form })
        showToast('Plan updated')
      } else {
        await onCreate(form)
        showToast('Plan created')
      }
      setShowDialog(false)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleToggle = async (plan) => {
    try {
      await onUpdate({ id: plan.id, is_active: !plan.is_active })
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleDelete = async (plan) => {
    if (!confirm(`Delete "${plan.name}"?`)) return
    try {
      await onDelete(plan.id)
      showToast('Plan deleted')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const typeLabel = (t) => ({ call: 'Call', data: 'Data', both: 'Call + Data' }[t] || t)
  const typeColor = (t) => ({ call: 'bg-blue-500/20 text-blue-400', data: 'bg-purple-500/20 text-purple-400', both: 'bg-cyan-500/20 text-cyan-400' }[t] || '')

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Subscription Plans
          </CardTitle>
          <Button size="sm" onClick={openCreate} className="gap-2">
            <Plus className="h-3.5 w-3.5" /> Add Plan
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {plans.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No plans yet</p>
        ) : (
          <div className="space-y-2">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${!plan.is_active ? 'opacity-50' : ''}`}
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
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggle(plan)} aria-label={`Toggle ${plan.name}`}>
                    <Badge className={plan.is_active ? 'bg-green-500/20 text-green-400 text-[10px]' : 'bg-red-500/20 text-red-400 text-[10px]'}>
                      {plan.is_active ? 'On' : 'Off'}
                    </Badge>
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(plan)} aria-label={`Edit ${plan.name}`}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(plan)} aria-label={`Delete ${plan.name}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

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
    </Card>
  )
}

// ─── Main Page ───────────────────────────────────────────────────
export function AdminProductOptionsPage() {
  const { data: productOptions = [], isLoading: optionsLoading } = useAllProductOptions()
  const { data: subscriptionPlans = [], isLoading: plansLoading } = useAllSubscriptionPlans()

  const createOption = useCreateProductOption()
  const updateOption = useUpdateProductOption()
  const deleteOption = useDeleteProductOption()

  const createPlan = useCreateSubscriptionPlan()
  const updatePlan = useUpdateSubscriptionPlan()
  const deletePlan = useDeleteSubscriptionPlan()

  const accessories = productOptions.filter((o) => o.option_type === 'accessory')
  const software = productOptions.filter((o) => o.option_type === 'software')

  if (optionsLoading || plansLoading) return <PageLoading />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Product Options</h1>
        <p className="text-muted-foreground mt-1">
          Manage accessories, software, and subscription plans available during checkout
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OptionSection
          title="Accessories"
          icon={Keyboard}
          options={accessories}
          optionType="accessory"
          onCreate={createOption.mutateAsync}
          onUpdate={updateOption.mutateAsync}
          onDelete={deleteOption.mutateAsync}
        />

        <OptionSection
          title="Software"
          icon={Monitor}
          options={software}
          optionType="software"
          onCreate={createOption.mutateAsync}
          onUpdate={updateOption.mutateAsync}
          onDelete={deleteOption.mutateAsync}
        />
      </div>

      <SubscriptionSection
        plans={subscriptionPlans}
        onCreate={createPlan.mutateAsync}
        onUpdate={updatePlan.mutateAsync}
        onDelete={deletePlan.mutateAsync}
      />
    </div>
  )
}
