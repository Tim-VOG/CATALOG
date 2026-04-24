import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { format, addDays, differenceInDays, startOfDay } from 'date-fns'
import { useLoanRequests } from '@/hooks/use-loan-requests'
import { useItRequests } from '@/hooks/use-it-requests'
import { useMailboxRequests } from '@/hooks/use-mailbox-requests'
import { useProducts } from '@/hooks/use-products'
import { useDashboardWidgets } from '@/hooks/use-dashboard-widgets'
import { useOverdueScans, useScanStatsByCategory, useUpcomingReturns } from '@/hooks/use-qr-codes'
import { useLostItems } from '@/hooks/use-qr-reservations'
import { RequestsChart } from '@/components/admin/dashboard/RequestsChart'
import { CategoryChart } from '@/components/admin/dashboard/CategoryChart'
import { LoansChart } from '@/components/admin/dashboard/LoansChart'
import { QRUsageChart } from '@/components/admin/dashboard/QRUsageChart'
import { sendEmail } from '@/lib/api/send-email'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/common/UserAvatar'
import { AnimatedCounter } from '@/components/ui/motion'
import {
  Inbox, PackageCheck, AlertTriangle, PackageX,
  ArrowRight, CalendarRange, Box, TrendingDown,
  LayoutGrid, BarChart3, PieChart, Activity,
  Eye, EyeOff, RotateCcw, Calendar, QrCode, Bell, Send, ShieldAlert,
} from 'lucide-react'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { checkAndSendReturnReminders } from '@/services/return-reminder-service'
import { cn } from '@/lib/utils'

// Widget icon map for the toggle panel
const WIDGET_ICONS = {
  'stat-pending': Inbox,
  'stat-active': PackageCheck,
  'stat-pickup': PackageX,
  'chart-requests': BarChart3,
  'chart-categories': PieChart,
  'chart-loans': Activity,
  'timeline': CalendarRange,
  'active-loans': PackageCheck,
  'recent-requests': Inbox,
  'low-stock': TrendingDown,
  'qr-usage': QrCode,
  'qr-overdue': Bell,
}

// Staggered entrance animation factory
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] },
})

// ── Stat widget (modern soft card) ──
function StatWidget({ label, value, icon: Icon, color, iconBg, link, trend }) {
  return (
    <Link to={link} className="block h-full group">
      <Card className="h-full border-border/40 bg-card/80 backdrop-blur-sm hover:shadow-lg hover:border-border/60 transition-all duration-300 overflow-hidden relative">
        <CardContent className="px-5 py-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
              <AnimatedCounter value={value} className={cn('text-3xl font-display font-bold tracking-tight block', color)} />
            </div>
            <div className={cn('h-11 w-11 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110', iconBg)}>
              <Icon className={cn('h-5 w-5', color)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

// ── List widget wrapper ──
function ListWidget({ title, icon: Icon, iconColor, iconBg, headerRight, emptyIcon: EmptyIcon, emptyText, children }) {
  return (
    <Card className="flex flex-col overflow-hidden border-border/40 bg-card/80 backdrop-blur-sm">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center', iconBg)}>
            <Icon className={cn('h-4.5 w-4.5', iconColor)} />
          </div>
          <CardTitle className="text-[15px] font-semibold">{title}</CardTitle>
        </div>
        {headerRight}
      </div>
      <CardContent className="px-5 pb-5 flex-1 overflow-auto">
        {children || (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <EmptyIcon className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-sm">{emptyText}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Chart widget wrapper ──
function ChartWidget({ title, icon: Icon, children }) {
  return (
    <Card className="h-full flex flex-col overflow-hidden border-border/40 bg-card/80 backdrop-blur-sm">
      <div className="flex items-center px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary/12 to-accent/8">
            <Icon className="h-4.5 w-4.5 text-primary" />
          </div>
          <CardTitle className="text-[15px] font-semibold">{title}</CardTitle>
        </div>
      </div>
      <CardContent className="px-3 pb-3 flex-1 min-h-0">
        {children}
      </CardContent>
    </Card>
  )
}

// ── Timeline Planning mini widget ──
const TIMELINE_COLORS = {
  pending: 'bg-amber-500/70',
  in_progress: 'bg-blue-500/70',
  ready: 'bg-emerald-500/70',
}

function TimelineWidget({ requests }) {
  const today = startOfDay(new Date())
  const days = 14
  const dayColumns = Array.from({ length: days }, (_, i) => addDays(today, i))

  const timelineItems = useMemo(() => {
    const endWindow = addDays(today, days)
    return requests
      .filter((r) => ['pending', 'in_progress', 'ready'].includes(r.status))
      .filter((r) => {
        const start = startOfDay(new Date(r.pickup_date || r.created_at))
        const end = startOfDay(new Date(r.return_date || addDays(start, 7)))
        return start < endWindow && end >= today
      })
      .slice(0, 8)
      .map((r) => {
        const start = startOfDay(new Date(r.pickup_date || r.created_at))
        const end = startOfDay(new Date(r.return_date || addDays(start, 7)))
        const startCol = Math.max(0, differenceInDays(start, today))
        const endCol = Math.min(days - 1, differenceInDays(end, today))
        return { ...r, startCol, endCol, barWidth: endCol - startCol + 1 }
      })
  }, [requests, today])

  return (
    <Card className="overflow-hidden border-border/40 bg-card/80 backdrop-blur-sm">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary/12 to-accent/8">
            <CalendarRange className="h-4.5 w-4.5 text-primary" />
          </div>
          <CardTitle className="text-[15px] font-semibold">Planning Timeline</CardTitle>
        </div>
        <Link to="/admin/planning" className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
          Full view <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <CardContent className="px-5 pb-5 overflow-x-auto">
        {timelineItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Calendar className="h-8 w-8 mb-2 opacity-20" />
            <p className="text-sm">No upcoming reservations</p>
          </div>
        ) : (
          <div className="min-w-[600px]">
            <div className="grid gap-px mb-2" style={{ gridTemplateColumns: `120px repeat(${days}, 1fr)` }}>
              <div />
              {dayColumns.map((day, i) => {
                const isToday = i === 0
                const isWeekend = day.getDay() === 0 || day.getDay() === 6
                return (
                  <div
                    key={i}
                    className={cn(
                      'text-center text-[10px] font-medium py-1.5 rounded-lg',
                      isToday && 'bg-primary/10 text-primary font-bold',
                      isWeekend && !isToday && 'text-muted-foreground/40',
                      !isToday && !isWeekend && 'text-muted-foreground/70',
                    )}
                  >
                    <div>{format(day, 'EEE')}</div>
                    <div className="text-[9px]">{format(day, 'd')}</div>
                  </div>
                )
              })}
            </div>

            <div className="space-y-1.5">
              {timelineItems.map((item) => (
                <Link
                  key={item.id}
                  to={`/admin/requests/${item.id}`}
                  className="grid gap-px items-center group hover:bg-muted/20 rounded-lg transition-colors"
                  style={{ gridTemplateColumns: `120px repeat(${days}, 1fr)` }}
                >
                  <div className="pr-2 truncate">
                    <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">
                      {item.user_first_name} {item.user_last_name?.[0]}.
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">{item.project_name}</p>
                  </div>
                  {dayColumns.map((_, colIdx) => {
                    const isInRange = colIdx >= item.startCol && colIdx <= item.endCol
                    if (!isInRange) return <div key={colIdx} className="h-7" />
                    return (
                      <div
                        key={colIdx}
                        className={cn(
                          'h-7 transition-opacity',
                          TIMELINE_COLORS[item.status] || 'bg-muted',
                          colIdx === item.startCol && 'rounded-l-lg',
                          colIdx === item.endCol && 'rounded-r-lg',
                          'group-hover:opacity-90',
                        )}
                      />
                    )
                  })}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/20">
              {Object.entries({ pending: 'Pending', in_progress: 'In Progress', ready: 'Ready' }).map(([key, label]) => (
                <div key={key} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <div className={cn('h-2.5 w-2.5 rounded-full', TIMELINE_COLORS[key])} />
                  {label}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function AdminDashboardPage() {
  const { data: loanReqs = [], isLoading: requestsLoading } = useLoanRequests()
  const { data: itReqs = [] } = useItRequests()
  const { data: mailboxReqs = [] } = useMailboxRequests()

  const requests = useMemo(() => {
    const normalized = []
    for (const r of loanReqs) {
      normalized.push({ ...r, _source: 'equipment', _link: `/admin/requests/${r.id}` })
    }
    for (const r of itReqs) {
      const data = r.data || {}
      normalized.push({
        ...r,
        _source: r.type || 'it',
        _link: r.type === 'onboarding' ? '/admin/onboarding-requests' : r.type === 'offboarding' ? '/admin/offboarding-requests' : '/admin/it-requests',
        project_name: data.name || data.employee_name || data.event_name || r.requester_name || `${r.type || 'IT'} request`,
        user_first_name: r.requester_name?.split(' ')[0] || '',
        user_last_name: r.requester_name?.split(' ').slice(1).join(' ') || '',
        user_email: r.requester_email || '',
        item_count: 0,
      })
    }
    for (const r of mailboxReqs) {
      normalized.push({
        ...r,
        _source: 'mailbox',
        _link: '/admin/mailbox-requests',
        project_name: r.email_to_create || r.project_name || 'Mailbox request',
        user_first_name: r.requested_by_name?.split(' ')[0] || '',
        user_last_name: r.requested_by_name?.split(' ').slice(1).join(' ') || '',
        user_email: r.requester_email || '',
        item_count: 0,
      })
    }
    return normalized
  }, [loanReqs, itReqs, mailboxReqs])
  const { data: products = [], isLoading: productsLoading } = useProducts()
  const { data: overdueScans = [] } = useOverdueScans()
  const { data: lostItems = [] } = useLostItems()
  const { data: upcomingReturns = [] } = useUpcomingReturns()
  const { data: scanStats } = useScanStatsByCategory()
  const { isVisible, toggleWidget, resetWidgets, allWidgets } = useDashboardWidgets()
  const [showCustomize, setShowCustomize] = useState(false)
  const [sendingReminders, setSendingReminders] = useState(false)

  useEffect(() => { checkAndSendReturnReminders() }, [])

  const today = new Date().toISOString().split('T')[0]

  const pending = useMemo(() => requests.filter((r) => r.status === 'pending'), [requests])
  const inProgress = useMemo(() => requests.filter((r) => r.status === 'in_progress'), [requests])
  const ready = useMemo(() => requests.filter((r) => r.status === 'ready'), [requests])
  const lowStock = useMemo(
    () => products.filter((p) => p.total_stock <= 1),
    [products]
  )

  const STATUS_COLORS = {
    pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    in_progress: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    ready: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  }

  const recentRequests = requests
    .filter((r) => ['pending', 'in_progress', 'ready'].includes(r.status))
    .slice(0, 8)

  if (requestsLoading || productsLoading) return <PageLoading />

  const visibleStats = ['stat-pending', 'stat-active', 'stat-pickup'].filter((id) => isVisible(id))
  const hasChartRequests = isVisible('chart-requests')
  const hasChartCategories = isVisible('chart-categories')
  const hasChartLoans = isVisible('chart-loans')
  const hasTimeline = isVisible('timeline')
  const visiblePrimaryLists = ['active-loans', 'recent-requests'].filter((id) => isVisible(id))
  const visibleSecondaryLists = ['low-stock'].filter((id) => isVisible(id))

  let d = -0.05
  const nextDelay = () => { d += 0.05; return d }

  const groups = { stats: 'Stat Cards', charts: 'Charts', lists: 'Lists' }

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex items-end justify-between pt-6 pb-2">
        <div>
          <motion.h1
            className="text-2xl font-display font-bold tracking-tight"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            Dashboard
          </motion.h1>
          <motion.p
            className="text-muted-foreground text-sm mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            Overview of your equipment management
          </motion.p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
          <Button
            variant={showCustomize ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowCustomize(!showCustomize)}
            className="gap-2 text-xs h-8 rounded-lg"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Customize
          </Button>

          {showCustomize && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowCustomize(false)} />
              <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-border/50 bg-popover/95 backdrop-blur-xl shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
                  <span className="text-sm font-semibold">Widgets</span>
                  <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2 text-muted-foreground gap-1" onClick={resetWidgets}>
                    <RotateCcw className="h-3 w-3" />
                    Reset
                  </Button>
                </div>
                <div className="p-2 max-h-80 overflow-auto space-y-3">
                  {Object.entries(groups).map(([groupKey, groupLabel]) => (
                    <div key={groupKey}>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 px-2 mb-1">{groupLabel}</p>
                      {Object.entries(allWidgets)
                        .filter(([, w]) => w.group === groupKey)
                        .map(([id, w]) => {
                          const WidgetIcon = WIDGET_ICONS[id] || Box
                          const visible = isVisible(id)
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => toggleWidget(id)}
                              className={cn(
                                'flex items-center gap-3 w-full px-3 py-2 rounded-xl text-left transition-all',
                                visible ? 'hover:bg-muted/40' : 'opacity-40 hover:opacity-60'
                              )}
                            >
                              <WidgetIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-sm flex-1">{w.label}</span>
                              {visible ? (
                                <Eye className="h-3.5 w-3.5 text-primary shrink-0" />
                              ) : (
                                <EyeOff className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                              )}
                            </button>
                          )
                        })}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      {visibleStats.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isVisible('stat-pending') && (
            <motion.div {...fadeUp(nextDelay())}>
              <StatWidget label="Pending" value={pending.length} icon={Inbox} color="text-amber-500" iconBg="bg-amber-500/10" link="/admin/requests" />
            </motion.div>
          )}
          {isVisible('stat-active') && (
            <motion.div {...fadeUp(nextDelay())}>
              <StatWidget label="In Progress" value={inProgress.length} icon={PackageCheck} color="text-blue-500" iconBg="bg-blue-500/10" link="/admin/requests" />
            </motion.div>
          )}
          {isVisible('stat-pickup') && (
            <motion.div {...fadeUp(nextDelay())}>
              <StatWidget label="Ready" value={ready.length} icon={PackageX} color="text-emerald-500" iconBg="bg-emerald-500/10" link="/admin/requests" />
            </motion.div>
          )}
          {lostItems.length > 0 && (
            <motion.div {...fadeUp(nextDelay())}>
              <StatWidget label="Lost Items" value={lostItems.length} icon={ShieldAlert} color="text-rose-500" iconBg="bg-rose-500/10" link="/admin/scan-logs" />
            </motion.div>
          )}
        </div>
      )}

      {/* ── Planning Timeline ── */}
      {hasTimeline && (
        <motion.div {...fadeUp(nextDelay())}>
          <TimelineWidget requests={requests} />
        </motion.div>
      )}

      {/* ── Charts ── */}
      {(hasChartRequests || hasChartCategories) && (
        <div className={cn(
          'grid gap-5',
          hasChartRequests && hasChartCategories
            ? 'grid-cols-1 lg:grid-cols-3'
            : 'grid-cols-1'
        )}>
          {hasChartRequests && (
            <motion.div
              {...fadeUp(nextDelay())}
              className={cn('h-[380px]', hasChartCategories ? 'lg:col-span-2' : '')}
            >
              <ChartWidget title="Requests (7 Days)" icon={BarChart3}>
                <RequestsChart requests={requests} />
              </ChartWidget>
            </motion.div>
          )}
          {hasChartCategories && (
            <motion.div {...fadeUp(nextDelay())} className="h-[380px]">
              <ChartWidget title="Products by Category" icon={PieChart}>
                <CategoryChart products={products} />
              </ChartWidget>
            </motion.div>
          )}
        </div>
      )}

      {/* ── Active Loans + Recent Requests ── */}
      {visiblePrimaryLists.length > 0 && (
        <div className={cn(
          'grid gap-5',
          visiblePrimaryLists.length >= 2 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
        )}>
          {isVisible('active-loans') && (
            <motion.div {...fadeUp(nextDelay())} className="h-[420px]">
              <ListWidget
                title="In Progress"
                icon={PackageCheck}
                iconColor="text-blue-500"
                iconBg="bg-blue-500/10"
                emptyIcon={PackageCheck}
                emptyText="No active loans"
                headerRight={
                  <Link to="/admin/requests" className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
                    View all <ArrowRight className="h-3 w-3" />
                  </Link>
                }
              >
                {inProgress.length > 0 && (
                  <div className="space-y-1">
                    {inProgress.slice(0, 8).map((r) => (
                        <Link key={r.id} to={r._link || `/admin/requests/${r.id}`} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/30 transition-colors group">
                          <UserAvatar avatarUrl={r.user_avatar_url} firstName={r.user_first_name} lastName={r.user_last_name} email={r.user_email} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{r.project_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{r.user_first_name} {r.user_last_name}{r.item_count > 0 ? ` · ${r.item_count} item${r.item_count > 1 ? 's' : ''}` : ''}</p>
                          </div>
                          <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0"><CalendarRange className="h-3 w-3" />{r.return_date}</span>
                        </Link>
                    ))}
                  </div>
                )}
              </ListWidget>
            </motion.div>
          )}
          {isVisible('recent-requests') && (
            <motion.div {...fadeUp(nextDelay())} className="h-[420px]">
              <ListWidget
                title="Recent Requests"
                icon={Inbox}
                iconColor="text-violet-500"
                iconBg="bg-violet-500/10"
                emptyIcon={Inbox}
                emptyText="No recent requests"
                headerRight={
                  <Link to="/admin/requests" className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">View all <ArrowRight className="h-3 w-3" /></Link>
                }
              >
                {recentRequests.length > 0 && (
                  <div className="space-y-1">
                    {recentRequests.slice(0, 5).map((r) => (
                      <Link key={r.id} to={r._link || `/admin/requests/${r.id}`} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/30 transition-colors group">
                        <UserAvatar avatarUrl={r.user_avatar_url} firstName={r.user_first_name} lastName={r.user_last_name} email={r.user_email} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{r.project_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{r.user_first_name} {r.user_last_name}</p>
                        </div>
                        <Badge variant="outline" className={cn('text-[10px] shrink-0', STATUS_COLORS[r.status] || '')}>
                          {r.status === 'in_progress' ? 'In Progress' : r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </ListWidget>
            </motion.div>
          )}
        </div>
      )}

      {/* ── QR Usage + Overdue Equipment ── */}
      {(isVisible('qr-usage') || isVisible('qr-overdue')) && (
        <div className={cn(
          'grid gap-5',
          isVisible('qr-usage') && isVisible('qr-overdue') ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
        )}>
          {isVisible('qr-usage') && (
            <motion.div {...fadeUp(nextDelay())} className="h-[380px]">
              <ChartWidget title="QR Scan Usage by Category" icon={QrCode}>
                <QRUsageChart stats={scanStats} />
              </ChartWidget>
            </motion.div>
          )}
          {isVisible('qr-overdue') && (
            <motion.div {...fadeUp(nextDelay())} className="h-[380px]">
              <ListWidget
                title={`Overdue Equipment (${overdueScans.length})`}
                icon={Bell}
                iconColor="text-rose-500"
                iconBg="bg-rose-500/10"
                emptyIcon={Bell}
                emptyText="No overdue equipment — all returned on time!"
                headerRight={
                  upcomingReturns.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[10px] h-6 px-2 gap-1 text-primary"
                      disabled={sendingReminders}
                      onClick={async () => {
                        setSendingReminders(true)
                        let sent = 0
                        for (const scan of upcomingReturns) {
                          if (scan.user_email) {
                            await sendEmail({
                              to: scan.user_email,
                              subject: `Reminder: ${scan.product_name} due tomorrow`,
                              body: `<p>Hi ${scan.user_name || 'there'},</p><p>This is a friendly reminder that <strong>${scan.product_name}</strong> is due for return tomorrow (${scan.expected_return_date}).</p><p>Please return it to the IT desk.</p><p>Thank you!</p>`,
                            })
                            sent++
                          }
                        }
                        setSendingReminders(false)
                        alert(`${sent} reminder${sent !== 1 ? 's' : ''} sent!`)
                      }}
                    >
                      <Send className="h-3 w-3" />
                      Send reminders ({upcomingReturns.length})
                    </Button>
                  )
                }
              >
                {overdueScans.length > 0 && (
                  <div className="space-y-1">
                    {overdueScans.slice(0, 8).map((scan) => {
                      const daysOverdue = Math.floor((new Date() - new Date(scan.expected_return_date + 'T12:00:00')) / (1000 * 60 * 60 * 24))
                      return (
                        <div key={scan.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/30 transition-colors">
                          <div className="h-9 w-9 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
                            <AlertTriangle className="h-4 w-4 text-rose-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{scan.product_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {scan.user_name || scan.user_email} · Due {scan.expected_return_date}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-500 border-rose-500/20 shrink-0">
                            {daysOverdue}d overdue
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                )}
              </ListWidget>
            </motion.div>
          )}
        </div>
      )}

      {/* ── Loan Activity Chart ── */}
      {hasChartLoans && (
        <motion.div {...fadeUp(nextDelay())} className="h-[320px]">
          <ChartWidget title="Loan Activity" icon={Activity}>
            <LoansChart requests={requests} />
          </ChartWidget>
        </motion.div>
      )}

      {/* ── Low Stock ── */}
      {visibleSecondaryLists.length > 0 && (
        <div className="grid gap-5 grid-cols-1">
          {isVisible('low-stock') && (
            <motion.div {...fadeUp(nextDelay())} className="h-[380px]">
              <ListWidget
                title={`Low Stock (${lowStock.length})`}
                icon={TrendingDown}
                iconColor="text-amber-500"
                iconBg="bg-amber-500/10"
                emptyIcon={Box}
                emptyText="All stock levels healthy"
                headerRight={
                  <Link to="/admin/products" className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">Manage <ArrowRight className="h-3 w-3" /></Link>
                }
              >
                {lowStock.length > 0 && (
                  <div className="space-y-1">
                    {lowStock.slice(0, 5).map((p) => (
                      <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/30 transition-colors">
                        <div className="h-9 w-9 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
                          <Box className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.category_name}</p>
                        </div>
                        <Badge variant="outline" className={cn('text-[10px] shrink-0', p.total_stock === 0 ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20')}>
                          {p.total_stock === 0 ? 'Out of stock' : `${p.total_stock} left`}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </ListWidget>
            </motion.div>
          )}
        </div>
      )}
    </div>
  )
}
