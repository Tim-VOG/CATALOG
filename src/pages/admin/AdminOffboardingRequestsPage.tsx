import { useState, useMemo } from 'react'
import { useItRequests, useUpdateItRequest, useDeleteItRequest } from '@/hooks/use-it-requests'
import { sendStatusChangeEmail } from '@/services/request-status-service'
import { useUIStore } from '@/stores/ui-store'
import { useAuth } from '@/lib/auth'
import {
  Search, UserMinus, Trash2, ArrowLeft, Package, Check, Mail, Info, Clock, CheckCircle, Eye, Shield, ClipboardCheck,
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { OffboardingChecklist } from '@/components/admin/OffboardingChecklist'
import { cn } from '@/lib/utils'

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const STATUS_COLORS = {
  pending: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  in_progress: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  ready: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
}

// ── Info card (all fields visible, mirrors Onboarding/Mailbox pattern) ──
function OffboardingRequestInfoCard({ req  }: any) {
  const data = req.data || {}
  const fullName = data.employee_name || data.name || [data.first_name, data.last_name].filter(Boolean).join(' ') || 'Unknown'
  const corporateEmail = data.email || data.corporate_email || data.email_to_revoke || '—'

  const fmtBool = (v) => (v === true ? 'Yes' : v === false ? 'No' : '—')
  const ooo = data.ooo_enabled
    ? [
        ['Out Of Office', 'Yes'],
        ['OOO From', formatDate(data.ooo_start)],
        ['OOO Until', formatDate(data.ooo_end)],
        ['OOO Message', data.ooo_message],
      ]
    : data.ooo_enabled === false
      ? [['Out Of Office', 'No']]
      : []

  // Show every field we have in data, in a consistent order. Booleans → Yes/No,
  // arrays → comma list, dates → formatted.
  const fields = [
    ['Employee Name', fullName],
    ['Corporate Email', corporateEmail],
    ['Company', data.company],
    ['Business Unit', data.business_unit],
    ['Job Title', data.job_title],
    ['Department', data.department],
    ['Departure On', formatDate(data.departure_on || data.last_day || data.departure_date)],
    ['Reason', data.reason],
    ['Replacement', data.replacement_name],
    ['Manager', data.manager_name],
    ['Revoke Email Access', fmtBool(data.revoke_email_access)],
    ['Revoke VPN / Tools', fmtBool(data.revoke_vpn_tools_access)],
    ['Transfer Mailbox Data', fmtBool(data.transfer_mailbox_data)],
    ['Transfer SharePoint Data', fmtBool(data.transfer_sharepoint_data)],
    ['Transfer Details', data.transfer_details],
    ...ooo,
    ['Collect Laptop', fmtBool(data.collect_laptop)],
    ['Collect Phone', fmtBool(data.collect_phone)],
    ['Collect Badge/Keys', fmtBool(data.collect_badge_keys)],
    ['Equipment Notes', data.equipment_notes],
    ['Equipment to recover', Array.isArray(data.equipment_to_recover) ? data.equipment_to_recover.join(', ') : data.equipment_to_recover],
    ['Access to revoke', Array.isArray(data.access_to_revoke) ? data.access_to_revoke.join(', ') : data.access_to_revoke],
    ['Notes', data.notes],
    ['Requested By', req.requester_name],
    ['Requester Email', req.requester_email],
    ['Submitted', new Date(req.created_at).toLocaleString('fr-FR')],
  ]

  // Catch any custom fields we don't know about, after the known ones
  const knownKeys = new Set([
    'employee_name','name','first_name','last_name','email','corporate_email','email_to_revoke',
    'company','business_unit','job_title','department','last_day','departure_date','departure_on','reason',
    'replacement_name','manager_name','equipment_to_recover','access_to_revoke','notes',
    'revoke_email_access','revoke_vpn_tools_access','transfer_mailbox_data','transfer_sharepoint_data',
    'transfer_details','ooo_enabled','ooo_start','ooo_end','ooo_message',
    'collect_laptop','collect_phone','collect_badge_keys','equipment_notes',
    'leaving_user_id','leaving_user_email','requested_by','requested_on',
    'revoked_accesses','submitted_at','terms_accepted',
  ])
  const extras = Object.entries(data as Record<string, any>)
    .filter(([k, v]) => !knownKeys.has(k) && v !== '' && v !== null && v !== undefined)
    .map(([k, v]) => [
      k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      Array.isArray(v) ? v.join(', ') : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v),
    ])

  const allFields = [...fields, ...extras]

  return (
    <Card variant="elevated">
      <CardContent className="p-0">
        <div className="p-5 pb-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <UserMinus className="h-5 w-5 text-rose-500" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{fullName}</h3>
                <p className="text-xs text-muted-foreground">{corporateEmail}</p>
              </div>
            </div>
            <Badge variant="outline" className={cn('text-xs', STATUS_COLORS[req.status])}>
              {req.status}
            </Badge>
          </div>
        </div>
        <div className="p-5 space-y-2.5">
          {allFields.map(([label, value]) => (
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

// ── Auto-generated revoke checklist ──
// Looks up the matching onboarding request by employee name and surfaces every
// access / list the new hire was granted. Admins tick items off as they revoke
// them; ticked items are persisted on the offboarding's data.revoked_accesses.
function RevokeChecklist({ req, onboardingMatch, onToggle  }: any) {
  const data = req.data || {}
  const onboardingData = onboardingMatch?.data || {}

  // Pull every access-shaped field from the matching onboarding payload
  const items = []
  const push = (label, value) => {
    if (!value) return
    const list = Array.isArray(value) ? value : String(value).split(/[,;]\s*/).filter(Boolean)
    for (const v of list) items.push({ id: `${label}::${v}`, group: label, label: v })
  }
  push('Access', onboardingData.what_access)
  push('Emailing list', onboardingData.emailing)
  push('Distribution list', onboardingData.distribution_lists)
  push('SharePoint folder', onboardingData.sharepoint_folders)
  push('Group', onboardingData.groups)
  // If the offboarding form already had its own access_to_revoke, treat each as a checkbox too
  if (Array.isArray(data.access_to_revoke)) {
    for (const v of data.access_to_revoke) items.push({ id: `Manual::${v}`, group: 'Manual', label: v })
  }

  const revoked = new Set(data.revoked_accesses || [])

  if (items.length === 0 && !onboardingMatch) {
    return (
      <Card variant="elevated" className="border-dashed">
        <CardContent className="p-4 flex items-center gap-3 text-sm text-muted-foreground">
          <Shield className="h-4 w-4 shrink-0" />
          <span>No matching onboarding request found for <strong>{data.employee_name || data.name}</strong>. Add items manually to the offboarding form to populate this checklist.</span>
        </CardContent>
      </Card>
    )
  }
  if (items.length === 0) {
    return (
      <Card variant="elevated">
        <CardContent className="p-4 flex items-center gap-3 text-sm text-muted-foreground">
          <Shield className="h-4 w-4 shrink-0 text-emerald-500" />
          <span>Matching onboarding found but no access was granted. Nothing to revoke.</span>
        </CardContent>
      </Card>
    )
  }

  // Group items for display
  const byGroup = {}
  for (const it of items) (byGroup[it.group] = byGroup[it.group] || []).push(it)
  const total = items.length
  const done = items.filter((i) => revoked.has(i.id)).length

  return (
    <Card variant="elevated">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
            <ClipboardCheck className="h-4 w-4 text-rose-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm">Access to revoke</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Auto-generated from {onboardingMatch ? "the matching onboarding request" : "the offboarding form"}.
              {' '}{done}/{total} revoked.
            </p>
          </div>
          {done === total && (
            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1">
              <CheckCircle className="h-3 w-3" /> All done
            </Badge>
          )}
        </div>

        {Object.entries(byGroup as Record<string, any>).map(([group, list]) => (
          <div key={group} className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{group}</div>
            <div className="space-y-1">
              {list.map((item) => {
                const isRevoked = revoked.has(item.id)
                return (
                  <label key={item.id} className={cn(
                    'flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all',
                    isRevoked ? 'bg-emerald-500/5 border-emerald-500/20' : 'border-border/40 hover:border-primary/30 hover:bg-muted/30'
                  )}>
                    <Checkbox checked={isRevoked} onCheckedChange={() => onToggle(item.id)} className="mt-0.5" />
                    <span className={cn('text-sm flex-1', isRevoked && 'line-through text-muted-foreground')}>
                      {item.label}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ── Inline detail view ──
function RequestDetail({ req, onBack, onDelete, onStatusChange, onboardingMatch, onToggleRevoked  }: any) {
  const { user, isAdmin } = useAuth()
  const isOwnRequest = !!user && (req.requester_id === user.id || req.requested_by === user.id)
  const canDelete = isAdmin || isOwnRequest
  const canChangeStatus = isAdmin
  const data = req.data || {}
  const fullName = data.employee_name || data.name || [data.first_name, data.last_name].filter(Boolean).join(' ') || 'Unknown'

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-xs">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
        <div className="flex-1">
          <h2 className="text-lg font-display font-bold">{fullName}</h2>
          <p className="text-xs text-muted-foreground">Offboarding Request Details</p>
        </div>
        {canDelete && (
          <Button variant="ghost" size="sm" onClick={() => onDelete(req)} className="text-destructive hover:text-destructive text-xs gap-1.5">
            <Trash2 className="h-3.5 w-3.5" /> {isAdmin ? 'Delete' : 'Cancel'}
          </Button>
        )}
      </div>

      <OffboardingRequestInfoCard req={req} />

      <RevokeChecklist req={req} onboardingMatch={onboardingMatch} onToggle={onToggleRevoked} />

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

      {req.status === 'in_progress' && (
        <Card variant="elevated">
          <CardContent className="p-4 flex items-center gap-3">
            <Info className="h-4 w-4 text-blue-500 shrink-0" />
            <span className="text-sm text-muted-foreground flex-1">
              Revoke access and recover equipment, then mark the request as ready.
            </span>
            <Button size="sm" onClick={() => onStatusChange(req, 'ready')} className="gap-1.5 text-xs bg-emerald-500 hover:bg-emerald-600">
              <CheckCircle className="h-3.5 w-3.5" /> Mark Ready
            </Button>
          </CardContent>
        </Card>
      )}

      {(req.status === 'pending' || req.status === 'in_progress') && (
        <OffboardingChecklist req={req} />
      )}

      {req.status === 'ready' && (
        <Card variant="elevated" className="border-emerald-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="text-sm text-muted-foreground flex-1">Offboarding complete.</span>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export function AdminOffboardingRequestsPage() {
  const { data: allRequests = [], isLoading } = useItRequests()
  const updateRequest = useUpdateItRequest()
  const deleteRequest = useDeleteItRequest()
  const showToast = useUIStore((s) => s.showToast)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedId, setSelectedId] = useState<any>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null)

  const requests = useMemo(
    () => allRequests.filter((r) => r.type === 'offboarding'),
    [allRequests]
  )

  // Index onboarding requests by lowercased "first last" name for matching
  const onboardingByName = useMemo(() => {
    const map = {}
    for (const r of allRequests) {
      if (r.type !== 'onboarding') continue
      const d = r.data || {}
      const name = (d.name || `${d.first_name || ''} ${d.last_name || ''}`).trim().toLowerCase()
      if (name) map[name] = r
    }
    return map
  }, [allRequests])

  const findOnboardingFor = (req) => {
    const d = req.data || {}
    const name = (d.employee_name || d.name || `${d.first_name || ''} ${d.last_name || ''}`).trim().toLowerCase()
    return onboardingByName[name] || null
  }

  const handleToggleRevoked = async (req, itemId) => {
    const current = new Set(req.data?.revoked_accesses || [])
    if (current.has(itemId)) current.delete(itemId)
    else current.add(itemId)
    const newData = { ...req.data, revoked_accesses: Array.from(current) }
    try {
      await updateRequest.mutateAsync({ id: req.id, updates: { data: newData } })
    } catch (err: any) {
      showToast(err.message || 'Update failed', 'error')
    }
  }

  const filtered = useMemo(() => {
    let result = requests
    if (statusFilter !== 'all') result = result.filter((r) => r.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((r) => {
        const data = r.data || {}
        return (data.employee_name || data.name || '').toLowerCase().includes(q) ||
          (r.requester_name || '').toLowerCase().includes(q) ||
          (data.company || '').toLowerCase().includes(q)
      })
    }
    return result
  }, [requests, search, statusFilter])

  const pendingCount = requests.filter((r) => r.status === 'pending').length

  const selectedRequest = useMemo(
    () => requests.find((r) => r.id === selectedId),
    [requests, selectedId]
  )

  const handleStatusChange = async (req, newStatus) => {
    try {
      await updateRequest.mutateAsync({ id: req.id, updates: { status: newStatus } })
      showToast(`Request marked as ${newStatus.replace('_', ' ')}`)
      sendStatusChangeEmail(newStatus, { request: req, requestType: 'offboarding' })
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
        <AdminPageHeader title="Offboarding" description="Offboarding request details" />
        <RequestDetail
          req={selectedRequest}
          onboardingMatch={findOnboardingFor(selectedRequest)}
          onToggleRevoked={(itemId) => handleToggleRevoked(selectedRequest, itemId)}
          onBack={() => setSelectedId(null)}
          onDelete={(r) => setDeleteConfirm(r)}
          onStatusChange={handleStatusChange}
        />
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent className="p-6">
            <DialogHeader><DialogTitle>Delete Request?</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">This will permanently delete this offboarding request.</p>
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
      <AdminPageHeader title="Offboarding" description={`${requests.length} request${requests.length !== 1 ? 's' : ''}`} />

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

      {filtered.length === 0 ? (
        <EmptyState icon={UserMinus} title="No offboarding requests" description="No requests match the current filter" />
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => {
            const data = req.data || {}
            const name = data.employee_name || data.name || req.requester_name || 'Unknown'
            const company = data.company || ''
            const lastDay = data.departure_on || data.last_day || data.departure_date || ''
            const submitter = req.requester_name || ''
            return (
              <Card
                key={req.id}
                variant="elevated"
                className="hover:shadow-card-hover transition-shadow cursor-pointer"
                onClick={() => setSelectedId(req.id)}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
                      <UserMinus className="h-5 w-5 text-rose-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{name}</span>
                        <StatusBadge status={req.status} />
                        {company && <Badge variant="secondary" className="text-[10px]">{company}</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {submitter && <span>By {submitter}</span>}
                        {lastDay && <span>Leaves {formatDate(lastDay)}</span>}
                        <span>{formatDate(req.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
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
          <p className="text-sm text-muted-foreground">This will permanently delete this offboarding request.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
