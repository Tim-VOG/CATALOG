import { useState, useMemo } from 'react'
import { useOffboardingProcesses, useCreateOffboarding, useUpdateOffboarding, useDeleteOffboarding } from '@/hooks/use-offboarding'
import { useUIStore } from '@/stores/ui-store'
import { UserMinus, Plus, Search, Pencil, Trash2, Calendar, Building2, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { EmptyState } from '@/components/common/EmptyState'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { cn } from '@/lib/utils'

const BUSINESS_UNITS = [
  'VO GROUP',
  'THE LITTLE VOICE',
  'VO EVENT',
  'VO CONSULTING',
  'VO PRODUCTION',
  'VO STUDIOS',
  'KRAFTHAUS',
]

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'bg-amber-500/15 text-amber-600 border-amber-500/30', icon: Clock },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-500/15 text-blue-600 border-blue-500/30', icon: AlertTriangle },
  { value: 'completed', label: 'Completed', color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30', icon: CheckCircle2 },
]

const STATUS_FILTERS = ['all', 'pending', 'in_progress', 'completed']

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  personal_email: '',
  business_unit: '',
  departure_date: '',
  status: 'pending',
  notes: '',
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getInitials(first, last) {
  return `${(first || '')[0] || ''}${(last || '')[0] || ''}`.toUpperCase()
}

function getChecklistProgress(checklist) {
  if (!Array.isArray(checklist) || checklist.length === 0) return { done: 0, total: 0, pct: 0 }
  const done = checklist.filter((c) => c.done).length
  return { done, total: checklist.length, pct: Math.round((done / checklist.length) * 100) }
}

export function OffboardingPage() {
  const { data: processes = [], isLoading } = useOffboardingProcesses()
  const createProcess = useCreateOffboarding()
  const updateProcess = useUpdateOffboarding()
  const deleteProcess = useDeleteOffboarding()
  const showToast = useUIStore((s) => s.showToast)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [editDialog, setEditDialog] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // ── Filtering ──
  const filtered = useMemo(() => {
    let list = processes
    if (statusFilter !== 'all') {
      list = list.filter((p) => p.status === statusFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) =>
          (p.first_name || '').toLowerCase().includes(q) ||
          (p.last_name || '').toLowerCase().includes(q) ||
          (p.email || '').toLowerCase().includes(q) ||
          (p.business_unit || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [processes, statusFilter, search])

  // ── Quick stats ──
  const stats = useMemo(() => ({
    total: processes.length,
    pending: processes.filter((p) => p.status === 'pending').length,
    in_progress: processes.filter((p) => p.status === 'in_progress').length,
    completed: processes.filter((p) => p.status === 'completed').length,
  }), [processes])

  // ── Handlers ──
  const handleAdd = () => setEditDialog({ ...EMPTY_FORM, _isNew: true })

  const handleEdit = (process) => {
    setEditDialog({
      ...process,
      departure_date: process.departure_date ? process.departure_date.slice(0, 10) : '',
      _isNew: false,
    })
  }

  const handleSave = async () => {
    if (!editDialog) return
    const { _isNew, id, created_at, updated_at, checklist, ...payload } = editDialog

    try {
      if (_isNew) {
        await createProcess.mutateAsync(payload)
        showToast('Offboarding process created')
      } else {
        await updateProcess.mutateAsync({ id, ...payload })
        showToast('Offboarding process updated')
      }
      setEditDialog(null)
    } catch (err) {
      showToast(err.message || 'Save failed', 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      await deleteProcess.mutateAsync(deleteConfirm.id)
      showToast('Offboarding process deleted')
    } catch (err) {
      showToast(err.message || 'Delete failed', 'error')
    }
    setDeleteConfirm(null)
  }

  const getStatusBadge = (status) => {
    const opt = STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0]
    return (
      <Badge variant="outline" className={cn('gap-1 text-[11px]', opt.color)}>
        <opt.icon className="h-3 w-3" />
        {opt.label}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Offboarding" description="Manage employee departure processes" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} variant="elevated"><CardContent className="p-4 h-16 animate-pulse bg-muted/30 rounded" /></Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <AdminPageHeader title="Offboarding" description="Manage employee departure processes">
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          New Process
        </Button>
      </AdminPageHeader>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: UserMinus, color: 'text-foreground' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-500' },
          { label: 'In Progress', value: stats.in_progress, icon: AlertTriangle, color: 'text-blue-500' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'text-emerald-500' },
        ].map((s) => (
          <Card key={s.label} variant="elevated">
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={cn('h-5 w-5 shrink-0', s.color)} />
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or business unit..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f}
              variant={statusFilter === f ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter(f)}
              className="capitalize text-xs"
            >
              {f.replace('_', ' ')}
            </Button>
          ))}
        </div>
      </div>

      {/* Process cards */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={UserMinus}
          title="No offboarding processes"
          description={search || statusFilter !== 'all' ? 'Try adjusting your search or filter' : 'Create your first offboarding process to get started'}
          action={!search && statusFilter === 'all' ? { label: 'New Process', onClick: handleAdd } : undefined}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((process) => {
            const progress = getChecklistProgress(process.checklist)
            return (
              <Card key={process.id} variant="elevated" className="transition-all hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="shrink-0 h-10 w-10 rounded-full bg-rose-500/15 text-rose-600 flex items-center justify-center text-sm font-bold">
                      {getInitials(process.first_name, process.last_name)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">
                          {process.first_name} {process.last_name}
                        </span>
                        {getStatusBadge(process.status)}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        {process.email && <span>{process.email}</span>}
                        {process.business_unit && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {process.business_unit}
                          </span>
                        )}
                        {process.departure_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(process.departure_date)}
                          </span>
                        )}
                      </div>

                      {/* Checklist progress */}
                      {progress.total > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 max-w-[200px] h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                progress.pct === 100 ? 'bg-emerald-500' : 'bg-primary'
                              )}
                              style={{ width: `${progress.pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {progress.done}/{progress.total} items
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(process)} className="h-8 w-8 p-0">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirm(process)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Add/Edit Dialog ── */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editDialog?._isNew ? 'New Offboarding Process' : 'Edit Offboarding Process'}
            </DialogTitle>
          </DialogHeader>

          {editDialog && (
            <div className="space-y-4">
              {/* Name row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>First Name *</Label>
                  <Input
                    value={editDialog.first_name}
                    onChange={(e) => setEditDialog((prev) => ({ ...prev, first_name: e.target.value }))}
                    placeholder="First name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Last Name *</Label>
                  <Input
                    value={editDialog.last_name}
                    onChange={(e) => setEditDialog((prev) => ({ ...prev, last_name: e.target.value }))}
                    placeholder="Last name"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label>Work Email</Label>
                <Input
                  type="email"
                  value={editDialog.email}
                  onChange={(e) => setEditDialog((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="work@company.com"
                />
              </div>

              {/* Personal email */}
              <div className="space-y-1.5">
                <Label>Personal Email</Label>
                <Input
                  type="email"
                  value={editDialog.personal_email}
                  onChange={(e) => setEditDialog((prev) => ({ ...prev, personal_email: e.target.value }))}
                  placeholder="personal@email.com"
                />
              </div>

              {/* Business unit + departure date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Business Unit</Label>
                  <Select
                    value={editDialog.business_unit}
                    onChange={(e) => setEditDialog((prev) => ({ ...prev, business_unit: e.target.value }))}
                  >
                    <option value="">Select...</option>
                    {BUSINESS_UNITS.map((bu) => (
                      <option key={bu} value={bu}>{bu}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Departure Date</Label>
                  <Input
                    type="date"
                    value={editDialog.departure_date}
                    onChange={(e) => setEditDialog((prev) => ({ ...prev, departure_date: e.target.value }))}
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={editDialog.status}
                  onChange={(e) => setEditDialog((prev) => ({ ...prev, status: e.target.value }))}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={editDialog.notes || ''}
                  onChange={(e) => setEditDialog((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={!editDialog?.first_name?.trim() || !editDialog?.last_name?.trim()}
            >
              {editDialog?._isNew ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ── */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Offboarding Process?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete the offboarding process for{' '}
            <strong>{deleteConfirm?.first_name} {deleteConfirm?.last_name}</strong>.
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
