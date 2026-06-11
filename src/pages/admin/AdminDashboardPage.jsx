import { useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { format, formatDistanceToNow, differenceInDays, differenceInHours } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAuth } from '@/lib/auth'
import { useLoanRequests } from '@/hooks/use-loan-requests'
import { useItRequests } from '@/hooks/use-it-requests'
import { useMailboxRequests } from '@/hooks/use-mailbox-requests'
import { useProducts } from '@/hooks/use-products'
import { useQRCodes, useOverdueScans, useActiveLoans, useScanLogs } from '@/hooks/use-qr-codes'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { checkAndSendReturnReminders } from '@/services/return-reminder-service'
import { UserAvatar } from '@/components/common/UserAvatar'
import {
  ArrowRight, AlertTriangle, QrCode, ScanLine,
  PackageCheck, Inbox, TrendingDown, Activity, Clock,
  UserPlus, Mail, Box, ChevronRight, Cpu, Radio,
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

// ── Bracketed label (futuristic data-vis feel) ────────────────
function TagLabel({ children, color = 'text-muted-foreground', className }) {
  return (
    <span className={cn('text-[10px] font-mono uppercase tracking-[0.18em]', color, className)}>
      [{children}]
    </span>
  )
}

// ── Live pulse dot ────────────────────────────────────────────
function LivePulse({ color = 'bg-emerald-500', ringColor = 'bg-emerald-400' }) {
  return (
    <span className="relative inline-flex h-2 w-2">
      <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping', ringColor)} />
      <span className={cn('relative inline-flex rounded-full h-2 w-2', color)} />
    </span>
  )
}

// ── Radial fleet ring (pure SVG, futuristic dual-ring) ────────
function FleetRing({ available, onLoan, broken, total }) {
  const size = 240
  const stroke = 14
  const radius = (size - stroke) / 2
  const radius2 = radius - stroke - 6
  const c = 2 * Math.PI * radius
  const c2 = 2 * Math.PI * radius2

  const segments = [
    { value: available, color: 'stroke-emerald-400' },
    { value: onLoan,    color: 'stroke-amber-400' },
    { value: broken,    color: 'stroke-rose-400' },
  ]

  let offset = 0
  const pct = total > 0 ? Math.round((available / total) * 100) : 0
  const innerPct = total > 0 ? (onLoan / total) * c2 : 0

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Outer ring */}
      <svg width={size} height={size} className="-rotate-90 absolute inset-0">
        <defs>
          <linearGradient id="ringBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgb(99 102 241 / 0.15)" />
            <stop offset="100%" stopColor="rgb(34 211 238 / 0.15)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="transparent" stroke="url(#ringBg)" strokeWidth={stroke} />
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
              strokeLinecap="butt"
              strokeDasharray={dasharray}
              strokeDashoffset={dashoffset}
              className={cn(seg.color, 'transition-all duration-700 drop-shadow-[0_0_6px_currentColor]')}
            />
          )
        })}
        {/* Inner ring — total used */}
        <circle cx={size / 2} cy={size / 2} r={radius2} fill="transparent" className="stroke-white/5" strokeWidth={2} />
        <circle
          cx={size / 2} cy={size / 2} r={radius2}
          fill="transparent"
          className="stroke-cyan-400/70 transition-all duration-700"
          strokeWidth={2}
          strokeDasharray={`${innerPct} ${c2 - innerPct}`}
        />
      </svg>

      {/* Tick marks */}
      <svg width={size} height={size} className="absolute inset-0 opacity-30">
        {Array.from({ length: 60 }).map((_, i) => {
          const angle = (i / 60) * 2 * Math.PI
          const inner = radius - stroke - 14
          const outer = radius - stroke - 10
          const x1 = size / 2 + Math.cos(angle) * inner
          const y1 = size / 2 + Math.sin(angle) * inner
          const x2 = size / 2 + Math.cos(angle) * outer
          const y2 = size / 2 + Math.sin(angle) * outer
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-muted-foreground" strokeWidth={i % 5 === 0 ? 1 : 0.5} />
        })}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <TagLabel color="text-emerald-400/80">UPTIME</TagLabel>
        <span className="text-6xl font-display font-bold tabular-nums leading-none mt-1 bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent">
          {pct}<span className="text-2xl text-muted-foreground">%</span>
        </span>
        <span className="text-[11px] font-mono text-muted-foreground/70 mt-1">{available}/{total} UNITS</span>
      </div>
    </div>
  )
}

// ── Sparkline (tiny SVG) ──────────────────────────────────────
function Sparkline({ values, className }) {
  if (!values || values.length === 0) return null
  const w = 100, h = 28
  const max = Math.max(...values, 1)
  const step = w / Math.max(values.length - 1, 1)
  const points = values.map((v, i) => `${i * step},${h - (v / max) * h}`).join(' ')
  const areaPoints = `0,${h} ${points} ${w},${h}`
  return (
    <svg width={w} height={h} className={cn('overflow-visible', className)}>
      <defs>
        <linearGradient id="sparkArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#sparkArea)" />
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v, i) => (
        <circle key={i} cx={i * step} cy={h - (v / max) * h} r="1.5" fill="currentColor" />
      ))}
    </svg>
  )
}

// ── Attention row ─────────────────────────────────────────────
function AttentionRow({ icon: Icon, color, accent, label, count, to }) {
  if (!count) return null
  return (
    <Link
      to={to}
      className={cn(
        'group relative flex items-center gap-3 px-3.5 py-3 rounded-xl border border-border/40 bg-card/40',
        'hover:bg-card/70 hover:border-border/70 transition-all overflow-hidden',
      )}
    >
      <span className={cn('absolute left-0 top-0 bottom-0 w-[2px]', accent)} />
      <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{label}</p>
      </div>
      <span className="font-mono text-lg font-bold tabular-nums">{String(count).padStart(2, '0')}</span>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
    </Link>
  )
}

// ── Material-in-use row (the real "what's out & until when") ──
function MaterialRow({ loan, now }) {
  const pickup = loan.pickup_date ? new Date(loan.pickup_date) : new Date(loan.created_at)
  const expected = loan.expected_return_date ? new Date(loan.expected_return_date + 'T18:00:00') : null
  const isOverdue = expected && expected < now
  const daysLeft = expected ? differenceInDays(expected, now) : null
  const hoursLeft = expected ? differenceInHours(expected, now) : null

  // Time elapsed bar
  let progress = 0
  if (expected) {
    const total = expected - pickup
    const elapsed = now - pickup
    progress = Math.max(0, Math.min(100, (elapsed / total) * 100))
  }

  const status = isOverdue ? 'overdue' : (daysLeft !== null && daysLeft <= 1 ? 'soon' : 'ok')
  const statusColor = {
    overdue: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    soon:    'text-amber-400 bg-amber-500/10 border-amber-500/30',
    ok:      'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  }[status]
  const barColor = {
    overdue: 'bg-gradient-to-r from-rose-500 to-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]',
    soon:    'bg-gradient-to-r from-amber-500 to-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
    ok:      'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]',
  }[status]

  const dueLabel = !expected ? '—'
    : isOverdue
      ? `${Math.abs(daysLeft)}j de retard`
      : daysLeft === 0
        ? `${hoursLeft}h restantes`
        : daysLeft === 1
          ? 'demain'
          : `${daysLeft}j restants`

  return (
    <div className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-card/50 transition-colors">
      <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary/15 to-accent/10 border border-border/30 flex items-center justify-center shrink-0">
        <Cpu className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{loan.product_name || 'Material'}</p>
          <span className="font-mono text-[10px] text-muted-foreground/70 truncate">{loan.qr_code}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <UserAvatar firstName={loan.user_name?.split(' ')[0]} lastName={loan.user_name?.split(' ')[1]} email={loan.user_email} size="xs" />
          <p className="text-[11px] text-muted-foreground truncate">{loan.user_name || loan.user_email || 'Unknown'}</p>
        </div>
        <div className="mt-1.5 h-[3px] rounded-full bg-muted/30 overflow-hidden">
          <div className={cn('h-full transition-all', barColor)} style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="text-right shrink-0 ml-2">
        <div className={cn('inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-mono font-medium', statusColor)}>
          {dueLabel}
        </div>
        <p className="text-[10px] text-muted-foreground/70 mt-1 font-mono">
          {expected ? format(expected, 'dd.MM') : '∞'}
        </p>
      </div>
    </div>
  )
}

// ── Live activity feed item ───────────────────────────────────
function ActivityRow({ log }) {
  const isTake = log.action === 'take'
  const isDeposit = log.action === 'deposit'
  return (
    <div className="flex items-start gap-2.5 py-2 px-1 group">
      <div className="relative shrink-0 mt-0.5">
        <div className={cn(
          'h-7 w-7 rounded-lg flex items-center justify-center border',
          isTake && 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          isDeposit && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          !isTake && !isDeposit && 'bg-muted text-muted-foreground border-border/30',
        )}>
          <ScanLine className="h-3.5 w-3.5" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs truncate">
          <span className="font-medium">{log.product_name || log.qr_code || 'QR scan'}</span>
          {log.user_name && <span className="text-muted-foreground"> · {log.user_name}</span>}
        </p>
        <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">
          {isTake ? '> PRIS' : isDeposit ? '< RENDU' : log.action} · {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: fr })}
        </p>
      </div>
    </div>
  )
}

// ── Quick action tile ─────────────────────────────────────────
function QuickAction({ icon: Icon, label, hint, to, accent }) {
  return (
    <Link
      to={to}
      className="group relative overflow-hidden rounded-2xl border border-border/40 p-4 bg-card/40 hover:bg-card/70 hover:border-border/70 transition-all"
    >
      <span className={cn('absolute left-0 top-0 bottom-0 w-[2px] transition-all group-hover:w-[3px]', accent)} />
      <Icon className="h-5 w-5 text-foreground/80 mb-3" />
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70 mt-0.5">{hint}</p>
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────
//                          PAGE
// ─────────────────────────────────────────────────────────────
export function AdminDashboardPage() {
  const { profile } = useAuth()
  const greeting = useGreeting()
  const now = new Date()

  const { data: loanReqs = [], isLoading: loadingRequests } = useLoanRequests()
  const { data: itReqs = [] } = useItRequests()
  const { data: mailboxReqs = [] } = useMailboxRequests()
  const { data: products = [], isLoading: loadingProducts } = useProducts()
  const { data: qrCodes = [] } = useQRCodes()
  const { data: overdueScans = [] } = useOverdueScans()
  const { data: activeLoans = [] } = useActiveLoans()
  const { data: recentScans = [] } = useScanLogs({ limit: 12 })

  useEffect(() => { checkAndSendReturnReminders() }, [])

  const requests = useMemo(() => {
    const out = []
    for (const r of loanReqs) out.push({ ...r, _link: `/admin/requests/${r.id}` })
    for (const r of itReqs) out.push({ ...r })
    for (const r of mailboxReqs) out.push({ ...r })
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
    pendingMailbox: mailboxReqs.filter((r) => r.status === 'pending').length,
    ready: loanReqs.filter((r) => r.status === 'ready').length,
    inProgress: loanReqs.filter((r) => r.status === 'in_progress').length,
    overdue: overdueScans.length,
    lowStock: products.filter((p) => p.total_stock <= 1).length,
  }), [loanReqs, itReqs, mailboxReqs, overdueScans, products])

  const requestSparkline = useMemo(() => {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const buckets = Array(7).fill(0)
    requests.forEach((r) => {
      const d = new Date(r.created_at); d.setHours(0, 0, 0, 0)
      const diff = Math.round((todayStart - d) / (1000 * 60 * 60 * 24))
      const idx = 6 - diff
      if (idx >= 0 && idx < 7) buckets[idx]++
    })
    return buckets
  }, [requests])

  const categoryBreakdown = useMemo(() => {
    const map = new Map()
    qrCodes.forEach((q) => {
      const cat = q.category_name || '—'
      if (!map.has(cat)) map.set(cat, { total: 0, available: 0 })
      const e = map.get(cat)
      e.total++
      if (q.status === 'available') e.available++
    })
    return Array.from(map.entries()).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.total - a.total)
  }, [qrCodes])

  // Sort active loans: overdue first, then by closest expected return date
  const sortedLoans = useMemo(() => {
    return [...activeLoans].sort((a, b) => {
      const da = a.expected_return_date ? new Date(a.expected_return_date) : new Date('2999-01-01')
      const db = b.expected_return_date ? new Date(b.expected_return_date) : new Date('2999-01-01')
      return da - db
    })
  }, [activeLoans])

  if (loadingRequests || loadingProducts) return <PageLoading />

  const firstName = profile?.first_name || 'admin'
  const totalPending = counts.pendingEquipment + counts.pendingOnboarding + counts.pendingMailbox
  const hasAttention = totalPending + counts.overdue + counts.lowStock > 0

  return (
    <div className="relative pb-12">
      {/* ── Futuristic background: grid + mesh ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />
        <div className="absolute -top-32 -left-32 h-[28rem] w-[28rem] rounded-full bg-primary/15 blur-[100px]" />
        <div className="absolute top-32 -right-20 h-[22rem] w-[22rem] rounded-full bg-cyan-500/10 blur-[100px]" />
        <div className="absolute top-[42rem] left-1/3 h-72 w-72 rounded-full bg-violet-500/10 blur-[100px]" />
      </div>

      {/* ── Hero ── */}
      <motion.div {...fadeUp(0)} className="pt-6 pb-8">
        <div className="flex items-center gap-3 mb-3">
          <LivePulse />
          <TagLabel color="text-emerald-400/90">SYSTEM // LIVE</TagLabel>
          <span className="text-[11px] font-mono text-muted-foreground/60">
            {format(now, "yyyy.MM.dd · HH:mm")}
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight">
          {greeting},{' '}
          <span className="bg-gradient-to-r from-primary via-cyan-400 to-violet-400 bg-clip-text text-transparent">
            {firstName}
          </span>
          .
        </h1>
        <p className="text-base text-muted-foreground mt-3 max-w-2xl leading-relaxed">
          {hasAttention ? (
            <>
              <span className="font-medium text-foreground">{totalPending} demande{totalPending > 1 ? 's' : ''} en attente</span>
              {counts.overdue > 0 && <>, <span className="text-rose-400 font-medium">{counts.overdue} retour{counts.overdue > 1 ? 's' : ''} en retard</span></>}
              {counts.lowStock > 0 && <>, <span className="text-amber-400 font-medium">{counts.lowStock} stock bas</span></>}
              {' '}— flotte à <span className="font-mono">{stats.total > 0 ? Math.round((stats.available / stats.total) * 100) : 100}%</span> disponible.
            </>
          ) : (
            <>Tout est sous contrôle. <span className="font-medium text-foreground">{stats.available}/{stats.total}</span> unités disponibles, zéro retard.</>
          )}
        </p>
      </motion.div>

      {/* ── Bento grid ── */}
      <div className="grid grid-cols-12 gap-5">

        {/* ─ Fleet pulse (big) ─ */}
        <motion.div {...fadeUp(0.05)} className="col-span-12 lg:col-span-7">
          <div className="relative rounded-3xl border border-border/40 bg-card/40 backdrop-blur-xl p-6 h-full overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
            <div className="flex items-start justify-between mb-4">
              <div>
                <TagLabel color="text-cyan-400/80">FLEET // 001</TagLabel>
                <h2 className="text-xl font-display font-bold tracking-tight mt-1">État de la flotte</h2>
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
                  { label: 'Available',    value: stats.available, dot: 'bg-emerald-400', shadow: 'shadow-[0_0_6px_rgba(16,185,129,0.6)]' },
                  { label: 'On loan',      value: stats.onLoan,    dot: 'bg-amber-400',   shadow: 'shadow-[0_0_6px_rgba(245,158,11,0.6)]' },
                  { label: 'Broken / lost', value: stats.broken,   dot: 'bg-rose-400',    shadow: 'shadow-[0_0_6px_rgba(244,63,94,0.6)]' },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-2">
                    <span className={cn('h-2 w-2 rounded-full', s.dot, s.shadow)} />
                    <span className="text-xs text-muted-foreground flex-1 font-mono uppercase tracking-wider">{s.label}</span>
                    <span className="text-sm font-display font-semibold tabular-nums">{s.value}</span>
                  </div>
                ))}

                <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent my-3" />

                <div className="space-y-1.5 max-h-32 overflow-auto">
                  {categoryBreakdown.slice(0, 5).map((c) => (
                    <div key={c.name} className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground/80 w-24 truncate font-mono uppercase">{c.name}</span>
                      <div className="flex-1 h-1 rounded-full bg-muted/30 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full transition-all shadow-[0_0_4px_rgba(34,211,238,0.6)]"
                          style={{ width: `${c.total > 0 ? (c.available / c.total) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-[10px] tabular-nums text-muted-foreground/80 w-12 text-right font-mono">
                        {c.available}/{c.total}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─ Needs attention ─ */}
        <motion.div {...fadeUp(0.1)} className="col-span-12 lg:col-span-5">
          <div className="relative rounded-3xl border border-border/40 bg-card/40 backdrop-blur-xl p-6 h-full overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <LivePulse color="bg-amber-500" ringColor="bg-amber-400" />
                <TagLabel color="text-amber-400/90">QUEUE // ATTN</TagLabel>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">
                {String(totalPending + counts.overdue + counts.lowStock).padStart(2, '0')} actions
              </span>
            </div>

            <div className="space-y-2">
              {!hasAttention && (
                <div className="py-10 text-center">
                  <div className="h-14 w-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                    <PackageCheck className="h-6 w-6 text-emerald-400" />
                  </div>
                  <p className="text-sm font-medium">Inbox zero.</p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono">{'// ALL SYSTEMS NOMINAL'}</p>
                </div>
              )}
              <AttentionRow icon={Inbox}            color="bg-amber-500/12 text-amber-400" accent="bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]"  label="Demandes d'équipement"  count={counts.pendingEquipment}  to="/admin/requests" />
              <AttentionRow icon={UserPlus}         color="bg-blue-500/12 text-blue-400"   accent="bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.6)]"  label="Onboarding à traiter"   count={counts.pendingOnboarding} to="/admin/onboarding/requests" />
              <AttentionRow icon={Mail}             color="bg-violet-500/12 text-violet-400" accent="bg-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.6)]" label="Demandes de mailbox"   count={counts.pendingMailbox}    to="/admin/mailbox-requests" />
              <AttentionRow icon={AlertTriangle}    color="bg-rose-500/12 text-rose-400"   accent="bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.7)]"   label="Retours en retard"      count={counts.overdue}           to="/admin/scan-logs" />
              <AttentionRow icon={TrendingDown}     color="bg-amber-500/12 text-amber-400" accent="bg-amber-400"  label="Produits en stock bas"  count={counts.lowStock}          to="/admin/products" />
            </div>
          </div>
        </motion.div>

        {/* ─ Materials in use (replaces "Cette semaine") ─ */}
        <motion.div {...fadeUp(0.15)} className="col-span-12 lg:col-span-8">
          <div className="relative rounded-3xl border border-border/40 bg-card/40 backdrop-blur-xl p-6 h-full overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Radio className="h-3.5 w-3.5 text-primary" />
                  <TagLabel color="text-primary/90">MATÉRIEL // EN COURS</TagLabel>
                </div>
                <h2 className="text-base font-display font-semibold mt-1">
                  Qui détient quoi, jusqu'à quand
                  <span className="ml-2 font-mono text-xs text-muted-foreground">[{sortedLoans.length}]</span>
                </h2>
              </div>
              <Link to="/admin/qr-codes" className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
                Tous les QR <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="max-h-[420px] overflow-auto space-y-1 -mx-1">
              {sortedLoans.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-muted-foreground/60">
                  <PackageCheck className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-xs">Aucun matériel en circulation</p>
                  <p className="text-[10px] font-mono mt-1 opacity-70">{'// FLEET AT REST'}</p>
                </div>
              ) : (
                sortedLoans.slice(0, 12).map((loan) => (
                  <MaterialRow key={loan.id} loan={loan} now={now} />
                ))
              )}
            </div>
          </div>
        </motion.div>

        {/* ─ 7-day trend ─ */}
        <motion.div {...fadeUp(0.2)} className="col-span-12 lg:col-span-4">
          <div className="relative rounded-3xl border border-border/40 bg-card/40 backdrop-blur-xl p-6 h-full flex flex-col overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-violet-400/60 to-transparent" />
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-violet-400" />
                <TagLabel color="text-violet-400/90">7D // TREND</TagLabel>
              </div>
              <div className="text-violet-400">
                <Sparkline values={requestSparkline} />
              </div>
            </div>
            <div className="space-y-4 flex-1 flex flex-col justify-center">
              <div>
                <p className="text-5xl font-display font-bold tabular-nums bg-gradient-to-b from-foreground to-foreground/50 bg-clip-text text-transparent">
                  {requestSparkline.reduce((a, b) => a + b, 0)}
                </p>
                <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/70 mt-1">demandes / 7 jours</p>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-2xl font-display font-bold tabular-nums text-emerald-400">{counts.ready}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-mono">Ready</p>
                </div>
                <div>
                  <p className="text-2xl font-display font-bold tabular-nums text-blue-400">{counts.inProgress}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-mono">In progress</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─ Live activity ─ */}
        <motion.div {...fadeUp(0.25)} className="col-span-12 lg:col-span-5">
          <div className="relative rounded-3xl border border-border/40 bg-card/40 backdrop-blur-xl p-6 h-[360px] flex flex-col overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <LivePulse />
                <TagLabel color="text-emerald-400/90">FEED // LIVE</TagLabel>
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
                  <p className="text-[10px] font-mono mt-1 opacity-70">{'// AWAITING SIGNAL'}</p>
                </div>
              ) : (
                recentScans.slice(0, 10).map((log) => <ActivityRow key={log.id} log={log} />)
              )}
            </div>
          </div>
        </motion.div>

        {/* ─ Quick actions ─ */}
        <motion.div {...fadeUp(0.3)} className="col-span-12 lg:col-span-7">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 h-full">
            <QuickAction icon={ScanLine} label="Scanner un QR" hint="// scan" to="/scan"          accent="bg-primary shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
            <QuickAction icon={QrCode}   label="QR codes"      hint="// fleet" to="/admin/qr-codes"   accent="bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            <QuickAction icon={Box}      label="Produits"      hint="// stock" to="/admin/products"   accent="bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
            <QuickAction icon={Cpu}      label="Credentials"   hint="// secure" to="/admin/device-credentials" accent="bg-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
