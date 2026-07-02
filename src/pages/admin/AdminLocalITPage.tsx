import { useState, useMemo } from 'react'
import { useQRCodes, useUpdateQRCode } from '@/hooks/use-qr-codes'
import { useProducts } from '@/hooks/use-products'
import { useScanLogs } from '@/hooks/use-qr-codes'
import {
  Search, Package, User, QrCode, Wrench, AlertTriangle, Download,
  CheckCircle, Clock, Eye, Filter, Monitor, ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { exportToCSV } from '@/lib/export-csv'
import { CategoryBadge } from '@/components/common/CategoryBadge'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { ScrollFadeIn } from '@/components/ui/motion'
import { useUIStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

const STATUS_CONFIG = {
  available: { label: 'Available', icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  assigned: { label: 'Assigned', icon: User, color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' },
  reserved: { label: 'Reserved', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' },
  in_repair: { label: 'In Repair', icon: Wrench, color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20' },
  lost: { label: 'Lost', icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10 border-rose-500/20' },
  maintenance: { label: 'Maintenance', icon: Wrench, color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20' },
}

const ALL_STATUSES = ['available', 'assigned', 'reserved', 'in_repair', 'lost']

function StatCard({ label, value, icon: Icon, color, active, onClick  }: any) {
  return (
    <button onClick={onClick} className={cn(
      'flex items-center gap-3 p-4 rounded-xl border transition-all text-left w-full',
      active ? 'ring-2 ring-primary/30 border-primary/40 bg-primary/5' : 'border-border/40 hover:border-border/60 bg-card'
    )}>
      <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </button>
  )
}

export function AdminLocalITPage() {
  const { data: allQR = [], isLoading } = useQRCodes({})
  const { data: products = [] } = useProducts()
  const { data: recentLogs = [] } = useScanLogs({ limit: 50 })
  const updateQR = useUpdateQRCode()
  const showToast = useUIStore((s) => s.showToast)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [detailQR, setDetailQR] = useState<any>(null)
  const [statusChangeQR, setStatusChangeQR] = useState<any>(null)
  const [newStatus, setNewStatus] = useState('')

  // Stats
  const stats = useMemo(() => {
    const s = { total: allQR.length, available: 0, assigned: 0, reserved: 0, in_repair: 0, lost: 0 }
    for (const qr of allQR) {
      const st = qr.status || 'available'
      if (s[st] !== undefined) s[st]++
    }
    return s
  }, [allQR])

  // Categories from QR data
  const categories = useMemo(() => {
    const cats: Record<string, number> = {}
    for (const qr of allQR) {
      const cat = qr.category_name || 'Other'
      cats[cat] = (cats[cat] || 0) + 1
    }
    return Object.entries(cats as Record<string, any>).sort((a: any, b: any) => b[1] - a[1])
  }, [allQR])

  // Filter
  const filtered = useMemo(() => {
    return allQR.filter((qr: any) => {
      const st = qr.status || 'available'
      if (statusFilter !== 'all' && st !== statusFilter) return false
      if (categoryFilter !== 'all' && qr.category_name !== categoryFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return (qr.code || '').toLowerCase().includes(q) ||
          (qr.product_name || '').toLowerCase().includes(q) ||
          (qr.assigned_to_name || '').toLowerCase().includes(q) ||
          (qr.label || '').toLowerCase().includes(q)
      }
      return true
    })
  }, [allQR, statusFilter, categoryFilter, search])

  // History for a specific QR
  const qrHistory = useMemo(() => {
    if (!detailQR) return []
    return recentLogs.filter((l: any) => l.qr_code === detailQR.code).slice(0, 10)
  }, [detailQR, recentLogs])

  const handleStatusChange = async () => {
    if (!statusChangeQR || !newStatus) return
    try {
      const updates: Record<string, unknown> = { status: newStatus }
      if (newStatus === 'available') {
        updates.assigned_to = null
        updates.assigned_to_name = null
        updates.assigned_to_email = null
        updates.assigned_at = null
      }
      await updateQR.mutateAsync({ id: statusChangeQR.id, ...updates })
      showToast(`Status updated to ${newStatus.replace('_', ' ')}`)
      setStatusChangeQR(null)
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Local IT" description={`${stats.total} devices tracked`}>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => exportToCSV(filtered.map((qr: any) => ({
          Code: qr.code, Product: qr.product_name, Category: qr.category_name, Status: qr.status || 'available',
          'Assigned To': qr.assigned_to_name || '', 'Assigned Email': qr.assigned_to_email || '',
          'Since': qr.assigned_at ? format(new Date(qr.assigned_at), 'dd/MM/yyyy') : '',
        })), 'local-it-inventory')}>
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
      </AdminPageHeader>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total" value={stats.total} icon={Monitor} color="bg-muted text-foreground"
          active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
        <StatCard label="Available" value={stats.available} icon={CheckCircle} color="bg-emerald-500/10 text-emerald-500"
          active={statusFilter === 'available'} onClick={() => setStatusFilter('available')} />
        <StatCard label="Assigned" value={stats.assigned} icon={User} color="bg-blue-500/10 text-blue-500"
          active={statusFilter === 'assigned'} onClick={() => setStatusFilter('assigned')} />
        <StatCard label="Reserved" value={stats.reserved} icon={Clock} color="bg-amber-500/10 text-amber-500"
          active={statusFilter === 'reserved'} onClick={() => setStatusFilter('reserved')} />
        <StatCard label="In Repair" value={stats.in_repair} icon={Wrench} color="bg-orange-500/10 text-orange-500"
          active={statusFilter === 'in_repair'} onClick={() => setStatusFilter('in_repair')} />
        <StatCard label="Lost" value={stats.lost} icon={AlertTriangle} color="bg-rose-500/10 text-rose-500"
          active={statusFilter === 'lost'} onClick={() => setStatusFilter('lost')} />
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by code, product, or person..." className="pl-9" value={search} onChange={(e: any) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={categoryFilter} onChange={(e: any) => setCategoryFilter(e.target.value)} className="w-40 text-sm">
            <option value="all">All categories</option>
            {categories.map(([cat, count]) => (
              <option key={cat} value={cat}>{cat} ({count})</option>
            ))}
          </Select>
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Equipment table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <QrCode className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground">No devices match your search</p>
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-left">
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Device</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Code</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Category</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Assigned To</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Since</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((qr: any) => {
                  const st = qr.status || 'available'
                  const config = STATUS_CONFIG[st] || STATUS_CONFIG.available
                  const StatusIcon = config.icon
                  return (
                    <tr key={qr.id} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {qr.product_image ? (
                            <img src={qr.product_image} alt="" className="h-9 w-9 rounded-lg object-cover" />
                          ) : (
                            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                              <Package className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-sm">{qr.product_name || qr.label || 'Unknown'}</p>
                            {qr.product_sub_type && <p className="text-[10px] text-muted-foreground">{qr.product_sub_type}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{qr.code}</code>
                      </td>
                      <td className="px-4 py-3">
                        {qr.category_name && <CategoryBadge name={qr.category_name} color={qr.category_color} />}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => { setStatusChangeQR(qr); setNewStatus(st) }}
                          className="cursor-pointer">
                          <Badge variant="outline" className={cn('text-[10px] gap-1', config.bg, config.color)}>
                            <StatusIcon className="h-3 w-3" /> {config.label}
                          </Badge>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {st === 'assigned' && qr.assigned_to_name ? (
                          <div>
                            <p className="text-sm font-medium">{qr.assigned_to_name}</p>
                            {qr.assigned_to_email && <p className="text-[10px] text-muted-foreground">{qr.assigned_to_email}</p>}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {qr.assigned_at ? format(new Date(qr.assigned_at), 'dd MMM yyyy') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDetailQR(qr)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detailQR} onOpenChange={() => setDetailQR(null)}>
        <DialogContent className="max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              {detailQR?.product_name} — {detailQR?.code}
            </DialogTitle>
          </DialogHeader>
          {detailQR && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Product</span><p className="font-medium">{detailQR.product_name}</p></div>
                <div><span className="text-muted-foreground">Category</span><p className="font-medium">{detailQR.category_name || '—'}</p></div>
                <div><span className="text-muted-foreground">Sub-type</span><p className="font-medium">{detailQR.product_sub_type || '—'}</p></div>
                <div><span className="text-muted-foreground">Status</span>
                  <Badge variant="outline" className={cn('text-[10px] gap-1 mt-1', STATUS_CONFIG[detailQR.status || 'available']?.bg, STATUS_CONFIG[detailQR.status || 'available']?.color)}>
                    {STATUS_CONFIG[detailQR.status || 'available']?.label}
                  </Badge>
                </div>
                {detailQR.assigned_to_name && (
                  <>
                    <div><span className="text-muted-foreground">Assigned to</span><p className="font-medium">{detailQR.assigned_to_name}</p></div>
                    <div><span className="text-muted-foreground">Since</span><p className="font-medium">{detailQR.assigned_at ? format(new Date(detailQR.assigned_at), 'dd MMM yyyy HH:mm') : '—'}</p></div>
                  </>
                )}
              </div>

              {/* History */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-sm mb-3">Recent Activity</h4>
                {qrHistory.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No scan history for this device</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {qrHistory.map((log: any) => (
                      <div key={log.id} className="flex items-center gap-3 text-xs">
                        <div className={cn(
                          'h-6 w-6 rounded-full flex items-center justify-center shrink-0',
                          log.action === 'take' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'
                        )}>
                          {log.action === 'take' ? '↑' : '↓'}
                        </div>
                        <div className="flex-1">
                          <span className="font-medium capitalize">{log.action}</span>
                          {log.user_name && <span className="text-muted-foreground"> by {log.user_name}</span>}
                        </div>
                        <span className="text-muted-foreground">{format(new Date(log.created_at), 'dd MMM HH:mm')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailQR(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status change dialog */}
      <Dialog open={!!statusChangeQR} onOpenChange={() => setStatusChangeQR(null)}>
        <DialogContent className="max-w-sm p-6">
          <DialogHeader>
            <DialogTitle>Change Status — {statusChangeQR?.code}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{statusChangeQR?.product_name}</p>
          <div className="space-y-2 mt-2">
            {ALL_STATUSES.map((st: any) => {
              const config = STATUS_CONFIG[st]
              const Icon = config.icon
              return (
                <button key={st} onClick={() => setNewStatus(st)}
                  className={cn(
                    'flex items-center gap-3 w-full p-3 rounded-xl border-2 text-left transition-all',
                    newStatus === st ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                  )}>
                  <Icon className={cn('h-4 w-4', config.color)} />
                  <span className="text-sm font-medium">{config.label}</span>
                  {newStatus === st && <CheckCircle className="h-4 w-4 text-primary ml-auto" />}
                </button>
              )
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusChangeQR(null)}>Cancel</Button>
            <Button onClick={handleStatusChange}>Update Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
