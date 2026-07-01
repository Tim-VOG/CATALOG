import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useReservations, useCreateReservation, useCancelReservation } from '@/hooks/use-qr-reservations'
import { useProducts } from '@/hooks/use-products'
import { useAuth } from '@/lib/auth'
import { useUIStore } from '@/stores/ui-store'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { CalendarClock, Plus, X, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS = ['active', 'picked_up', 'expired', 'cancelled']
const STATUS_STYLE: Record<string, string> = {
  active: 'bg-blue-500/12 text-blue-600 border-blue-500/30',
  picked_up: 'bg-emerald-500/12 text-emerald-600 border-emerald-500/30',
  expired: 'bg-amber-500/12 text-amber-600 border-amber-500/30',
  cancelled: 'bg-muted text-muted-foreground border-border',
}

export function AdminReservationsPage() {
  const { user } = useAuth()
  const showToast = useUIStore((s) => s.showToast)
  const [statusFilter, setStatusFilter] = useState('active')
  const { data: reservations = [], isLoading } = useReservations(
    statusFilter === 'all' ? {} : { status: statusFilter },
  )
  const { data: products = [] } = useProducts()
  const createRes = useCreateReservation()
  const cancelRes = useCancelReservation()

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<any>({ product_id: '', reserved_date: '', pickup_by: '', notes: '' })

  const sorted = useMemo(
    () => [...reservations].sort((a: any, b: any) => new Date(a.reserved_date).getTime() - new Date(b.reserved_date).getTime()),
    [reservations],
  )

  const handleCreate = async () => {
    if (!form.product_id || !form.reserved_date) {
      showToast('Pick a product and a date', 'error')
      return
    }
    try {
      await createRes.mutateAsync({
        product_id: form.product_id,
        user_id: user?.id || null,
        reserved_date: form.reserved_date,
        pickup_by: form.pickup_by || null,
        status: 'active',
        notes: form.notes || null,
      })
      showToast('Reservation created', 'success')
      setOpen(false)
      setForm({ product_id: '', reserved_date: '', pickup_by: '', notes: '' })
    } catch (err: any) {
      showToast(err?.message || 'Could not create reservation', 'error')
    }
  }

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this reservation?')) return
    try {
      await cancelRes.mutateAsync(id)
      showToast('Reservation cancelled', 'success')
    } catch (err: any) {
      showToast(err?.message || 'Could not cancel', 'error')
    }
  }

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Reservations"
        section="INVENTORY"
        description="Hold equipment for a future date without checking it out yet."
      >
        <Button size="sm" onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-3.5 w-3.5" /> New reservation
        </Button>
      </AdminPageHeader>

      <div className="flex flex-wrap gap-1">
        {['all', ...STATUS].map((s) => (
          <Button key={s} variant={statusFilter === s ? 'secondary' : 'ghost'} size="sm" className="text-xs h-8 capitalize" onClick={() => setStatusFilter(s)}>
            {s.replace('_', ' ')}
          </Button>
        ))}
      </div>

      <div className="border border-border/50 rounded-xl overflow-hidden bg-card">
        {sorted.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-muted-foreground">
            <CalendarClock className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-sm">No reservations here.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {sorted.map((r: any) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20">
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary/15 to-accent/10 border border-border/30 flex items-center justify-center shrink-0">
                  <Package className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.product_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {r.pickup_by ? `For ${r.pickup_by}` : 'No pickup name'}
                    {r.notes ? ` · ${r.notes}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium">{r.reserved_date ? format(new Date(r.reserved_date), 'd MMM yyyy', { locale: fr }) : '—'}</p>
                  <Badge variant="outline" className={cn('text-[10px] mt-0.5', STATUS_STYLE[r.status])}>{r.status.replace('_', ' ')}</Badge>
                </div>
                {r.status === 'active' && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleCancel(r.id)} title="Cancel">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={(v: boolean) => !v && setOpen(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>New reservation</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Product</label>
              <select
                value={form.product_id}
                onChange={(e: any) => setForm({ ...form, product_id: e.target.value })}
                className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background"
              >
                <option value="">Select a product…</option>
                {products.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.total_stock} in stock)</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Reserved for date</label>
              <Input type="date" value={form.reserved_date} onChange={(e: any) => setForm({ ...form, reserved_date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Picked up by (name)</label>
              <Input value={form.pickup_by} onChange={(e: any) => setForm({ ...form, pickup_by: e.target.value })} placeholder="Marc Dupont" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Notes</label>
              <Input value={form.notes} onChange={(e: any) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createRes.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
