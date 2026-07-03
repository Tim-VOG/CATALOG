import { useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
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
import { runDailyMaintenance } from '@/services/daily-maintenance'
import {
  ArrowRight, AlertTriangle, ScanLine, PackageCheck,
  Inbox, TrendingDown, Clock, UserPlus, Mail, Box, ChevronRight,
  FileSpreadsheet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { exportInventoryWorkbook } from '@/lib/excel-export'
import { useCategories } from '@/hooks/use-categories'
import { useSharedMailboxes } from '@/hooks/use-shared-mailboxes'
import { useDeviceCredentials } from '@/hooks/use-device-credentials'
import { Button } from '@/components/ui/button'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay, ease: [0.22, 0.61, 0.36, 1] as any },
})

function greetingKey() {
  const h = new Date().getHours()
  if (h < 5)  return 'hub.greetingNight'
  if (h < 12) return 'hub.greetingMorning'
  if (h < 18) return 'hub.greetingAfternoon'
  return 'hub.greetingEvening'
}

// ── Card primitive (clean, simple) ────────────────────────────
function Card({ className, children  }: any) {
  return (
    <div className={cn('rounded-2xl border border-border/50 bg-card', className)}>
      {children}
    </div>
  )
}

function CardHeader({ title, action  }: any) {
  return (
    <div className="flex items-center justify-between px-5 pt-5 pb-3">
      <h2 className="text-sm font-medium text-foreground">{title}</h2>
      {action}
    </div>
  )
}

// ── Stat block ────────────────────────────────────────────────
function Stat({ label, value, trend, to, accent  }: any) {
  const content = (
    <div className="px-5 py-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-display font-semibold tabular-nums tracking-tight">{value}</p>
      {trend !== undefined && (
        <p className={cn(
          'mt-1 text-xs',
          accent === 'rose' && 'text-rose-500',
          accent === 'amber' && 'text-amber-500',
          accent === 'emerald' && 'text-emerald-500',
          !accent && 'text-muted-foreground',
        )}>
          {trend}
        </p>
      )}
    </div>
  )
  if (!to) return <Card>{content}</Card>
  return (
    <Link to={to} className="block">
      <Card className="hover:border-border transition-colors">{content}</Card>
    </Link>
  )
}

// ── Attention row ─────────────────────────────────────────────
function AttentionRow({ icon: Icon, label, count, to  }: any) {
  if (!count) return null
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 px-3 py-2.5 -mx-1 rounded-lg hover:bg-muted/40 transition-colors"
    >
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="flex-1 text-sm truncate">{label}</span>
      <span className="text-sm font-medium tabular-nums text-foreground">{count}</span>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:translate-x-0.5 transition-transform" />
    </Link>
  )
}

// ── Material in use row ───────────────────────────────────────
function MaterialRow({ loan, now  }: any) {
  const { t } = useTranslation()
  const pickup = loan.pickup_date ? new Date(loan.pickup_date) : new Date(loan.created_at)
  const expected = loan.expected_return_date ? new Date(loan.expected_return_date + 'T18:00:00') : null
  const isOverdue = expected && expected < now
  const daysLeft = expected ? differenceInDays(expected, now) : null
  const hoursLeft = expected ? differenceInHours(expected, now) : null

  let progress = 0
  if (expected) {
    const total = expected.getTime() - pickup.getTime()
    const elapsed = now.getTime() - pickup.getTime()
    progress = Math.max(0, Math.min(100, (elapsed / total) * 100))
  }

  const status = isOverdue ? 'overdue' : (daysLeft !== null && daysLeft <= 1 ? 'soon' : 'ok')
  const barColor = {
    overdue: 'bg-rose-500',
    soon:    'bg-amber-500',
    ok:      'bg-emerald-500',
  }[status]
  const dueText = !expected ? '—'
    : isOverdue
      ? t('admin.dashboard.daysLate', { count: Math.abs(daysLeft!) })
      : daysLeft === 0
        ? t('admin.dashboard.hoursLeft', { count: hoursLeft })
        : daysLeft === 1
          ? t('admin.dashboard.tomorrow')
          : t('admin.dashboard.daysLeft', { count: daysLeft })
  const dueColor = {
    overdue: 'text-rose-500',
    soon:    'text-amber-500',
    ok:      'text-muted-foreground',
  }[status]

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{loan.product_name || 'Material'}</p>
          <span className="text-[11px] text-muted-foreground/70 truncate">{loan.qr_code}</span>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{loan.user_name || loan.user_email || 'Unknown'}</p>
        <div className="mt-2 h-1 rounded-full bg-muted/40 overflow-hidden">
          <div className={cn('h-full transition-all rounded-full', barColor)} style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className={cn('text-sm font-medium', dueColor)}>{dueText}</p>
        <p className="text-[10px] text-muted-foreground/70 mt-0.5">
          {expected ? format(expected, 'd MMM', { locale: fr }) : '∞'}
        </p>
      </div>
    </div>
  )
}

// ── Activity feed row ─────────────────────────────────────────
function ActivityRow({ log  }: any) {
  const { t } = useTranslation()
  const isTake = log.action === 'take'
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0">
      <div className={cn(
        'h-7 w-7 rounded-md flex items-center justify-center shrink-0',
        isTake ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600',
      )}>
        <ScanLine className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">
          <span className="font-medium">{log.product_name || log.qr_code || 'QR scan'}</span>
          {log.user_name && <span className="text-muted-foreground"> · {log.user_name}</span>}
        </p>
        <p className="text-xs text-muted-foreground/80 mt-0.5">
          {isTake ? t('admin.dashboard.actionTaken') : t('admin.dashboard.actionReturned')} · {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: fr })}
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//                          PAGE
// ─────────────────────────────────────────────────────────────
export function AdminDashboardPage() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const greeting = t(greetingKey())
  const now = new Date()

  const { data: loanReqs = [], isLoading: loadingRequests } = useLoanRequests()
  const { data: itReqs = [] } = useItRequests()
  const { data: mailboxReqs = [] } = useMailboxRequests()
  const { data: products = [], isLoading: loadingProducts } = useProducts()
  const { data: qrCodes = [] } = useQRCodes()
  const { data: overdueScans = [] } = useOverdueScans()
  const { data: activeLoans = [] } = useActiveLoans()
  const { data: recentScans = [] } = useScanLogs({ limit: 12 })
  const { data: categories = [] } = useCategories()
  const { data: sharedMailboxes = [] } = useSharedMailboxes()
  const { data: deviceCredentials = [] } = useDeviceCredentials()

  // Return reminders now run server-side (daily-reminders edge function /
  // cron) so they fire reliably even if no admin opens the dashboard.
  useEffect(() => { runDailyMaintenance() }, [])

  const handleExportExcel = () => {
    exportInventoryWorkbook({
      products,
      categories,
      qrCodes,
      deviceCredentials,
      activeLoans,
      scanLogs: recentScans,
      sharedMailboxes,
      equipmentRequests: loanReqs,
      itRequests: itReqs,
      mailboxRequests: mailboxReqs,
    }, `vo-hub-export-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const stats = useMemo(() => {
    const total = qrCodes.length
    const available = qrCodes.filter((q: any) => q.status === 'available').length
    const onLoan = qrCodes.filter((q: any) => q.status === 'assigned' || q.status === 'reserved').length
    const broken = qrCodes.filter((q: any) => q.status === 'damaged' || q.status === 'lost').length
    return { total, available, onLoan, broken }
  }, [qrCodes])

  const counts = useMemo(() => ({
    pendingEquipment: loanReqs.filter((r: any) => r.status === 'pending').length,
    pendingOnboarding: itReqs.filter((r: any) => r.type === 'onboarding' && r.status === 'pending').length,
    pendingMailbox: mailboxReqs.filter((r: any) => r.status === 'pending').length,
    overdue: overdueScans.length,
    lowStock: products.filter((p: any) => p.total_stock <= 1).length,
  }), [loanReqs, itReqs, mailboxReqs, overdueScans, products])

  const sortedLoans = useMemo(() => {
    return [...activeLoans].sort((a: any, b: any) => {
      const da = a.expected_return_date ? new Date(a.expected_return_date) : new Date('2999-01-01')
      const db = b.expected_return_date ? new Date(b.expected_return_date) : new Date('2999-01-01')
      return da.getTime() - db.getTime()
    })
  }, [activeLoans])

  const categoryBreakdown = useMemo(() => {
    const map = new Map()
    qrCodes.forEach((q: any) => {
      const cat = q.category_name || '—'
      if (!map.has(cat)) map.set(cat, { total: 0, available: 0 })
      const e = map.get(cat)
      e.total++
      if (q.status === 'available') e.available++
    })
    return Array.from(map.entries()).map(([name, v]) => ({ name, ...v })).sort((a: any, b: any) => b.total - a.total)
  }, [qrCodes])

  if (loadingRequests || loadingProducts) return <PageLoading />

  const firstName = profile?.first_name || 'admin'
  const totalAttention =
    counts.pendingEquipment + counts.pendingOnboarding + counts.pendingMailbox +
    counts.overdue + counts.lowStock

  return (
    <div className="pb-12">
      {/* ── Header ── */}
      <motion.div {...fadeUp(0)} className="pt-10 pb-10 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground/80 mb-2">
            {format(now, "EEEE d MMMM", { locale: fr })}
          </p>
          <h1 className="text-3xl font-display font-semibold tracking-tight">
            {greeting}, {firstName}.
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            {totalAttention === 0
              ? t('admin.dashboard.allGood', { available: stats.available, total: stats.total })
              : t('admin.dashboard.attention', { count: totalAttention })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-2 shrink-0">
          <FileSpreadsheet className="h-3.5 w-3.5" />
          {t('admin.dashboard.exportExcel')}
        </Button>
      </motion.div>

      {/* ── Stat row ── */}
      <motion.div {...fadeUp(0.05)} className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Stat label={t('admin.dashboard.statAvailable')} value={stats.available} trend={t('admin.dashboard.statAvailableTrend', { total: stats.total })} to="/admin/qr-codes" />
        <Stat label={t('admin.dashboard.statOnLoan')} value={stats.onLoan} trend={t('admin.dashboard.statOnLoanTrend', { count: sortedLoans.length })} to="/admin/qr-codes" />
        <Stat label={t('admin.dashboard.statPending')} value={counts.pendingEquipment + counts.pendingOnboarding + counts.pendingMailbox} trend={counts.pendingEquipment > 0 ? t('admin.dashboard.statPendingTrend', { count: counts.pendingEquipment }) : t('admin.dashboard.statPendingUpToDate')} to="/admin/requests" accent={counts.pendingEquipment + counts.pendingOnboarding + counts.pendingMailbox > 0 ? 'amber' : undefined} />
        <Stat label={t('admin.dashboard.statOverdue')} value={counts.overdue} trend={counts.overdue > 0 ? t('admin.dashboard.statOverdueTrend') : t('admin.dashboard.statOverdueNone')} to="/admin/scan-logs" accent={counts.overdue > 0 ? 'rose' : 'emerald'} />
      </motion.div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Materials in use */}
        <motion.div {...fadeUp(0.1)} className="lg:col-span-2">
          <Card>
            <CardHeader
              title={t('admin.dashboard.materialsInUse')}
              action={
                <Link to="/admin/qr-codes" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  {t('admin.dashboard.allQr')} <ArrowRight className="h-3 w-3" />
                </Link>
              }
            />
            <div className="px-5 pb-4 max-h-[420px] overflow-auto">
              {sortedLoans.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
                  <PackageCheck className="h-7 w-7 mb-2 opacity-30" />
                  <p className="text-sm">{t('admin.dashboard.noMaterials')}</p>
                </div>
              ) : (
                sortedLoans.slice(0, 10).map((loan: any) => (
                  <MaterialRow key={loan.id} loan={loan} now={now} />
                ))
              )}
            </div>
          </Card>
        </motion.div>

        {/* Attention */}
        <motion.div {...fadeUp(0.15)}>
          <Card>
            <CardHeader title={t('admin.dashboard.toHandle')} />
            <div className="px-4 pb-4 space-y-0.5">
              {totalAttention === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
                  <PackageCheck className="h-7 w-7 mb-2 opacity-30 text-emerald-500" />
                  <p className="text-sm font-medium text-foreground">{t('admin.dashboard.inboxZero')}</p>
                  <p className="text-xs mt-0.5">{t('admin.dashboard.nothingToDo')}</p>
                </div>
              ) : (
                <>
                  <AttentionRow icon={Inbox}         label={t('admin.dashboard.attnEquipment')}  count={counts.pendingEquipment}  to="/admin/requests" />
                  <AttentionRow icon={UserPlus}      label={t('admin.dashboard.attnOnboarding')} count={counts.pendingOnboarding} to="/admin/onboarding/requests" />
                  <AttentionRow icon={Mail}          label={t('admin.dashboard.attnMailbox')}    count={counts.pendingMailbox}    to="/admin/mailbox-requests" />
                  <AttentionRow icon={AlertTriangle} label={t('admin.dashboard.attnOverdue')}     count={counts.overdue}           to="/admin/scan-logs" />
                  <AttentionRow icon={TrendingDown}  label={t('admin.dashboard.attnLowStock')}    count={counts.lowStock}          to="/admin/products" />
                </>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Activity */}
        <motion.div {...fadeUp(0.2)} className="lg:col-span-2">
          <Card>
            <CardHeader
              title={t('admin.dashboard.recentActivity')}
              action={
                <Link to="/admin/scan-logs" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  {t('admin.dashboard.fullHistory')} <ArrowRight className="h-3 w-3" />
                </Link>
              }
            />
            <div className="px-5 pb-4 max-h-[360px] overflow-auto">
              {recentScans.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
                  <Clock className="h-7 w-7 mb-2 opacity-30" />
                  <p className="text-sm">{t('admin.dashboard.noActivity')}</p>
                </div>
              ) : (
                recentScans.slice(0, 8).map((log: any) => <ActivityRow key={log.id} log={log} />)
              )}
            </div>
          </Card>
        </motion.div>

        {/* Fleet breakdown */}
        <motion.div {...fadeUp(0.25)}>
          <Card>
            <CardHeader title={t('admin.dashboard.byCategory')} />
            <div className="px-5 pb-5 space-y-3">
              {categoryBreakdown.length === 0 ? (
                <div className="py-8 flex flex-col items-center justify-center text-muted-foreground">
                  <Box className="h-7 w-7 mb-2 opacity-30" />
                  <p className="text-sm">{t('admin.dashboard.noCategory')}</p>
                </div>
              ) : (
                categoryBreakdown.slice(0, 6).map((c: any) => {
                  const pct = c.total > 0 ? (c.available / c.total) * 100 : 0
                  return (
                    <div key={c.name}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm">{c.name}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">{c.available}/{c.total}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                        <div className="h-full bg-foreground/80 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
