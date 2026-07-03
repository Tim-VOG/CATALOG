import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useItRequests, useUpdateItRequest, useDeleteItRequest } from '@/hooks/use-it-requests'
import { useUIStore } from '@/stores/ui-store'
import { UserMinus, Search, Trash2, Calendar, Building2, CheckCircle2, Clock, AlertTriangle, Eye, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { EmptyState } from '@/components/common/EmptyState'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS = [
  { value: 'pending', labelKey: 'statusPending', color: 'bg-amber-500/15 text-amber-600 border-amber-500/30', icon: Clock },
  { value: 'in_progress', labelKey: 'statusInProgress', color: 'bg-blue-500/15 text-blue-600 border-blue-500/30', icon: AlertTriangle },
  { value: 'ready', labelKey: 'statusReady', color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30', icon: CheckCircle2 },
]

const STATUS_FILTERS = ['all', 'pending', 'in_progress', 'ready']

function formatDate(d: any) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getInitials(name: any) {
  if (!name) return '?'
  const parts = name.split(' ')
  return parts.map((p: any) => p[0] || '').join('').toUpperCase().slice(0, 2)
}

export function OffboardingPage() {
  const { t } = useTranslation()
  const { data: allRequests = [], isLoading } = useItRequests()
  const updateRequest = useUpdateItRequest()
  const deleteRequest = useDeleteItRequest()
  const showToast = useUIStore((s: any) => s.showToast)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<any>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null)

  // Only show offboarding requests
  const offboardingRequests = useMemo(
    () => allRequests.filter((r: any) => r.type === 'offboarding'),
    [allRequests]
  )

  // ── Filtering ──
  const filtered = useMemo(() => {
    let list = offboardingRequests
    if (statusFilter !== 'all') {
      list = list.filter((r: any) => r.status === statusFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (r) =>
          (r.data?.employee_name || '').toLowerCase().includes(q) ||
          (r.data?.employee_email || '').toLowerCase().includes(q) ||
          (r.data?.business_unit || '').toLowerCase().includes(q) ||
          (r.requester_name || '').toLowerCase().includes(q) ||
          (r.requester_email || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [offboardingRequests, statusFilter, search])

  // ── Quick stats ──
  const stats = useMemo(() => ({
    total: offboardingRequests.length,
    pending: offboardingRequests.filter((r: any) => r.status === 'pending').length,
    in_progress: offboardingRequests.filter((r: any) => r.status === 'in_progress').length,
    completed: offboardingRequests.filter((r: any) => r.status === 'ready').length,
  }), [offboardingRequests])

  const STATUS_FILTER_LABELS: Record<string, string> = {
    all: t('admin.offboardingWorkspace.filterAll'),
    pending: t('admin.offboardingWorkspace.filterPending'),
    in_progress: t('admin.offboardingWorkspace.filterInProgress'),
    ready: t('admin.offboardingWorkspace.filterReady'),
  }

  const handleStatusChange = async (request: any, newStatus: any) => {
    try {
      await updateRequest.mutateAsync({ id: request.id, updates: { status: newStatus } })
      showToast(t('admin.offboardingWorkspace.statusUpdated', { status: STATUS_FILTER_LABELS[newStatus] || newStatus }))
    } catch (err: any) {
      showToast(err.message || t('admin.offboardingWorkspace.updateFailed'), 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      await deleteRequest.mutateAsync(deleteConfirm.id)
      showToast(t('admin.offboardingWorkspace.deleteSuccess'))
    } catch (err: any) {
      showToast(err.message || t('admin.offboardingWorkspace.deleteFailed'), 'error')
    }
    setDeleteConfirm(null)
  }

  const getStatusBadge = (status: any) => {
    const opt = STATUS_OPTIONS.find((s: any) => s.value === status) || (STATUS_OPTIONS as Record<string, any>)[0]
    return (
      <Badge variant="outline" className={cn('gap-1 text-[11px]', opt.color)}>
        <opt.icon className="h-3 w-3" />
        {t(`admin.offboardingWorkspace.${opt.labelKey}`)}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title={t('admin.offboardingWorkspace.pageTitle')} description={t('admin.offboardingWorkspace.pageDescription')} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i: any) => (
            <Card key={i} variant="elevated"><CardContent className="p-4 h-16 animate-pulse bg-muted/30 rounded" /></Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <AdminPageHeader title={t('admin.offboardingWorkspace.pageTitle')} description={t('admin.offboardingWorkspace.pageDescription')} />

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: t('admin.offboardingWorkspace.statsTotal'), value: stats.total, icon: UserMinus, color: 'text-foreground' },
          { label: t('admin.offboardingWorkspace.statsPending'), value: stats.pending, icon: Clock, color: 'text-amber-500' },
          { label: t('admin.offboardingWorkspace.statsInProgress'), value: stats.in_progress, icon: AlertTriangle, color: 'text-blue-500' },
          { label: t('admin.offboardingWorkspace.statsCompleted'), value: stats.completed, icon: CheckCircle2, color: 'text-emerald-500' },
        ].map((s: any) => (
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
            placeholder={t('admin.offboardingWorkspace.searchPlaceholder')}
            className="pl-9"
            value={search}
            onChange={(e: any) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {STATUS_FILTERS.map((f: any) => (
            <Button
              key={f}
              variant={statusFilter === f ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter(f)}
              className="capitalize text-xs"
            >
              {STATUS_FILTER_LABELS[f] || f}
            </Button>
          ))}
        </div>
      </div>

      {/* Request cards */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={UserMinus}
          title={t('admin.offboardingWorkspace.emptyTitle')}
          description={search || statusFilter !== 'all' ? t('admin.offboardingWorkspace.emptyFilteredDescription') : t('admin.offboardingWorkspace.emptyDescription')}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((request: any) => {
            const data = request.data || {}
            const isExpanded = expandedId === request.id
            return (
              <Card key={request.id} variant="elevated" className="transition-all hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="shrink-0 h-10 w-10 rounded-full bg-rose-500/15 text-rose-600 flex items-center justify-center text-sm font-bold">
                      {getInitials(data.employee_name)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">
                          {data.employee_name || t('admin.offboardingWorkspace.unknownEmployee')}
                        </span>
                        {getStatusBadge(request.status)}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        {data.employee_email && <span>{data.employee_email}</span>}
                        {data.business_unit && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {data.business_unit}
                          </span>
                        )}
                        {(data.departure_on || data.departure_date) && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(data.departure_on || data.departure_date)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedId(isExpanded ? null : request.id)}
                        className="h-8 w-8 p-0"
                      >
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirm(request)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border/30 space-y-4">
                      {/* Request details */}
                      <div className="rounded-xl border bg-muted/20 overflow-hidden">
                        {Object.entries(data as Record<string, any>).filter(([key]) => key !== 'submitted_at').map(([key, value], idx) => (
                          <div
                            key={key}
                            className={cn(
                              'flex items-start gap-4 px-4 py-2.5',
                              idx > 0 && 'border-t border-border/30'
                            )}
                          >
                            <span className="text-[11px] font-semibold text-muted-foreground w-32 shrink-0 uppercase tracking-wider pt-0.5">
                              {key.replace(/_/g, ' ')}
                            </span>
                            <span className="text-sm">
                              {typeof value === 'boolean' ? (value ? t('admin.offboardingWorkspace.yesLabel') : t('admin.offboardingWorkspace.noLabel')) : (value || '—')}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Requester info */}
                      <div className="text-xs text-muted-foreground">
                        {t('admin.offboardingWorkspace.submittedBy')} <strong>{request.requester_name || request.requester_email}</strong>
                        {data.submitted_at && ` ${t('admin.offboardingWorkspace.submittedOn', { date: formatDate(data.submitted_at) })}`}
                      </div>

                      {/* Status actions */}
                      <div className="flex gap-2">
                        {request.status === 'pending' && (
                          <Button size="sm" onClick={() => handleStatusChange(request, 'in_progress')} className="gap-1.5 text-xs">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {t('admin.offboardingWorkspace.startProcessing')}
                          </Button>
                        )}
                        {request.status === 'in_progress' && (
                          <Button size="sm" onClick={() => handleStatusChange(request, 'ready')} className="gap-1.5 text-xs">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {t('admin.offboardingWorkspace.markCompleted')}
                          </Button>
                        )}
                        {request.status !== 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(request, 'pending')}
                            className="text-xs"
                          >
                            {t('admin.offboardingWorkspace.resetToPending')}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Delete confirmation ── */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t('admin.offboardingWorkspace.deleteDialogTitle')}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('admin.offboardingWorkspace.deleteDialogTextBefore')}{' '}
            <strong>{deleteConfirm?.data?.employee_name}</strong>.
            {t('admin.offboardingWorkspace.deleteDialogTextAfter')}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>{t('admin.offboardingWorkspace.cancel')}</Button>
            <Button variant="destructive" onClick={handleDelete}>{t('admin.offboardingWorkspace.delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
