import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/lib/auth'
import { useMyLoanRequests, useUpdateLoanRequest } from '@/hooks/use-loan-requests'
import { useMyItRequests, useUpdateItRequest } from '@/hooks/use-it-requests'
import { useMyMailboxRequests, useUpdateMailboxRequest } from '@/hooks/use-mailbox-requests'
import { useUIStore } from '@/stores/ui-store'
import { motion } from 'motion/react'
import {
  Package, Clock, Loader2, CheckCircle, UserPlus,
  UserMinus, Mail, Inbox, ClipboardList, ThumbsUp, ThumbsDown,
  Eye, ArrowLeft, MessageSquare,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
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

const STEP_LABEL_KEYS: Record<string, string> = {
  pending: 'steps.pending',
  in_progress: 'steps.inProgress',
  ready: 'steps.ready',
}

const TYPE_LABEL_KEYS: Record<string, string> = {
  equipment: 'types.equipment',
  onboarding: 'types.onboarding',
  offboarding: 'types.offboarding',
  mailbox: 'types.mailbox',
  it: 'types.it',
}

const FILTER_LABEL_KEYS: Record<string, string> = {
  all: 'filters.all',
  ...TYPE_LABEL_KEYS,
}

function getStepIndex(status: any) {
  const idx = STEPS.findIndex((s: any) => s.key === status)
  return idx >= 0 ? idx : 0
}

const formatDate = (d: any) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

function RequestStepper({ status  }: any) {
  const { t } = useTranslation()
  const currentStep = getStepIndex(status)
  return (
    <div className="flex items-center gap-1 w-full">
      {STEPS.map((step: any, idx: any) => {
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
                {t(`user.myRequests.${STEP_LABEL_KEYS[step.key] || 'steps.pending'}`, { defaultValue: step.label })}
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

function SatisfactionRating({ requestId  }: any) {
  const { t } = useTranslation()
  const key = `satisfaction-${requestId}`
  const [rating, setRating] = useState(() => localStorage.getItem(key))
  const rate = (value: any) => { localStorage.setItem(key, value); setRating(value) }
  if (rating) {
    return (
      <div className="mt-3 pl-14 flex items-center gap-2 text-xs text-muted-foreground">
        {rating === 'up' ? <ThumbsUp className="h-3.5 w-3.5 text-emerald-500" /> : <ThumbsDown className="h-3.5 w-3.5 text-rose-500" />}
        <span>{rating === 'up' ? t('user.myRequests.feedbackThanks') : t('user.myRequests.feedbackApology')}</span>
      </div>
    )
  }
  return (
    <div className="mt-3 pl-14 flex items-center gap-3">
      <span className="text-xs text-muted-foreground">{t('user.myRequests.howWasExperience')}</span>
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
function RequestDataRows({ request  }: any) {
  const { t } = useTranslation()
  const data = request.data || {}
  // Equipment requests use top-level columns instead of data{}
  const isEquipment = request._type === 'equipment'
  const entries = isEquipment
    ? [
        [t('user.myRequests.fieldProjectName'), request.project_name],
        [t('user.myRequests.fieldItems'), request.item_count],
        [t('user.myRequests.fieldPickupDate'), formatDate(request.pickup_date)],
        [t('user.myRequests.fieldReturnDate'), formatDate(request.return_date)],
        [t('user.myRequests.fieldNotes'), request.notes],
      ]
    : Object.entries(data as Record<string, any>)
        .filter(([k, v]) => v !== '' && v !== null && v !== undefined && k !== 'submitted_at' && k !== 'terms_accepted')
        .map(([k, v]) => [
          k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          Array.isArray(v) ? v.join(', ') : typeof v === 'boolean' ? (v ? t('user.myRequests.yes') : t('user.myRequests.no')) : String(v),
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
        <span className="font-medium text-muted-foreground w-32 shrink-0 text-xs uppercase tracking-wider pt-0.5">{t('user.myRequests.fieldSubmitted')}</span>
        <span className="text-foreground">{submitted}</span>
      </div>
    </div>
  )
}

function RequestCard({ request, type, onOpen  }: any) {
  const { t } = useTranslation()
  const config = (TYPE_CONFIG as Record<string, any>)[type] || TYPE_CONFIG.equipment
  const TypeIcon = config.icon
  const data = request.data || {}
  const typeLabel = t(`user.myRequests.${TYPE_LABEL_KEYS[type] || TYPE_LABEL_KEYS.equipment}`, { defaultValue: config.label })

  const title = type === 'equipment'
    ? (request.project_name || t('user.myRequests.genericRequestTitle', { type: typeLabel }))
    : (data.name || data.employee_name || data.project_name || request.requester_name || t('user.myRequests.genericRequestTitle', { type: typeLabel }))

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
              <Badge variant="outline" className="text-[10px] shrink-0">{typeLabel}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDate(request.created_at)}
              {type === 'equipment' && request.item_count && ` · ${t('user.myRequests.itemCount', { count: request.item_count })}`}
            </p>
          </div>
          <Button variant="ghost" size="sm" className="shrink-0" onClick={(e: any) => { e.stopPropagation(); onOpen() }}>
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
  const { t } = useTranslation()
  const { user } = useAuth()
  const showToast = useUIStore((s: any) => s.showToast)
  const [typeFilter, setTypeFilter] = useState('all')
  // Keep only the open request's identity (id + type) so we can pull the
  // freshest row from allRequests on every render — otherwise saving a
  // note would leave the local `detail` snapshot stale and the UI wouldn't
  // reflect what's already persisted.
  const [selectedKey, setSelectedKey] = useState<any>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)

  const { data: loanRequests = [], isLoading: loansLoading } = useMyLoanRequests(user?.id)
  const { data: itRequests = [], isLoading: itLoading } = useMyItRequests(user?.id)
  const { data: mailboxRequests = [], isLoading: mailboxLoading } = useMyMailboxRequests(user?.id)
  const updateLoan = useUpdateLoanRequest()
  const updateIt = useUpdateItRequest()
  const updateMailbox = useUpdateMailboxRequest()

  const isLoading = loansLoading || itLoading || mailboxLoading

  const allRequests = useMemo(() => {
    const items: any[] = []
    for (const r of loanRequests) items.push({ ...r, _type: 'equipment' })
    for (const r of itRequests) items.push({ ...r, _type: r.type || 'onboarding' })
    for (const r of mailboxRequests) items.push({ ...r, _type: 'mailbox' })
    items.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return items
  }, [loanRequests, itRequests, mailboxRequests])

  const filtered = useMemo(() => {
    if (typeFilter === 'all') return allRequests
    return allRequests.filter((r: any) => r._type === typeFilter)
  }, [allRequests, typeFilter])

  const typeCounts = useMemo(() => {
    const counts: Record<string, any> = {}
    for (const r of allRequests) counts[r._type] = (counts[r._type] || 0) + 1
    return counts
  }, [allRequests])

  // Always look up the current detail in the freshly fetched list so any
  // mutation (note save, cancel, status change) reflects immediately.
  const detail = useMemo(() => {
    if (!selectedKey) return null
    return allRequests.find((r: any) => `${r._type}:${r.id}` === selectedKey) || null
  }, [allRequests, selectedKey])
  const setDetail = (req: any) => setSelectedKey(req ? `${req._type}:${req.id}` : null)

  // Read the persisted note for the currently-viewed request, depending on its type.
  const currentNote = !detail ? '' : (
    detail._type === 'equipment' ? (detail.user_notes || '') :
    detail._type === 'mailbox'   ? (detail.user_notes || '') :
    (detail.data?.user_note || '')
  )

  // When the detail changes, seed the textarea with what's already saved
  // so users can edit instead of overwriting blindly.
  useEffect(() => { setNoteDraft(currentNote) }, [detail?.id, currentNote])

  const handleSaveNote = async () => {
    if (!detail) return
    setNoteSaving(true)
    try {
      const trimmed = noteDraft.trim()
      if (detail._type === 'equipment') {
        await updateLoan.mutateAsync({ id: detail.id, user_notes: trimmed })
      } else if (detail._type === 'mailbox') {
        await updateMailbox.mutateAsync({ id: detail.id, user_notes: trimmed })
      } else {
        const newData = { ...(detail.data || {}), user_note: trimmed }
        await updateIt.mutateAsync({ id: detail.id, updates: { data: newData } })
      }
      showToast(trimmed ? t('user.myRequests.noteSaved') : t('user.myRequests.noteCleared'))
    } catch (err: any) {
      showToast(err.message || t('user.myRequests.noteSaveFailed'), 'error')
    } finally {
      setNoteSaving(false)
    }
  }

  if (isLoading) return <PageLoading />

  const canCancel = detail && detail.status === 'pending'
  const detailType = detail ? ((TYPE_CONFIG as Record<string, any>)[detail._type] || TYPE_CONFIG.equipment) : null
  const detailTypeLabel = detail && detailType
    ? t(`user.myRequests.${TYPE_LABEL_KEYS[detail._type] || TYPE_LABEL_KEYS.equipment}`, { defaultValue: detailType.label })
    : ''
  const detailTitle = detail
    ? (detail._type === 'equipment'
        ? (detail.project_name || t('user.myRequests.genericRequestTitle', { type: detailTypeLabel }))
        : (detail.data?.name || detail.data?.employee_name || detail.data?.project_name || t('user.myRequests.genericRequestTitle', { type: detailTypeLabel })))
    : ''
  const detailStatusLabel = detail
    ? t(`user.myRequests.${STEP_LABEL_KEYS[detail.status] || 'steps.pending'}`, { defaultValue: detail.status })
    : ''

  // ── Inline detail view (replaces the list) ───────────────────
  if (detail && detailType) {
    return (
      <div className="max-w-2xl mx-auto py-10 px-4 space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setDetail(null)} className="gap-1.5 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" /> {t('user.myRequests.backToMyRequests')}
          </Button>
        </div>

        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="p-5 border-b border-border/50 flex items-center gap-3">
            <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center shrink-0', detailType.bg)}>
              <detailType.icon className={cn('h-6 w-6', detailType.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-display font-bold truncate">{detailTitle}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[10px]">{detailTypeLabel}</Badge>
                <Badge variant="outline" className={cn('text-[10px]',
                  detail.status === 'pending' && 'bg-amber-500/10 text-amber-600 border-amber-500/30',
                  detail.status === 'in_progress' && 'bg-blue-500/10 text-blue-600 border-blue-500/30',
                  detail.status === 'ready' && 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
                )}>{detailStatusLabel}</Badge>
              </div>
            </div>
          </div>
          <div className="p-5">
            <RequestDataRows request={detail} />
          </div>

          {/* Note to admin */}
          <div className="p-5 border-t border-border/50 bg-muted/20 space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">{t('user.myRequests.noteToItTeam')}</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('user.myRequests.noteToItTeamDescription')}
            </p>
            {canCancel ? (
              <>
                <Textarea
                  value={noteDraft}
                  onChange={(e: any) => setNoteDraft(e.target.value)}
                  rows={3}
                  placeholder={t('user.myRequests.notePlaceholder')}
                  maxLength={1000}
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] text-muted-foreground">{noteDraft.length}/1000</span>
                  <Button
                    size="sm"
                    onClick={handleSaveNote}
                    disabled={noteSaving || noteDraft === currentNote}
                    className="gap-2"
                  >
                    {noteSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
                    {noteSaving ? t('user.myRequests.savingNote') : currentNote ? t('user.myRequests.updateNote') : t('user.myRequests.saveNote')}
                  </Button>
                </div>
              </>
            ) : currentNote ? (
              <div className="rounded-lg border border-border/40 bg-card p-3 text-sm">{currentNote}</div>
            ) : (
              <p className="text-xs text-muted-foreground italic">{t('user.myRequests.notePendingOnly')}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold tracking-tight">{t('user.myRequests.pageTitle')}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t('user.myRequests.requestCount', { count: allRequests.length })}
        </p>
      </motion.div>

      <div className="flex flex-wrap gap-1.5">
        {TYPE_FILTERS.filter((f: any) => f.key === 'all' || (typeCounts as Record<string, any>)[f.key]).map((f: any) => (
          <Button
            key={f.key}
            variant={typeFilter === f.key ? 'default' : 'outline'}
            size="sm"
            className="text-xs h-8"
            onClick={() => setTypeFilter(f.key)}
          >
            {t(`user.myRequests.${FILTER_LABEL_KEYS[f.key] || 'filters.all'}`, { defaultValue: f.label })}
            {f.key !== 'all' && (typeCounts as Record<string, any>)[f.key] > 0 && (
              <span className="ml-1 text-[10px] opacity-70">({(typeCounts as Record<string, any>)[f.key]})</span>
            )}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={t('user.myRequests.noRequestsTitle')}
          description={typeFilter === 'all' ? t('user.myRequests.noRequestsAllDescription') : t('user.myRequests.noRequestsTypeDescription', { type: t(`user.myRequests.${TYPE_LABEL_KEYS[typeFilter] || 'types.equipment'}`) })}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((req: any, i: any) => (
            <ScrollFadeIn key={req.id} delay={i * 0.05}>
              <RequestCard request={req} type={req._type} onOpen={() => setDetail(req)} />
            </ScrollFadeIn>
          ))}
        </div>
      )}

    </div>
  )
}
