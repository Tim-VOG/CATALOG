import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Package, ArrowLeft, CheckCircle2, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useProducts } from '@/hooks/use-products'
import { useCategories } from '@/hooks/use-categories'
import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/api/send-email'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { CategoryBadge } from '@/components/common/CategoryBadge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function EquipmentRequestPage() {
  const { user, profile } = useAuth()
  const { data: products = [] } = useProducts()
  const { data: categories = [] } = useCategories()
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('All')

  const [form, setForm] = useState({
    items: [], // [{ product_id, product_name, quantity }]
    project_name: '',
    justification: '',
    needed_by: '',
    notes: '',
  })

  const filteredProducts = categoryFilter === 'All'
    ? products
    : products.filter(p => p.category_name === categoryFilter)

  const addItem = (product) => {
    if (form.items.some(i => i.product_id === product.id)) return
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { product_id: product.id, product_name: product.name, quantity: 1, image_url: product.image_url, category_name: product.category_name, category_color: product.category_color }],
    }))
  }

  const removeItem = (productId) => {
    setForm(prev => ({ ...prev, items: prev.items.filter(i => i.product_id !== productId) }))
  }

  const updateQty = (productId, qty) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map(i => i.product_id === productId ? { ...i, quantity: Math.max(1, qty) } : i),
    }))
  }

  const canSubmit = form.items.length > 0 && form.project_name

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const submitterName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')

      const { error } = await supabase.from('it_requests').insert({
        type: 'equipment',
        requester_id: user.id,
        requester_email: user.email,
        requester_name: submitterName,
        data: { ...form, submitted_at: new Date().toISOString() },
        status: 'pending',
      })
      if (error) throw error

      const itemList = form.items.map(i => `<li>${i.product_name} x${i.quantity}</li>`).join('')
      sendEmail({
        to: 'admin@vo-group.be',
        subject: `Equipment Request: ${form.project_name}`,
        body: `<p><strong>${submitterName}</strong> submitted an equipment request:</p>
          <p><strong>Project:</strong> ${form.project_name}</p>
          <p><strong>Needed by:</strong> ${form.needed_by || 'Not specified'}</p>
          <ul>${itemList}</ul>
          ${form.justification ? `<p><strong>Justification:</strong> ${form.justification}</p>` : ''}`,
      })

      setSuccess(true)
      toast.success('Equipment request submitted!')
    } catch (err) {
      toast.error(err.message || 'Failed to submit')
    }
    setSubmitting(false)
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="p-6 text-center border-2 border-success/30 bg-success/5">
            <CheckCircle2 className="h-14 w-14 mx-auto text-success mb-3" />
            <h2 className="text-xl font-display font-bold">Request Submitted!</h2>
            <p className="text-muted-foreground text-sm mt-2">
              Your equipment request for <strong>{form.project_name}</strong> has been sent to the admin team.
            </p>
            <Link to="/"><Button variant="outline" className="mt-5">Back to Hub</Button></Link>
          </Card>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
      <Link to="/"><Button variant="ghost" size="sm" className="gap-2 -ml-2"><ArrowLeft className="h-4 w-4" /> Back</Button></Link>

      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Package className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold">Request Equipment</h1>
          <p className="text-sm text-muted-foreground">Select items and submit a request to the IT team</p>
        </div>
      </div>

      {/* Selected items */}
      <Card className="p-4">
        <Label className="text-sm font-semibold mb-3 block">Selected Items ({form.items.length})</Label>
        {form.items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No items selected. Choose from the catalog below.</p>
        ) : (
          <div className="space-y-2">
            {form.items.map(item => (
              <div key={item.product_id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                {item.image_url ? (
                  <img src={item.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><Package className="h-4 w-4 text-muted-foreground" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.product_name}</p>
                  {item.category_name && <CategoryBadge name={item.category_name} color={item.category_color} />}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQty(item.product_id, item.quantity - 1)}>-</Button>
                  <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQty(item.product_id, item.quantity + 1)}>+</Button>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(item.product_id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Product picker */}
      <Card className="p-4">
        <Label className="text-sm font-semibold mb-3 block">Add Equipment</Label>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {[{ name: 'All' }, ...categories].map(c => (
            <button
              key={c.name}
              onClick={() => setCategoryFilter(c.name)}
              className={cn(
                'px-2.5 py-1 text-xs font-medium rounded-full transition-colors',
                categoryFilter === c.name ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
          {filteredProducts.map(p => {
            const added = form.items.some(i => i.product_id === p.id)
            return (
              <button
                key={p.id}
                onClick={() => !added && addItem(p)}
                disabled={added}
                className={cn(
                  'flex items-center gap-2 p-2 rounded-lg border text-left transition-all text-xs',
                  added ? 'border-primary/30 bg-primary/5 opacity-60' : 'border-border/50 hover:border-primary/30'
                )}
              >
                {p.image_url ? (
                  <img src={p.image_url} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0"><Package className="h-3 w-3" /></div>
                )}
                <span className="truncate">{p.name}</span>
                {added && <span className="text-[9px] text-primary ml-auto shrink-0">Added</span>}
              </button>
            )
          })}
        </div>
      </Card>

      {/* Details */}
      <Card className="p-4 space-y-3">
        <div>
          <Label>Project / Reason *</Label>
          <Input value={form.project_name} onChange={e => setForm(f => ({ ...f, project_name: e.target.value }))} placeholder="e.g., New marketing campaign" />
        </div>
        <div>
          <Label>Needed by</Label>
          <input type="date" value={form.needed_by} onChange={e => setForm(f => ({ ...f, needed_by: e.target.value }))}
            className="w-full h-10 px-3 text-sm rounded-lg bg-muted/40 border border-border/50 focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10" />
        </div>
        <div>
          <Label>Justification</Label>
          <Textarea value={form.justification} onChange={e => setForm(f => ({ ...f, justification: e.target.value }))} placeholder="Why do you need this equipment?" rows={2} />
        </div>
        <div>
          <Label>Additional notes</Label>
          <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Anything else..." rows={2} />
        </div>
      </Card>

      <Button onClick={handleSubmit} disabled={!canSubmit || submitting} loading={submitting} className="w-full">
        Submit Request ({form.items.length} item{form.items.length !== 1 ? 's' : ''})
      </Button>
    </div>
  )
}
