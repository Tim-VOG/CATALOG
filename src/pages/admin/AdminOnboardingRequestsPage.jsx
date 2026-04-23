import { useState, useMemo } from 'react'
import { useItRequests, useUpdateItRequest, useDeleteItRequest } from '@/hooks/use-it-requests'
import { useUIStore } from '@/stores/ui-store'
import {
  Search, UserPlus, Trash2, Eye, Package, Clock, Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { cn } from '@/lib/utils'

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export function AdminOnboardingRequestsPage() {
  const { data: allRequests = [], isLoading } = useItRequests()
  const updateRequest = useUpdateItRequest()
  const deleteRequest = useDeleteItRequest()
  const showToast = useUIStore((s) => s.showToast)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [detailRequest, setDetailRequest] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const requests = useMemo(() =>
    allRequests.filter((r) => r.type === 'onboarding'),
    [allRequests]
  )

  const filtered = useMemo(() => {
    let result = requests
    if (statusFilter !== 'all') {
      result = result.filter((r) => r.status === statusFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((r) => {
        const data = r.data || {}
        return (data.name || '').toLowerCase().includes(q) ||
          (r.requester_name || '').toLowerCase().includes(q) ||
          (data.company || '').toLowerCase().includes(q)
      })
    }
    return result
  }, [requests, search, statusFilter])

  const pendingCount = requests.filter((r) => r.status === 'pending').length

  const handleStatusChange = async (req, newStatus) => {
    try {
      await updateRequest.mutateAsync({ id: req.id, updates: { status: newStatus } })
      showToast(`Request marked as ${newStatus.replace('_', ' ')}`)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      await deleteRequest.mutateAsync(deleteConfirm.id)
      showToast('Request deleted')
    } catch (err) {
      showToast(err.message, 'error')
    }
    setDeleteConfirm(null)
  }

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Onboarding Requests" description={`${requests.length} request${requests.length !== 1 ? 's' : ''}`} />

      {/* Status filters */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { value: 'all', label: 'All' },
          { value: 'pending', label: 'Pending' },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'ready', label: 'Ready' },
        ].map((s) => (
          <Button key={s.value} variant={statusFilter === s.value ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(s.value)}>
            {s.label}
            {s.value === 'pending' && pendingCount > 0 && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground text-primary text-[10px] font-bold">{pendingCount}</span>
            )}
          </Button>
        ))}

        <div className="flex-1" />

        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Request list */}
      {filtered.length === 0 ? (
        <EmptyState icon={UserPlus} title="No onboarding requests" description="No requests match the current filter" />
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => {
            const data = req.data || {}
            const name = data.name || req.requester_name || 'Unknown'
            const company = data.company || ''
            const firstDay = data.first_day || ''
            const submitter = req.requester_name || ''

            return (
              <Card key={req.id} variant="elevated" className="hover:shadow-card-hover transition-shadow">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0">
                      <UserPlus className="h-5 w-5 text-cyan-500" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{name}</span>
                        <StatusBadge status={req.status} />
                        {company && <Badge variant="secondary" className="text-[10px]">{company}</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {submitter && <span>By {submitter}</span>}
                        {firstDay && <span>Starts {formatDate(firstDay)}</span>}
                        <span>{formatDate(req.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {req.status === 'pending' && (
                        <Button size="sm" className="gap-1.5 text-xs h-8" onClick={() => handleStatusChange(req, 'in_progress')}>
                          <Package className="h-3 w-3" /> Start
                        </Button>
                      )}
                      {req.status === 'in_progress' && (
                        <Button size="sm" variant="success" className="gap-1.5 text-xs h-8" onClick={() => handleStatusChange(req, 'ready')}>
                          <Check className="h-3 w-3" /> Ready
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => setDetailRequest(req)} className="gap-1 text-xs">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(req)} className="text-destructive hover:text-destructive">
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

      {/* Detail dialog */}
      <Dialog open={!!detailRequest} onOpenChange={() => setDetailRequest(null)}>
        <DialogContent className="max-w-lg p-6">
          <DialogHeader>
            <DialogTitle>Onboarding Request</DialogTitle>
          </DialogHeader>
          {detailRequest && (
            <div className="space-y-3">
              {detailRequest.data && Object.entries(detailRequest.data)
                .filter(([k, v]) => v !== '' && v !== null && k !== 'submitted_at')
                .map(([key, value]) => (
                  <div key={key} className="flex items-start gap-3 text-sm">
                    <span className="font-semibold text-muted-foreground w-36 shrink-0 capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="break-all">
                      {Array.isArray(value) ? value.join(', ') : typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                    </span>
                  </div>
                ))}
              <div className="border-t pt-3 space-y-2">
                {detailRequest.requester_name && (
                  <div className="flex items-start gap-3 text-sm">
                    <span className="font-semibold text-muted-foreground w-36 shrink-0">Submitted by</span>
                    <span>{detailRequest.requester_name} ({detailRequest.requester_email})</span>
                  </div>
                )}
                <div className="flex items-start gap-3 text-sm">
                  <span className="font-semibold text-muted-foreground w-36 shrink-0">Date</span>
                  <span>{new Date(detailRequest.created_at).toLocaleString('en-GB')}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailRequest(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="p-6">
          <DialogHeader><DialogTitle>Delete Request?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently delete this onboarding request.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
