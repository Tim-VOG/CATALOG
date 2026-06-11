import { useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { format, addDays, differenceInDays, startOfDay, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAuth } from '@/lib/auth'
import { useLoanRequests } from '@/hooks/use-loan-requests'
import { useItRequests } from '@/hooks/use-it-requests'
import { useMailboxRequests } from '@/hooks/use-mailbox-requests'
import { useProducts } from '@/hooks/use-products'
import { useQRCodes, useOverdueScans, useUpcomingReturns, useScanLogs } from '@/hooks/use-qr-codes'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { checkAndSendReturnReminders } from '@/services/return-reminder-service'
import { UserAvatar } from '@/components/common/UserAvatar'
import {
  ArrowRight, AlertTriangle, Sparkles, QrCode, ScanLine,
  PackageCheck, Inbox, TrendingDown, Activity, Clock,
  CalendarRange, UserPlus, Mail, Box, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Fade-up animation ─────────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: [0.22, 0.61, 0.36, 1] },
})

// ── Greeting based on time of day ─────────────────────────────
function useGreeting() {
  const hour = new Date().getHours()
  if (hour < 5)  return 'Belle nuit'
  if (hour < 12) return 'Bonjour'
  if (hour < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

// ── Radial fleet ring (pure SVG, no recharts) ─────────────────
function FleetRing({ available, onLoan, broken, total }) {
  const size = 220
  const stroke = 18
  const radius = (size - stroke) / 2
  const c = 2 * Math.PI * radius

  const segments = [
    { value: available, color: 'stroke-emerald-500', label: 'Available' },
    { value: onLoan,    color: 'stroke-amber-500',   label: 'On loan' },
    { value: broken,    color: 'stroke-rose-500',    label: 'Broken / lost' },
  ]

  let offset = 0
  const pct = total > 0 ? Math.round((available / total) * 100) : 0

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          className="stroke-muted/40"
          strokeWidth={stroke}
        />
        {segments.map((seg, i) => {
          const length = total > 0 ? (seg.value / total) * c : 0
          const dasharray = `${length} ${c - length}`
          const dashoffset = -offset
          offset += length
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={dasharray}
              strokeDashoffset={dashoffset}
              className={cn(seg.color, 'transition-all duration-700')}
            />
          )
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Available</span>
        <span className="text-5xl font-display font-bold tabular-nums">{pct}%</span>
        <span className="text-xs text-muted-foreground mt-0.5">{available} of {total} units</span>
      </div>
    </div>
  )
}

// ── Live pulse dot ────────────────────────────────────────────
function LivePulse() {
  return (
    <span className="relative inline-flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
    </span>
  )
}

// ── Sparkline (tiny SVG) ──────────────────────────────────────
function Sparkline({ values, className }) {
  if (!values || values.length === 0) return null
  const w = 80, h = 24
  const max = Math.max(...values, 1)
  const step = w / Math.max(values.length - 1, 1)
  const points = values.map((v, i) => `${i * step},${h - (v / max) * h}`).join(' ')
  return (
    <svg width={w} height={h} className={cn('overflow-visible', className)}>
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ── Attention card (the smart action prompt) ──────────────────
function AttentionRow({ icon: Icon, color, glow, label, count, to }) {
  if (!count) return null
  return (
    <Link
      to={to}
      className={cn(
        'group flex items-center gap-3 px-4 py-3 rounded-2xl border border-border/40 bg-card/50',
        'hover:bg-card/80 hover:border-border/70 transition-all',
        glow,
      )}
    >
      <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center shrink-0', color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{label}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xl font-display font-bold tabular-nums">{count}</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  )
}

// ── Week strip (compact 7-day mini-gantt) ─────────────────────
function WeekStrip({ requests }) {
  const today = startOfDay(new Date())
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i))

  const items = useMemo(() => {
    return requests
      .filter((r) => ['pending', 'in_progress', 'ready'].includes(r.status))
      .map((r) => {
        const start = startOfDay(new Date(r.pickup_date || r.created_at))
        const end = startOfDay(new Date(r.return_date || addDays(start, 7)))
        const s = Math.max(0, differenceInDays(start, today))
        const e = Math.min(6, differenceInDays(end, today))
        return { ...r, s, e, span: e - s + 1, visible: e >= 0 && s <= 6 }
      })
      .filter((r) => r.visible)
      .slice(0, 5)
  }, [requests, today])

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {days.map((d, i) => (
          <div
            key={i}
            className={cn(
              'text-center py-2 rounded-xl text-[10px] uppercase tracking-wider',
              i === 0 ? 'bg-primary/12 text-primary font-bold' : 'text-muted-foreground/70',
            )}
          >
            <div>{format(d, 'EEE')}</div>
            <div className="text-[11px] mt-0.5 normal-case font-display font-semibold tracking-normal">
              {format(d, 'd')}
            </div>
          </div>
        ))}
      </div>
      {items.length === 0 ? (
        <div className="h-32 flex flex-col items-center justify-center text-muted-foreground/60">
          <CalendarRange className="h-7 w-7 mb-2 opacity-40" />
          <p className="text-xs">No upcoming reservations this week</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map((it) => (
            <Link
              key={it.id}
              to={it._link || `/admin/requests/${it.id}`}
              className="grid grid-cols-7 gap-1 group"
            >
              {Array.from({ length: 7 }).map((_, col) => {
                const inRange = col >= it.s && col <= it.e
                if (!inRange) return <div key={col} className="h-7" />
                return (
                  <div
                    key={col}
                    className={cn(
                      'h-7 transition-all flex items-center px-2',
                      it.status === 'pending'     && 'bg-amber-500/70',
                      it.status === 'in_progress' && 'bg-blue-500/70',
                      it.status === 'ready'       && 'bg-emerald-500/70',
                      col === it.s && 'rounded-l-lg',
                      col === it.e && 'rounded-r-lg',
                      'group-hover:brightness-110',
                    )}
                  >
                    {col === it.s && (
                      <span className="text-[10px] font-medium text-white truncate">
                        {it.user_first_name} {it.user_last_name?.[0] || ''}
                      </span>
                    )}
                  </div>
                )
              })}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Live activity feed item ───────────────────────────────────
function ActivityRow({ log }) {
  const isTake = log.action === 'take'
  const isDeposit = log.action === 'deposit'
  return (
    <div className="flex items-start gap-2.5 py-2">
      <div className={cn(
        'h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
        isTake && 'bg-amber-500/12 text-amber-600',
        isDeposit && 'bg-emerald-500/12 text-emerald-600',
        !isTake && !isDeposit && 'bg-muted text-muted-foreground',
      )}>
        <ScanLine className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs truncate">
          <span className="font-medium">{log.product_name || log.qr_code || 'QR scan'}</span>
          {log.user_name && <span className="text-muted-foreground"> · {log.user_name}</span>}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {isTake ? 'Pris' : isDeposit ? 'Rendu' : log.action} · {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: fr })}
        </p>
      </div>
    </div>
  )
}

// ── Quick action tile ─────────────────────────────────────────
function QuickAction({ icon: Icon, label, hint, to, gradient }) {
  return (
    <Link
      to={to}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border/40 p-4',
        'bg-card/60 hover:bg-card/90 transition-all',
        'hover:border-border/70 hover:shadow-md',
      )}
    >
      <div className={cn(
        'absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-30 blur-2xl transition-opacity group-hover:opacity-50',
        gradient,
      )} />
      <Icon className="h-5 w-5 text-foreground/80 mb-3" />
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────
//                          PAGE
// ─────────────────────────────────────────────────────────────
export function AdminDashboardPage() {
  const { profile } = useAuth()
  const greeting = useGreeting()

  const { data: loanReqs = [], isLoading: loadingRequests } = useLoanRequests()
  const { data: itReqs = [] } = useItRequests()
  const { data: mailboxReqs = [] } = useMailboxRequests()
  const { data: products = [], isLoading: loadingProducts } = useProducts()
  const { data: qrCodes = [] } = useQRCodes()
  const { data: overdueScans = [] } = useOverdueScans()
  const { data: upcomingReturns = [] } = useUpcomingReturns()
  const { data: recentScans = [] } = useScanLogs({ limit: 12 })

  useEffect(() => { checkAndSendReturnReminders() }, [])

  // Normalize all request streams into one shape
  const requests = useMemo(() => {
    const out = []
    for (const r of loanReqs) out.push({ ...r, _link: `/admin/requests/${r.id}` })
    for (const r of itReqs) {
      const data = r.data || {}
      out.push({
        ...r,
        _link: r.type === 'onboarding' ? '/admin/onboarding/requests'
             : r.type === 'offboarding' ? '/admin/offboarding-requests'
             : '/admin/it-requests',
        project_name: data.name || data.employee_name || data.event_name || r.requester_name || `${r.type || 'IT'} request`,
        user_first_name: r.requester_name?.split(' ')[0] || '',
        user_last_name: r.requester_name?.split(' ').slice(1).join(' ') || '',
      })
    }
    for (const r of mailboxReqs) {
      out.push({
        ...r,
        _link: '/admin/mailbox-requests',
        project_name: r.email_to_create || r.project_name || 'Mailbox request',
        user_first_name: r.requested_by_name?.split(' ')[0] || '',
        user_last_name: r.requested_by_name?.split(' ').slice(1).join(' ') || '',
      })
    }
    return out
  }, [loanReqs, itReqs, mailboxReqs])

  const stats = useMemo(() => {
    const total = qrCodes.length
    const available = qrCodes.filter((q) => q.status === 'available').length
    const onLoan = qrCodes.filter((q) => q.status === 'assigned' || q.status === 'reserved').length
    const broken = qrCodes.filter((q) => q.status === 'damaged' || q.status === 'lost').length
    return { total, available, onLoan, broken }
  }, [qrCodes])

  const counts = useMemo(() => ({
    pendingEquipment: loanReqs.filter((r) => r.status === 'pending').length,
    pendingOnboarding: itReqs.filter((r) => r.type === 'onboarding' && r.status === 'pending').length,
    pendingOffboarding: itReqs.filter((r) => r.type === 'offboarding' && r.status === 'pending').length,
    pendingMailbox: mailboxReqs.filter((r) => r.status === 'pending').length,
    ready: loanReqs.filter((r) => r.status === 'ready').length,
    inProgress: loanReqs.filter((r) => r.status === 'in_progress').length,
    overdue: overdueScans.length,
    upcoming: upcomingReturns.length,
    lowStock: products.filter((p) => p.total_stock <= 1).length,
  }), [loanReqs, itReqs, mailboxReqs, overdueScans, upcomingReturns, products])

  // Build a 7-day sparkline of created requests
  const requestSparkline = useMemo(() => {
    const today = startOfDay(new Date())
    const buckets = Array(7).fill(0)
    requests.forEach((r) => {
      const d = startOfDay(new Date(r.created_at))
      const idx = 6 - differenceInDays(today, d)
      if (idx >= 0 && idx < 7) buckets[idx]++
    })
    return buckets
  }, [requests])

  // Fleet breakdown by category
  const categoryBreakdown = useMemo(() => {
    const map = new Map()
    qrCodes.forEach((q) => {
      const cat = q.category_name || q.product?.category?.name || '—'
      if (!map.has(cat)) map.set(cat, { total: 0, available: 0 })
      const e = map.get(cat)
      e.total++
      if (q.status === 'available') e.available++
    })
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total)
  }, [qrCodes])

  if (loadingRequests || loadingProducts) return <PageLoading />

  const firstName = profile?.first_name || 'admin'
  const totalPending = counts.pendingEquipment + counts.pendingOnboarding + counts.pendingOffboarding + counts.pendingMailbox
  const hasAttention = totalPending + counts.overdue + counts.lowStock > 0

  const today = new Date()

  return (
    <div className="relative pb-12">
      {/* ── Background mesh gradient ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl opacity-60" />
        <div className="absolute top-40 -right-20 h-80 w-80 rounded-full bg-accent/15 blur-3xl opacity-50" />
        <div className="absolute top-[40rem] left-1/3 h-72 w-72 rounded-full bg-emerald-400/12 blur-3xl opacity-40" />
      </div>

      {/* ── Hero ── */}
      <motion.div {...fadeUp(0)} className="pt-6 pb-8">
        <div className="flex items-center gap-2 mb-3">
          <LivePulse />
          <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Live · {format(today, "EEEE d MMM · HH'h'mm", { locale: fr })}
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight">
          {greeting}, <span className="bg-gradient-to-r from-primary via-accent to-primary/70 bg-clip-text text-transparent">{firstName}</span>.
        </h1>
        <p className="text-base text-muted-foreground mt-3 max-w-2xl leading-relaxed">
          {hasAttention ? (
            <>
              <span className="font-medium text-foreground">{totalPending} demande{totalPending > 1 ? 's' : ''} en attente</span>
              {counts.overdue > 0 && <>, <span className="text-rose-500 font-medium">{counts.overdue} retour{counts.overdue > 1 ? 's' : ''} en retard</span></>}
              {counts.lowStock > 0 && <>, <span className="text-amber-500 font-medium">{counts.lowStock} produit{counts.lowStock > 1 ? 's' : ''} en stock bas</span></>}
              {' '}— la flotte est à {stats.total > 0 ? Math.round((stats.available / stats.total) * 100) : 100}% disponible.
            </>
          ) : (
            <>Tout est sous contrôle. <span className="font-medium text-foreground">{stats.available} unités</span> disponibles sur {stats.total}, aucun retard, aucun stock critique.</>
          )}
        </p>
      </motion.div>

      {/* ── Bento grid ── */}
      <div className="grid grid-cols-12 gap-5">

        {/* ─ Fleet pulse (big tile) ─ */}
        <motion.div {...fadeUp(0.05)} className="col-span-12 lg:col-span-7">
          <div className="rounded-3xl border border-border/40 bg-card/70 backdrop-blur-xl p-6 h-full">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Fleet pulse</span>
                </div>
                <h2 className="text-xl font-display font-bold tracking-tight">État de la flotte</h2>
              </div>
              <Link to="/admin/qr-codes" className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
                QR codes <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-center">
              <div className="flex justify-center">
                <FleetRing
                  available={stats.available}
                  onLoan={stats.onLoan}
                  broken={stats.broken}
                  total={stats.total}
                />
              </div>

              <div className="space-y-2.5 min-w-0">
                {[
                  { label: 'Available', value: stats.available, dot: 'bg-emerald-500' },
                  { label: 'On loan',   value: stats.onLoan,    dot: 'bg-amber-500' },
                  { label: 'Broken / lost', value: stats.broken, dot: 'bg-rose-500' },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-2">
                    <span className={cn('h-2 w-2 rounded-full', s.dot)} />
                    <span className="text-xs text-muted-foreground flex-1">{s.label}</span>
                    <span className="text-sm font-display font-semibold tabular-nums">{s.value}</span>
                  </div>
                ))}

                <div className="h-px bg-border/40 my-3" />

                <div className="space-y-1.5 max-h-32 overflow-auto">
                  {categoryBreakdown.slice(0, 5).map((c) => (
                    <div key={c.name} className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground/80 w-24 truncate">{c.name}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                          style={{ width: `${c.total > 0 ? (c.available / c.total) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-[11px] tabular-nums text-muted-foreground/80 w-12 text-right">
                        {c.available}/{c.total}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─ Needs attention (right column) ─ */}
        <motion.div {...fadeUp(0.1)} className="col-span-12 lg:col-span-5">
          <div className="rounded-3xl border border-border/40 bg-card/70 backdrop-blur-xl p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ton attention</span>
              </div>
              <span className="text-[11px] text-muted-foreground">{totalPending + counts.overdue + counts.lowStock} action{(totalPending + counts.overdue + counts.lowStock) > 1 ? 's' : ''}</span>
            </div>

            <div className="space-y-2">
              {!hasAttention && (
                <div className="py-10 text-center">
                  <div className="h-14 w-14 mx-auto rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-3">
                    <PackageCheck className="h-6 w-6 text-emerald-500" />
                  </div>
                  <p className="text-sm font-medium">Inbox zero.</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Rien ne demande ton attention.</p>
                </div>
              )}
              <AttentionRow
                icon={Inbox}
                color="bg-amber-500/12 text-amber-600"
                glow="hover:shadow-[0_0_0_1px_rgba(245,158,11,0.2)]"
                label="Demandes d'équipement"
                count={counts.pendingEquipment}
                to="/admin/requests"
              />
              <AttentionRow
                icon={UserPlus}
                color="bg-blue-500/12 text-blue-600"
                glow="hover:shadow-[0_0_0_1px_rgba(59,130,246,0.2)]"
                label="Onboarding à traiter"
                count={counts.pendingOnboarding}
                to="/admin/onboarding/requests"
              />
              <AttentionRow
                icon={Mail}
                color="bg-violet-500/12 text-violet-600"
                glow="hover:shadow-[0_0_0_1px_rgba(139,92,246,0.2)]"
                label="Demandes de mailbox"
                count={counts.pendingMailbox}
                to="/admin/mailbox-requests"
              />
              <AttentionRow
                icon={AlertTriangle}
                color="bg-rose-500/12 text-rose-600"
                glow="hover:shadow-[0_0_0_1px_rgba(244,63,94,0.25)]"
                label="Retours en retard"
                count={counts.overdue}
                to="/admin/scan-logs"
              />
              <AttentionRow
                icon={TrendingDown}
                color="bg-amber-500/12 text-amber-600"
                glow=""
                label="Produits en stock bas"
                count={counts.lowStock}
                to="/admin/products"
              />
            </div>
          </div>
        </motion.div>

        {/* ─ Week ahead (mid-row, wide) ─ */}
        <motion.div {...fadeUp(0.15)} className="col-span-12 lg:col-span-8">
          <div className="rounded-3xl border border-border/40 bg-card/70 backdrop-blur-xl p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CalendarRange className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cette semaine</span>
                </div>
                <h2 className="text-base font-display font-semibold">Qui a quoi, jusqu'à quand</h2>
              </div>
              <Link to="/admin/planning" className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
                Planning <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <WeekStrip requests={requests} />
          </div>
        </motion.div>

        {/* ─ Trend tile (sparkline + key numbers) ─ */}
        <motion.div {...fadeUp(0.2)} className="col-span-12 lg:col-span-4">
          <div className="rounded-3xl border border-border/40 bg-card/70 backdrop-blur-xl p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">7 derniers jours</span>
              </div>
              <div className="text-emerald-500">
                <Sparkline values={requestSparkline} />
              </div>
            </div>
            <div className="space-y-4 flex-1 flex flex-col justify-center">
              <div>
                <p className="text-4xl font-display font-bold tabular-nums">{requestSparkline.reduce((a, b) => a + b, 0)}</p>
                <p className="text-xs text-muted-foreground">demandes créées</p>
              </div>
              <div className="h-px bg-border/40" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-2xl font-display font-bold tabular-nums">{counts.ready}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Ready</p>
                </div>
                <div>
                  <p className="text-2xl font-display font-bold tabular-nums">{counts.inProgress}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">In progress</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─ Live activity ─ */}
        <motion.div {...fadeUp(0.25)} className="col-span-12 lg:col-span-5">
          <div className="rounded-3xl border border-border/40 bg-card/70 backdrop-blur-xl p-6 h-[360px] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <LivePulse />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Activité en direct</span>
              </div>
              <Link to="/admin/scan-logs" className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
                Tous les scans <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="flex-1 overflow-auto divide-y divide-border/20">
              {recentScans.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/60">
                  <Clock className="h-7 w-7 mb-2 opacity-40" />
                  <p className="text-xs">Aucun scan récent</p>
                </div>
              ) : (
                recentScans.slice(0, 10).map((log) => <ActivityRow key={log.id} log={log} />)
              )}
            </div>
          </div>
        </motion.div>

        {/* ─ Upcoming returns ─ */}
        <motion.div {...fadeUp(0.3)} className="col-span-12 lg:col-span-7">
          <div className="rounded-3xl border border-border/40 bg-card/70 backdrop-blur-xl p-6 h-[360px] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <PackageCheck className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Retours à venir</span>
              </div>
              <span className="text-[11px] text-muted-foreground">{upcomingReturns.length} prévu{upcomingReturns.length > 1 ? 's' : ''}</span>
            </div>
            <div className="flex-1 overflow-auto space-y-1.5">
              {upcomingReturns.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/60">
                  <Box className="h-7 w-7 mb-2 opacity-40" />
                  <p className="text-xs">Aucun retour planifié</p>
                </div>
              ) : (
                upcomingReturns.slice(0, 6).map((r) => (
                  <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/30 transition-colors">
                    <UserAvatar firstName={r.user_name?.split(' ')[0]} lastName={r.user_name?.split(' ')[1]} email={r.user_email} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.product_name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{r.user_name || r.user_email}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium">{r.expected_return_date ? format(new Date(r.expected_return_date), 'd MMM', { locale: fr }) : '—'}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {r.expected_return_date ? formatDistanceToNow(new Date(r.expected_return_date), { addSuffix: true, locale: fr }) : ''}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>

        {/* ─ Quick actions ─ */}
        <motion.div {...fadeUp(0.35)} className="col-span-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickAction
              icon={ScanLine}
              label="Scanner un QR"
              hint="Assigner / restituer"
              to="/scan"
              gradient="bg-primary"
            />
            <QuickAction
              icon={QrCode}
              label="QR codes"
              hint="Tous les codes & étiquettes"
              to="/admin/qr-codes"
              gradient="bg-emerald-500"
            />
            <QuickAction
              icon={Box}
              label="Produits"
              hint="Stock & catégories"
              to="/admin/products"
              gradient="bg-amber-500"
            />
            <QuickAction
              icon={CalendarRange}
              label="Planning complet"
              hint="Toutes les réservations"
              to="/admin/planning"
              gradient="bg-violet-500"
            />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
