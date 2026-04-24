import { useState, useMemo } from 'react'
import { useAuth } from '@/lib/auth'
import { useMyLoanRequests } from '@/hooks/use-loan-requests'
import { useMyItRequests } from '@/hooks/use-it-requests'
import { useMyMailboxRequests } from '@/hooks/use-mailbox-requests'
import { motion } from 'motion/react'
import {
  Package, Clock, Loader2, CheckCircle, UserPlus,
  UserMinus, Mail, Inbox, ClipboardList,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

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

function RequestCard({ request, type }) {
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.equipment
  const TypeIcon = config.icon
  const data = request.data || {}

  const title = type === 'equipment'
    ? (request.project_name || 'Equipment Request')
    : (data.name || data.employee_name || data.project_name || request.requester_name || `${config.label} Request`)

  return (
    <Card variant="elevated" className="overflow-hidden">
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
        </div>
        <div className="mt-4 pl-14">
          <RequestStepper status={request.status || 'pending'} />
        </div>
      </CardContent>
    </Card>
  )
}

export function MyRequestsPage() {
  const { user } = useAuth()
  const [typeFilter, setTypeFilter] = useState('all')

  const { data: loanRequests = [], isLoading: loansLoading } = useMyLoanRequests(user?.id)
  const { data: itRequests = [], isLoading: itLoading } = useMyItRequests(user?.id)
  const { data: mailboxRequests = [], isLoading: mailboxLoading } = useMyMailboxRequests(user?.id)

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
    for (const r of allRequests) {
      counts[r._type] = (counts[r._type] || 0) + 1
    }
    return counts
  }, [allRequests])

  if (isLoading) return <PageLoading />

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold tracking-tight">My Requests</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {allRequests.length} request{allRequests.length !== 1 ? 's' : ''}
        </p>
      </motion.div>

      {/* Type filter tabs */}
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
              <RequestCard request={req} type={req._type} />
            </ScrollFadeIn>
          ))}
        </div>
      )}
    </div>
  )
}
