import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useItRequests, useDeleteItRequest } from '@/hooks/use-it-requests'
import { createOnboardingRecipient } from '@/lib/api/onboarding'
import { useUIStore } from '@/stores/ui-store'
import {
  Search, ClipboardList, UserPlus, Trash2, Eye, Calendar,
  Monitor, MonitorOff, ChevronRight, UserMinus, Package,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'

export function AdminItRequestsPage() {
  const { data: requests = [], isLoading } = useItRequests()
  const deleteRequest = useDeleteItRequest()
  const showToast = useUIStore((s) => s.showToast)
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [detailRequest, setDetailRequest] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const filtered = useMemo(() => {
    let result = requests
    if (typeFilter !== 'all') {
      result = result.filter((r) => (r.type || 'it_request') === typeFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (r) =>
          r.first_name?.toLowerCase().includes(q) ||
          r.last_name?.toLowerCase().includes(q) ||
          r.business_unit?.toLowerCase().includes(q) ||
          r.requested_by_name?.toLowerCase().includes(q) ||
          r.type?.toLowerCase().includes(q)
      )
    }
    return result
  }, [requests, search, typeFilter])

  const typeCounts = useMemo(() => {
    const counts = { all: requests.length }
    for (const r of requests) {
      const t = r.type || 'it_request'
      counts[t] = (counts[t] || 0) + 1
    }
    return counts
  }, [requests])

  const handleCreateOnboarding = async (req) => {
    try {
      const recipient = await createOnboardingRecipient({
        first_name: req.first_name,
        last_name: req.last_name,
        email: req.generated_email || '',
        team: req.business_unit || '',
        department: req.status || '',
        start_date: req.start_date || null,
        language: 'fr',
        personal_email: req.personal_email || '',
      })
      showToast('Onboarding recipient created!')
      navigate(`/admin/onboarding/compose?recipientId=${recipient.id}`)
    } catch (err) {
      showToast(err.message || 'Failed to create recipient', 'error')
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
      {/* Header */}
      <AdminPageHeader title="All Requests" description={`${requests.length} submission${requests.length !== 1 ? 's' : ''}`} />

      {/* Type filters */}
      <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-muted/50 w-fit mb-4">
        {[
          { key: 'all', label: 'All' },
          { key: 'onboarding', label: 'Onboarding' },
          { key: 'offboarding', label: 'Offboarding' },
          { key: 'equipment', label: 'Equipment' },
          { key: 'it_request', label: 'IT Request' },
        ].filter(t => t.key === 'all' || typeCounts[t.key]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTypeFilter(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              typeFilter === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
            {typeCounts[key] > 0 && (
              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">{typeCounts[key]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, type, unit..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Request list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No IT requests found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => {
            const reqType = req.type || 'it_request'
            const data = req.data || {}
            // Resolve display name: new format uses data or requester_name, old uses first_name/last_name
            const displayName = data.new_employee_name || data.employee_name || data.project_name
              || req.requester_name
              || [req.first_name, req.last_name].filter(Boolean).join(' ')
              || 'Unknown'
            const submitter = req.requester_name || req.requested_by_name || ''
            const bu = data.business_unit || req.business_unit || ''
            const status = req.status || ''

            const TYPE_STYLES = {
              onboarding: { icon: UserPlus, bg: 'bg-cyan-500/10', color: 'text-cyan-500' },
              offboarding: { icon: UserMinus, bg: 'bg-rose-500/10', color: 'text-rose-500' },
              equipment: { icon: Package, bg: 'bg-primary/10', color: 'text-primary' },
              it_request: { icon: ClipboardList, bg: 'bg-amber-500/10', color: 'text-amber-500' },
            }
            const style = TYPE_STYLES[reqType] || TYPE_STYLES.it_request
            const TypeIcon = style.icon

            return (
              <Card key={req.id} variant="elevated" className="hover:shadow-card-hover transition-shadow">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-xl ${style.bg} flex items-center justify-center shrink-0`}>
                      <TypeIcon className={`h-5 w-5 ${style.color}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{displayName}</span>
                        <Badge variant="outline" className="text-[10px] capitalize">{reqType.replace('_', ' ')}</Badge>
                        {status && status !== 'pending' && (
                          <Badge variant="secondary" className="text-[10px]">{status}</Badge>
                        )}
                        {bu && <Badge variant="secondary" className="text-[10px]">{bu}</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {submitter && <span>By {submitter}</span>}
                        <span>{new Date(req.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => setDetailRequest(req)} className="gap-1.5 text-xs">
                        <Eye className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">View</span>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="capitalize">
              {(detailRequest?.type || 'IT Request').replace('_', ' ')} Details
            </DialogTitle>
          </DialogHeader>
          {detailRequest && (
            <div className="space-y-3">
              {/* Show JSONB data for new-format requests */}
              {detailRequest.data && Object.keys(detailRequest.data).length > 0 ? (
                Object.entries(detailRequest.data)
                  .filter(([k, v]) => v !== '' && v !== null && k !== 'submitted_at')
                  .map(([key, value]) => (
                    <div key={key} className="flex items-start gap-3 text-sm">
                      <span className="font-semibold text-muted-foreground w-36 shrink-0 capitalize">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="break-all">
                        {typeof value === 'boolean' ? (value ? 'Yes' : 'No')
                          : Array.isArray(value) ? value.map((v, i) => <div key={i}>{typeof v === 'object' ? `${v.product_name} x${v.quantity}` : v}</div>)
                          : String(value)}
                      </span>
                    </div>
                  ))
              ) : (
                // Old-format fields
                [
                  ['Status', detailRequest.status],
                  ['Business Unit', detailRequest.business_unit],
                  ['Name', `${detailRequest.first_name || ''} ${detailRequest.last_name || ''}`.trim()],
                  ['Start Date', detailRequest.start_date ? new Date(detailRequest.start_date).toLocaleDateString('en-GB') : null],
                  ['Computer', detailRequest.needs_computer ? 'Yes' : 'No'],
                  ['Access Needed', detailRequest.access_needs?.join(', ')],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <div key={label} className="flex items-start gap-3 text-sm">
                    <span className="font-semibold text-muted-foreground w-36 shrink-0">{label}</span>
                    <span className="break-all">{value}</span>
                  </div>
                ))
              )}
              {/* Common fields */}
              <div className="border-t border-border/30 pt-3 space-y-2">
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

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete IT Request?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete this {deleteConfirm?.type || 'IT'} request
            {deleteConfirm?.requester_name ? ` from ${deleteConfirm.requester_name}` : ''}.
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
