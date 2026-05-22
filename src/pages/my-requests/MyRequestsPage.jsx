import { useState, useMemo } from 'react'
import { useAuth } from '@/lib/auth'
import { useMyLoanRequests, useDeleteLoanRequest } from '@/hooks/use-loan-requests'
import { useMyItRequests, useDeleteItRequest } from '@/hooks/use-it-requests'
import { useMyMailboxRequests, useDeleteMailboxRequest } from '@/hooks/use-mailbox-requests'
import { useUIStore } from '@/stores/ui-store'
import { motion } from 'motion/react'
import {
  Package, Clock, Loader2, CheckCircle, UserPlus,
  UserMinus, Mail, Inbox, ClipboardList, ThumbsUp, ThumbsDown,
  Eye, Trash2, ArrowLeft,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { EmptyState } from '@/components/common/EmptyState'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { ScrollFadeIn } from '@/components/ui/motion'
import { cn } from '@/lib/utils'

const STEPS = [
  { key: 'pending', label: 'Pending', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500' },
  { key: 'in_progress', label: 'In Progress', icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-500' },
  { key: 'ready', label: 'Ready', icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500' },
]

const TYPE_CONFIG = {
  equipment: { icon: Package, label: 'Equipment', color: 'text-primary', bg: 'bg-primary/10' },
  onboarding: { icon: UserPlus, label: 'Onboarding', color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  offboarding: { icon: UserMinus, label: 'Offboarding', color: 'text-rose-500', bg: 'bg-rose-500/10' },
  mailbox: { icon: Mail, label: 'Mailbox', color: 'text-violet-500', bg: 'bg-violet-500/10' },
  it: { icon: ClipboardList, label: 'IT', color: 'text-amber-500', bg: 'bg-amber-500/10' },
}

const TYPE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'offboarding', label: 'Offboarding' },
  { key: 'mailbox', label: 'Mailbox' },
]

function getStepIndex(status) {
  const idx = STEPS.findIndex((s) => s.key === status)
  return idx >= 0 ? idx : 0
}

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

function RequestStepper({ status }) {
  const currentStep = getStepIndex(status)
  return (
    <div className="flex items-center gap-1 w-full">
      {STEPS.map((step, idx) => {
        const isDone = idx < currentStep
        const isCurrent = idx === currentStep
        const isPending = idx > currentStep
        const Icon = step.icon
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center transition-all',
                isDone && `${step.bg} text-white`,
                isCurrent && `${step.bg} text-white shadow-md`,
                isPending && 'bg-muted text-muted-foreground',
              )}>
                <Icon className={cn('h-4 w-4', isCurrent && step.key === 'in_progress' && 'animate-spin')} />
              </div>
              <span className={cn(
                'text-[9px] font-medium',
                isPending ? 'text-muted-foreground/50' : isCurrent ? step.color : 'text-muted-foreground'
              )}>
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={cn('flex-1 h-0.5 mx-1.5 mt-[-14px] rounded-full', isDone ? step.bg : 'bg-muted')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function SatisfactionRating({ requestId }) {
  const key = `satisfaction-${requestId}`
  const [rating, setRating] = useState(() => localStorage.getItem(key))
  const rate = (value) => { localStorage.setItem(key, value); setRating(value) }
  if (rating) {
    return (
      <div className="mt-3 pl-14 flex items-center gap-2 text-xs text-muted-foreground">
        {rating === 'up' ? <ThumbsUp className="h-3.5 w-3.5 text-emerald-500" /> : <ThumbsDown className="h-3.5 w-3.5 text-rose-500" />}
        <span>{rating === 'up' ? 'Thanks for the feedback!' : 'We\'ll do better next time'}</span>
      </div>
    )
  }
  return (
    <div className="mt-3 pl-14 flex items-center gap-3">
      <span className="text-xs text-muted-foreground">How was your experience?</span>
      <button onClick={() => rate('up')} className="h-7 w-7 rounded-full hover:bg-emerald-500/10 flex items-center justify-center transition-colors">
        <ThumbsUp className="h-4 w-4 text-muted-foreground hover:text-emerald-500" />
      </button>
      <button onClick={() => rate('down')} className="h-7 w-7 rounded-full hover:bg-rose-500/10 flex items-center justify-center transition-colors">
        <ThumbsDown className="h-4 w-4 text-muted-foreground hover:text-rose-500" />
      </button>
    </div>
  )
}

// Pretty-print any request payload as a list of key/value rows
function RequestDataRows({ request }) {
  const data = request.data || {}
  // Equipment requests use top-level columns instead of data{}
  const isEquipment = request._type === 'equipment'
  const entries = isEquipment
    ? [
        ['Project name', request.project_name],
        ['Items', request.item_count],
        ['Pickup date', formatDate(request.pickup_date)],
        ['Return date', formatDate(request.return_date)],
        ['Notes', request.notes],
      ]
    : Object.entries(data)
        .filter(([k, v]) => v !== '' && v !== null && v !== undefined && k !== 'submitted_at' && k !== 'terms_accepted')
        .map(([k, v]) => [
          k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          Array.isArray(v) ? v.join(', ') : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v),
        ])

  const submitted = new Date(request.created_at).toLocaleString('en-GB')

  return (
    <div className="space-y-2.5">
      {entries.filter(([, v]) => v !== undefined && v !== null && v !== '').map(([label, value]) => (
        <div key={label} className="flex items-start gap-3 text-sm">
          <span className="font-medium text-muted-foreground w-32 shrink-0 text-xs uppercase tracking-wider pt-0.5">{label}</span>
          <span className="text-foreground break-all">{value}</span>
        </div>
      ))}
      <div className="flex items-start gap-3 text-sm border-t pt-2.5">
        <span className="font-medium text-muted-foreground w-32 shrink-0 text-xs uppercase tracking-wider pt-0.5">Submitted</span>
        <span className="text-foreground">{submitted}</span>
      </div>
    </div>
  )
}

function RequestCard({ request, type, onOpen }) {
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.equipment
  const TypeIcon = config.icon
  const data = request.data || {}

  const title = type === 'equipment'
    ? (request.project_name || 'Equipment Request')
    : (data.name || data.employee_name || data.project_name || request.requester_name || `${config.label} Request`)

  return (
    <Card variant="elevated" className="overflow-hidden cursor-pointer hover:shadow-card-hover transition-shadow" onClick={onOpen}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', config.bg)}>
            <TypeIcon className={cn('h-5 w-5', config.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm truncate">{title}</h3>
              <Badge variant="outline" className="text-[10px] shrink-0">{config.label}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDate(request.created_at)}
              {type === 'equipment' && request.item_count && ` · ${request.item_count} item${request.item_count > 1 ? 's' : ''}`}
            </p>
          </div>
          <Button variant="ghost" size="sm" className="shrink-0" onClick={(e) => { e.stopPropagation(); onOpen() }}>
            <Eye className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-4 pl-14">
          <RequestStepper status={request.status || 'pending'} />
        </div>
        {(request.status === 'ready') && (
          <SatisfactionRating requestId={request.id} />
        )}
      </CardContent>
    </Card>
  )
}

export function MyRequestsPage() {
  const { user } = useAuth()
  const showToast = useUIStore((s) => s.showToast)
  const [typeFilter, setTypeFilter] = useState('all')
  const [detail, setDetail] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const { data: loanRequests = [], isLoading: loansLoading } = useMyLoanRequests(user?.id)
  const { data: itRequests = [], isLoading: itLoading } = useMyItRequests(user?.id)
  const { data: mailboxRequests = [], isLoading: mailboxLoading } = useMyMailboxRequests(user?.id)
  const deleteLoan = useDeleteLoanRequest()
  const deleteIt = useDeleteItRequest()
  const deleteMailbox = useDeleteMailboxRequest()

  const isLoading = loansLoading || itLoading || mailboxLoading

  const allRequests = useMemo(() => {
    const items = []
    for (const r of loanRequests) items.push({ ...r, _type: 'equipment' })
    for (const r of itRequests) items.push({ ...r, _type: r.type || 'onboarding' })
    for (const r of mailboxRequests) items.push({ ...r, _type: 'mailbox' })
    items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    return items
  }, [loanRequests, itRequests, mailboxRequests])

  const filtered = useMemo(() => {
    if (typeFilter === 'all') return allRequests
    return allRequests.filter((r) => r._type === typeFilter)
  }, [allRequests, typeFilter])

  const typeCounts = useMemo(() => {
    const counts = {}
    for (const r of allRequests) counts[r._type] = (counts[r._type] || 0) + 1
    return counts
  }, [allRequests])

  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      const r = deleteConfirm
      if (r._type === 'equipment') await deleteLoan.mutateAsync(r.id)
      else if (r._type === 'mailbox') await deleteMailbox.mutateAsync(r.id)
      else await deleteIt.mutateAsync(r.id)
      showToast('Request cancelled')
      if (detail?.id === r.id) setDetail(null)
    } catch (err) {
      showToast(err.message || 'Failed to cancel', 'error')
    }
    setDeleteConfirm(null)
  }

  if (isLoading) return <PageLoading />

  const canCancel = detail && detail.status === 'pending'
  const detailType = detail ? (TYPE_CONFIG[detail._type] || TYPE_CONFIG.equipment) : null
  const detailTitle = detail
    ? (detail._type === 'equipment'
        ? (detail.project_name || 'Equipment Request')
        : (detail.data?.name || detail.data?.employee_name || detail.data?.project_name || `${detailType.label} Request`))
    : ''

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold tracking-tight">My Requests</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {allRequests.length} request{allRequests.length !== 1 ? 's' : ''}
        </p>
      </motion.div>

      <div className="flex flex-wrap gap-1.5">
        {TYPE_FILTERS.filter((t) => t.key === 'all' || typeCounts[t.key]).map((t) => (
          <Button
            key={t.key}
            variant={typeFilter === t.key ? 'default' : 'outline'}
            size="sm"
            className="text-xs h-8"
            onClick={() => setTypeFilter(t.key)}
          >
            {t.label}
            {t.key !== 'all' && typeCounts[t.key] > 0 && (
              <span className="ml-1 text-[10px] opacity-70">({typeCounts[t.key]})</span>
            )}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No requests"
          description={typeFilter === 'all' ? 'Your submitted requests will appear here.' : `No ${typeFilter} requests found.`}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((req, i) => (
            <ScrollFadeIn key={req.id} delay={i * 0.05}>
              <RequestCard request={req} type={req._type} onOpen={() => setDetail(req)} />
            </ScrollFadeIn>
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          {detail && detailType && (
            <>
              <div className="p-5 border-b border-border/50 flex items-center gap-3">
                <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', detailType.bg)}>
                  <detailType.icon className={cn('h-5 w-5', detailType.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-base">{detailTitle}</DialogTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px]">{detailType.label}</Badge>
                    <Badge variant="outline" className={cn('text-[10px]',
                      detail.status === 'pending' && 'bg-amber-500/10 text-amber-600 border-amber-500/30',
                      detail.status === 'in_progress' && 'bg-blue-500/10 text-blue-600 border-blue-500/30',
                      detail.status === 'ready' && 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
                    )}>
                      {detail.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="p-5 max-h-[60vh] overflow-y-auto">
                <RequestDataRows request={detail} />
              </div>
              <DialogFooter className="p-5 border-t border-border/50 gap-2">
                {canCancel ? (
                  <>
                    <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>
                    <Button variant="destructive" className="gap-2" onClick={() => setDeleteConfirm(detail)}>
                      <Trash2 className="h-4 w-4" /> Cancel request
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="p-6">
          <DialogHeader><DialogTitle>Cancel this request?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will delete the request permanently. You can submit a new one anytime.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Keep it</Button>
            <Button variant="destructive" onClick={handleDelete}>Yes, cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
