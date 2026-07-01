import { useState, useMemo } from 'react'
import { useItRequests, useUpdateItRequest, useDeleteItRequest } from '@/hooks/use-it-requests'
import { useOnboardingEmails } from '@/hooks/use-onboarding'
import { sendStatusChangeEmail } from '@/services/request-status-service'
import { useUIStore } from '@/stores/ui-store'
import { useAuth } from '@/lib/auth'
import {
  Search, UserPlus, Trash2, ArrowLeft, Package, Check, Mail, Info, Clock, CheckCircle, Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/common/EmptyState'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { reserveOnboardingKit } from '@/lib/api/onboarding-kit'
import { StatusBadge } from '@/components/common/StatusBadge'
import { WelcomeEmailSection } from '@/pages/admin/welcome/WelcomeEmailSection'

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const STATUS_COLORS = {
  pending: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  in_progress: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  ready: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  welcome: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
}

// Onboarding requests in 'ready' state without a welcome email sent yet
// are surfaced as 'welcome' in the UI so admins know what's left to do.
const displayStatus = (status, sentEmail) =>
  status === 'ready' && !sentEmail ? 'welcome' : status

// ── Info card (full request details, no expand) ──
function OnboardingRequestInfoCard({ req, sentEmail  }: any) {
  const data = req.data || {}
  const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ') || data.name || 'Unknown'
  const corporateEmail = data.email_local && data.email_domain
    ? `${data.email_local}@${data.email_domain}`
    : data.email_to_create || '—'

  const fields = [
    ['First Name', data.first_name],
    ['Last Name', data.last_name],
    ['Corporate Email', corporateEmail],
    ['Profile', data.profile],
    ['Company', data.company],
    ['Job Title', data.job_title],
    ['First Day', formatDate(data.first_day)],
    ['Business Unit', data.business_unit],
    ['Signing Off As', data.signing_off_as],
    ['Phone', data.phone],
    ['Country Based', data.country_based],
    ['Language', data.language],
    ['Requested By', req.requester_name],
    ['Requester Email', req.requester_email],
    ['Submitted', new Date(req.created_at).toLocaleString('fr-FR')],
  ]

  return (
    <Card variant="elevated">
      <CardContent className="p-0">
        <div className="p-5 pb-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-cyan-500" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{fullName}</h3>
                <p className="text-xs text-muted-foreground">{corporateEmail}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn('text-xs', STATUS_COLORS[displayStatus(req.status, sentEmail)])}>
                {displayStatus(req.status, sentEmail)}
              </Badge>
              {sentEmail && (
                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1">
                  <Mail className="h-3 w-3" /> Welcome sent
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="p-5 space-y-2.5">
          {fields.map(([label, value]) => (
            <div key={label} className="flex items-start gap-3 text-sm">
              <span className="font-medium text-muted-foreground w-36 shrink-0 text-xs uppercase tracking-wider pt-0.5">{label}</span>
              <span className="text-foreground break-all">{value || '—'}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Inline detail view ──
function RequestDetail({ req, onBack, onDelete, onStatusChange, sentEmail  }: any) {
  const { user, isAdmin } = useAuth()
  const isOwnRequest = !!user && (req.requester_id === user.id || req.requested_by === user.id)
  const canDelete = isAdmin || isOwnRequest
  const canChangeStatus = isAdmin
  const data = req.data || {}
  const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ') || data.name || 'Unknown'
  const showToast = useUIStore((s) => s.showToast)
  const [reserving, setReserving] = useState(false)

  const handleReserveKit = async () => {
    setReserving(true)
    try {
      const out = await reserveOnboardingKit(req)
      const productNames = out.reserved.map((r) => r.product_name).join(', ')
      showToast(`Kit reserved: ${productNames}`, 'success')
      if (out.missing.length) {
        showToast(`Missing in catalog: ${out.missing.map((m) => m.tag).join(', ')}`, 'info')
      }
    } catch (err: any) {
      showToast(err?.message || 'Could not reserve the kit', 'error')
    } finally {
      setReserving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-xs">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
        <div className="flex-1">
          <h2 className="text-lg font-display font-bold">{fullName}</h2>
          <p className="text-xs text-muted-foreground">Onboarding Request Details</p>
        </div>
        {canDelete && (
          <Button variant="ghost" size="sm" onClick={() => onDelete(req)} className="text-destructive hover:text-destructive text-xs gap-1.5">
            <Trash2 className="h-3.5 w-3.5" /> {isAdmin ? 'Delete' : 'Cancel'}
          </Button>
        )}
      </div>

      <OnboardingRequestInfoCard req={req} sentEmail={sentEmail} />

      {canChangeStatus && (req.status === 'in_progress' || req.status === 'ready') && (
        <Card variant="elevated">
          <CardContent className="p-4 flex items-center gap-3">
            <Package className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm text-muted-foreground flex-1">
              Reserve the starter kit (laptop + charger). Phone stays manual.
            </span>
            <Button variant="outline" size="sm" onClick={handleReserveKit} disabled={reserving} className="gap-1.5 text-xs">
              <Package className="h-3.5 w-3.5" /> {reserving ? 'Reserving…' : 'Reserve kit'}
            </Button>
          </CardContent>
        </Card>
      )}

      {req.status === 'pending' && (
        <Card variant="elevated">
          <CardContent className="p-4 flex items-center gap-3">
            <Info className="h-4 w-4 text-amber-500 shrink-0" />
            <span className="text-sm text-muted-foreground flex-1">This request is pending review.</span>
            {canChangeStatus && (
              <>
                <Button variant="outline" size="sm" onClick={() => onStatusChange(req, 'in_progress')} className="gap-1.5 text-xs">
                  <Clock className="h-3.5 w-3.5" /> Start Processing
                </Button>
                <Button size="sm" onClick={() => onStatusChange(req, 'ready')} className="gap-1.5 text-xs bg-emerald-500 hover:bg-emerald-600">
                  <CheckCircle className="h-3.5 w-3.5" /> Mark Ready
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {canChangeStatus && req.status === 'in_progress' && (
        <Card variant="elevated">
          <CardContent className="p-4 flex items-center gap-3">
            <Info className="h-4 w-4 text-blue-500 shrink-0" />
            <span className="text-sm text-muted-foreground flex-1">
              Once everything is set up, mark the request as ready. You'll then be able to send the welcome email below.
            </span>
            <Button size="sm" onClick={() => onStatusChange(req, 'ready')} className="gap-1.5 text-xs bg-emerald-500 hover:bg-emerald-600">
              <CheckCircle className="h-3.5 w-3.5" /> Mark Ready
            </Button>
          </CardContent>
        </Card>
      )}

      {req.status === 'ready' && (
        <WelcomeEmailSection req={req} sentEmail={sentEmail} />
      )}
    </div>
  )
}

export function OnboardingRequestsPage() {
  const { data: allRequests = [], isLoading } = useItRequests()
  const { data: emails = [] } = useOnboardingEmails()
  const updateRequest = useUpdateItRequest()
  const deleteRequest = useDeleteItRequest()
  const showToast = useUIStore((s) => s.showToast)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedId, setSelectedId] = useState<any>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null)

  const requests = useMemo(
    () => allRequests.filter((r) => r.type === 'onboarding'),
    [allRequests]
  )

  const sentByRequestId = useMemo(() => {
    const map = {}
    for (const e of emails) {
      if (e.it_request_id && e.status === 'sent') map[e.it_request_id] = e
    }
    return map
  }, [emails])

  const filtered = useMemo(() => {
    let result = requests
    if (statusFilter === 'welcome') {
      result = result.filter((r) => r.status === 'ready' && !sentByRequestId[r.id])
    } else if (statusFilter !== 'all') {
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
  }, [requests, search, statusFilter, sentByRequestId])

  const pendingCount = requests.filter((r) => r.status === 'pending').length
  const welcomeCount = requests.filter((r) => r.status === 'ready' && !sentByRequestId[r.id]).length

  const selectedRequest = useMemo(
    () => requests.find((r) => r.id === selectedId),
    [requests, selectedId]
  )

  const handleStatusChange = async (req, newStatus) => {
    try {
      await updateRequest.mutateAsync({ id: req.id, updates: { status: newStatus } })
      const label = newStatus === 'ready' ? 'welcome' : newStatus.replace('_', ' ')
      showToast(`Request marked as ${label}`)
      // For onboarding, the 'ready' step doesn't auto-notify the requester:
      // the welcome email composed afterwards IS the user-facing notification.
      // Only the in_progress transition triggers an auto status email.
      if (newStatus !== 'ready') {
        sendStatusChangeEmail(newStatus, { request: req, requestType: 'onboarding' })
      }
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      await deleteRequest.mutateAsync(deleteConfirm.id)
      showToast('Request deleted')
      if (selectedId === deleteConfirm.id) setSelectedId(null)
    } catch (err: any) {
      showToast(err.message, 'error')
    }
    setDeleteConfirm(null)
  }

  if (isLoading) return <PageLoading />

  if (selectedRequest) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Onboarding" description="Onboarding request details" />
        <RequestDetail
          req={selectedRequest}
          sentEmail={sentByRequestId[selectedRequest.id]}
          onBack={() => setSelectedId(null)}
          onDelete={(r) => setDeleteConfirm(r)}
          onStatusChange={handleStatusChange}
        />
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

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Onboarding"
        description={`${requests.length} request${requests.length !== 1 ? 's' : ''}`}
      />

      <div className="flex flex-wrap items-center gap-2">
        {[
          { value: 'all', label: 'All' },
          { value: 'pending', label: 'Pending', count: pendingCount },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'ready', label: 'Ready' },
          { value: 'welcome', label: 'Welcome', count: welcomeCount, accent: true },
        ].map((s) => (
          <Button
            key={s.value}
            variant={statusFilter === s.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(s.value)}
            className={cn(
              s.accent && statusFilter !== s.value && s.count > 0 && 'border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10'
            )}
          >
            {s.label}
            {s.count > 0 && (
              <span className={cn(
                'ml-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                statusFilter === s.value
                  ? 'bg-primary-foreground text-primary'
                  : s.accent
                    ? 'bg-emerald-500 text-white'
                    : 'bg-primary/15 text-primary'
              )}>
                {s.count}
              </span>
            )}
          </Button>
        ))}
        <div className="flex-1" />
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." className="pl-9 h-9" value={search} onChange={(e: any) => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={statusFilter === 'welcome' ? Mail : UserPlus}
          title={statusFilter === 'welcome' ? 'No welcome emails to send' : 'No onboarding requests'}
          description={statusFilter === 'welcome'
            ? 'Onboarding requests marked as ready will appear here once their welcome email is pending.'
            : 'No requests match the current filter'}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => {
            const data = req.data || {}
            const name = data.name || [data.first_name, data.last_name].filter(Boolean).join(' ') || req.requester_name || 'Unknown'
            const company = data.company || data.business_unit || ''
            const firstDay = data.first_day || ''
            const submitter = req.requester_name || ''
            const sentEmail = sentByRequestId[req.id]
            return (
              <Card
                key={req.id}
                variant="elevated"
                className="hover:shadow-card-hover transition-shadow cursor-pointer"
                onClick={() => setSelectedId(req.id)}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0">
                      <UserPlus className="h-5 w-5 text-cyan-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{name}</span>
                        <StatusBadge status={displayStatus(req.status, sentByRequestId[req.id])} />
                        {company && <Badge variant="secondary" className="text-[10px]">{company}</Badge>}
                        {sentEmail && (
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1">
                            <Check className="h-2.5 w-2.5" /> Welcome sent
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {submitter && <span>By {submitter}</span>}
                        {firstDay && <span>Starts {formatDate(firstDay)}</span>}
                        <span>{formatDate(req.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={(e: any) => e.stopPropagation()}>
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
                      <Button variant="ghost" size="sm" onClick={() => setSelectedId(req.id)} className="gap-1 text-xs">
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
