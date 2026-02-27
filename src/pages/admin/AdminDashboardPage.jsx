import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { format, addDays, differenceInDays, startOfDay } from 'date-fns'
import { useLoanRequests } from '@/hooks/use-loan-requests'
import { useProducts } from '@/hooks/use-products'
import { useDashboardWidgets } from '@/hooks/use-dashboard-widgets'
import { RequestsChart } from '@/components/admin/dashboard/RequestsChart'
import { CategoryChart } from '@/components/admin/dashboard/CategoryChart'
import { LoansChart } from '@/components/admin/dashboard/LoansChart'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/common/UserAvatar'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AnimatedCounter } from '@/components/ui/motion'
import {
  Inbox, PackageCheck, AlertTriangle, PackageX,
  ArrowRight, CalendarRange, Box, TrendingDown,
  LayoutGrid, BarChart3, PieChart, Activity,
  Eye, EyeOff, RotateCcw, Calendar,
} from 'lucide-react'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { cn } from '@/lib/utils'

// Widget icon map for the toggle panel
const WIDGET_ICONS = {
  'stat-pending': Inbox,
  'stat-active': PackageCheck,
  'stat-overdue': AlertTriangle,
  'stat-pickup': PackageX,
  'chart-requests': BarChart3,
  'chart-categories': PieChart,
  'chart-loans': Activity,
  'timeline': CalendarRange,
  'active-loans': PackageCheck,
  'recent-requests': Inbox,
  'overdue-returns': AlertTriangle,
  'low-stock': TrendingDown,
}

// Staggered entrance animation factory
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: [0.25, 0.46, 0.45, 0.94] },
})

// ── Stat widget (small card) ──
function StatWidget({ label, value, icon: Icon, color, borderColor, bgColor, link }) {
  return (
    <Link to={link} className="block h-full group">
      <Card variant="elevated" hoverable className={cn('h-full border-l-4', borderColor)}>
        <CardContent className="px-5 py-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
            <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110', bgColor)}>
              <Icon className={cn('h-4 w-4', color)} />
            </div>
          </div>
          <AnimatedCounter value={value} className={cn('text-3xl font-display font-bold tracking-tight', color)} />
        </CardContent>
      </Card>
    </Link>
  )
}

// ── List widget wrapper ──
function ListWidget({ title, icon: Icon, iconColor, iconBg, headerRight, emptyIcon: EmptyIcon, emptyText, children, borderClass }) {
  return (
    <Card variant="elevated" className={cn('flex flex-col overflow-hidden', borderClass)}>
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-2.5">
          <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', iconBg)}>
            <Icon className={cn('h-4 w-4', iconColor)} />
          </div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </div>
        {headerRight}
      </div>
      <CardContent className="px-5 pb-5 flex-1 overflow-auto">
        {children || (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <EmptyIcon className="h-10 w-10 mb-3 opacity-30" />
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
    <Card variant="elevated" className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center px-5 pt-4 pb-2">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
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
  pending: 'bg-amber-500/80',
  approved: 'bg-blue-500/80',
  reserved: 'bg-cyan-500/80',
  picked_up: 'bg-emerald-500/80',
}

function TimelineWidget({ requests }) {
  const today = startOfDay(new Date())
  const days = 14 // Show 14-day window
  const dayColumns = Array.from({ length: days }, (_, i) => addDays(today, i))

  // Get active/upcoming requests that overlap the 14-day window
  const timelineItems = useMemo(() => {
    const endWindow = addDays(today, days)
    return requests
      .filter((r) => ['pending', 'approved', 'picked_up'].includes(r.status))
      .filter((r) => {
        const start = startOfDay(new Date(r.pickup_date || r.created_at))
        const end = startOfDay(new Date(r.return_date || addDays(start, 7)))
        return start < endWindow && end >= today
      })
      .slice(0, 8) // Max 8 rows
      .map((r) => {
        const start = startOfDay(new Date(r.pickup_date || r.created_at))
        const end = startOfDay(new Date(r.return_date || addDays(start, 7)))
        const startCol = Math.max(0, differenceInDays(start, today))
        const endCol = Math.min(days - 1, differenceInDays(end, today))
        return { ...r, startCol, endCol, barWidth: endCol - startCol + 1 }
      })
  }, [requests, today])

  return (
    <Card variant="elevated" className="overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-primary/10">
            <CalendarRange className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-base font-semibold">Planning Timeline</CardTitle>
        </div>
        <Link to="/admin/planning" className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
          Full view <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <CardContent className="px-5 pb-4 overflow-x-auto">
        {timelineItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <Calendar className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-sm">No upcoming reservations</p>
          </div>
        ) : (
          <div className="min-w-[600px]">
            {/* Day headers */}
            <div className="grid gap-px mb-2" style={{ gridTemplateColumns: `120px repeat(${days}, 1fr)` }}>
              <div />
              {dayColumns.map((day, i) => {
                const isToday = i === 0
                const isWeekend = day.getDay() === 0 || day.getDay() === 6
                return (
                  <div
                    key={i}
                    className={cn(
                      'text-center text-[10px] font-medium py-1 rounded',
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

            {/* Timeline rows */}
            <div className="space-y-1">
              {timelineItems.map((item) => (
                <Link
                  key={item.id}
                  to={`/admin/requests/${item.id}`}
                  className="grid gap-px items-center group hover:bg-muted/20 rounded transition-colors"
                  style={{ gridTemplateColumns: `120px repeat(${days}, 1fr)` }}
                >
                  {/* Label */}
                  <div className="pr-2 truncate">
                    <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">
                      {item.user_first_name} {item.user_last_name?.[0]}.
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">{item.project_name}</p>
                  </div>

                  {/* Grid cells with bar */}
                  {dayColumns.map((_, colIdx) => {
                    const isStart = colIdx === item.startCol
                    const isInRange = colIdx >= item.startCol && colIdx <= item.endCol
                    const isEnd = colIdx === item.endCol

                    if (!isInRange) {
                      return <div key={colIdx} className="h-6" />
                    }

                    return (
                      <div
                        key={colIdx}
                        className={cn(
                          'h-6 transition-opacity',
                          TIMELINE_COLORS[item.status] || 'bg-muted',
                          isStart && 'rounded-l-md',
                          isEnd && 'rounded-r-md',
                          'group-hover:opacity-90',
                        )}
                      />
                    )
                  })}
                </Link>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border/30">
              {Object.entries({ pending: 'Pending', approved: 'Approved', picked_up: 'Active' }).map(([key, label]) => (
                <div key={key} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <div className={cn('h-2.5 w-2.5 rounded-sm', TIMELINE_COLORS[key])} />
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
  const { data: requests = [], isLoading: requestsLoading } = useLoanRequests()
  const { data: products = [], isLoading: productsLoading } = useProducts()
  const { isVisible, toggleWidget, resetWidgets, allWidgets } = useDashboardWidgets()
  const [showCustomize, setShowCustomize] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const pending = useMemo(() => requests.filter((r) => r.status === 'pending'), [requests])
  const active = useMemo(() => requests.filter((r) => r.status === 'picked_up'), [requests])
  const approved = useMemo(() => requests.filter((r) => r.status === 'approved'), [requests])
  const overdue = useMemo(
    () => active.filter((r) => r.return_date < today),
    [active, today]
  )
  const lowStock = useMemo(
    () => products.filter((p) => p.total_stock <= 1),
    [products]
  )

  const STATUS_COLORS = {
    pending: 'bg-warning/15 text-warning border-warning/30',
    approved: 'bg-accent/15 text-accent border-accent/30',
    picked_up: 'bg-primary/15 text-primary border-primary/30',
  }

  const recentRequests = requests
    .filter((r) => ['pending', 'approved', 'picked_up'].includes(r.status))
    .slice(0, 8)

  if (requestsLoading || productsLoading) return <PageLoading />

  // Determine visible widgets per section
  const visibleStats = ['stat-pending', 'stat-active', 'stat-overdue', 'stat-pickup'].filter((id) => isVisible(id))
  const hasChartRequests = isVisible('chart-requests')
  const hasChartCategories = isVisible('chart-categories')
  const hasChartLoans = isVisible('chart-loans')
  const hasTimeline = isVisible('timeline')
  const visiblePrimaryLists = ['active-loans', 'recent-requests'].filter((id) => isVisible(id))
  const visibleSecondaryLists = ['overdue-returns', 'low-stock'].filter((id) => isVisible(id))

  // Staggered delay counter
  let d = -0.06
  const nextDelay = () => { d += 0.06; return d }

  // Group widgets for customize panel
  const groups = { stats: 'Stat Cards', charts: 'Charts', lists: 'Lists' }

  return (
    <div>
      {/* Page header */}
      <AdminPageHeader title="Dashboard" description="Overview of your equipment management">
        <div className="relative">
          <Button
            variant={showCustomize ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setShowCustomize(!showCustomize)}
            className="gap-2 text-xs text-muted-foreground"
          >
            <LayoutGrid className="h-3 w-3" />
            Customize
          </Button>

          {/* Customize dropdown */}
          {showCustomize && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowCustomize(false)} />
              <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border bg-popover shadow-card z-50 overflow-hidden">
                <div className="px-4 py-3 border-b flex items-center justify-between">
                  <span className="text-sm font-semibold">Dashboard Widgets</span>
                  <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2 text-muted-foreground gap-1" onClick={resetWidgets}>
                    <RotateCcw className="h-3 w-3" />
                    Reset
                  </Button>
                </div>
                <div className="p-2 max-h-80 overflow-auto space-y-3">
                  {Object.entries(groups).map(([groupKey, groupLabel]) => (
                    <div key={groupKey}>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-2 mb-1">{groupLabel}</p>
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
                                'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left transition-colors',
                                visible ? 'hover:bg-muted/50' : 'opacity-50 hover:opacity-75'
                              )}
                            >
                              <WidgetIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-sm flex-1">{w.label}</span>
                              {visible ? (
                                <Eye className="h-3.5 w-3.5 text-primary shrink-0" />
                              ) : (
                                <EyeOff className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
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
      </AdminPageHeader>

      {/* ── Dashboard sections with auto-flowing layout ── */}
      <div className="space-y-6">

        {/* ── Row 1: Stat Cards ── */}
        {visibleStats.length > 0 && (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] gap-4">
            {isVisible('stat-pending') && (
              <motion.div {...fadeUp(nextDelay())}>
                <StatWidget label="Pending" value={pending.length} icon={Inbox} color="text-warning" borderColor="border-l-warning" bgColor="bg-warning/8" link="/admin/requests" />
              </motion.div>
            )}
            {isVisible('stat-active') && (
              <motion.div {...fadeUp(nextDelay())}>
                <StatWidget label="Active Loans" value={active.length} icon={PackageCheck} color="text-primary" borderColor="border-l-primary" bgColor="bg-primary/8" link="/admin/requests" />
              </motion.div>
            )}
            {isVisible('stat-overdue') && (
              <motion.div {...fadeUp(nextDelay())}>
                <StatWidget label="Overdue" value={overdue.length} icon={AlertTriangle} color="text-destructive" borderColor="border-l-destructive" bgColor="bg-destructive/8" link="/admin/requests" />
              </motion.div>
            )}
            {isVisible('stat-pickup') && (
              <motion.div {...fadeUp(nextDelay())}>
                <StatWidget label="Awaiting Pickup" value={approved.length} icon={PackageX} color="text-accent" borderColor="border-l-accent" bgColor="bg-accent/8" link="/admin/requests" />
              </motion.div>
            )}
          </div>
        )}

        {/* ── Row 2: Planning Timeline (full width) ── */}
        {hasTimeline && (
          <motion.div {...fadeUp(nextDelay())}>
            <TimelineWidget requests={requests} />
          </motion.div>
        )}

        {/* ── Row 3: Requests Chart + Category Breakdown ── */}
        {(hasChartRequests || hasChartCategories) && (
          <div className={cn(
            'grid gap-4',
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

        {/* ── Row 4: Active Loans + Recent Requests ── */}
        {visiblePrimaryLists.length > 0 && (
          <div className={cn(
            'grid gap-4',
            visiblePrimaryLists.length >= 2 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
          )}>
            {isVisible('active-loans') && (
              <motion.div {...fadeUp(nextDelay())} className="h-[420px]">
                <ListWidget
                  title="Active Loans"
                  icon={PackageCheck}
                  iconColor="text-primary"
                  iconBg="bg-primary/10"
                  emptyIcon={PackageCheck}
                  emptyText="No active loans"
                  headerRight={
                    <Link to="/admin/requests" className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
                      View all <ArrowRight className="h-3 w-3" />
                    </Link>
                  }
                >
                  {active.length > 0 && (
                    <div className="space-y-1">
                      {active.slice(0, 8).map((r) => {
                        const isOverdue = r.return_date < today
                        return (
                          <Link key={r.id} to={`/admin/requests/${r.id}`} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors group">
                            <UserAvatar avatarUrl={r.user_avatar_url} firstName={r.user_first_name} lastName={r.user_last_name} email={r.user_email} size="sm" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{r.project_name}</p>
                              <p className="text-xs text-muted-foreground truncate">{r.user_first_name} {r.user_last_name} · {r.item_count} item{r.item_count > 1 ? 's' : ''}</p>
                            </div>
                            <div className="text-right shrink-0">
                              {isOverdue ? (
                                <Badge variant="outline" className="text-[10px] bg-destructive/15 text-destructive border-destructive/30">Overdue</Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground flex items-center gap-1"><CalendarRange className="h-3 w-3" />{r.return_date}</span>
                              )}
                            </div>
                          </Link>
                        )
                      })}
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
                  iconColor="text-accent"
                  iconBg="bg-accent/10"
                  emptyIcon={Inbox}
                  emptyText="No recent requests"
                  headerRight={
                    <Link to="/admin/requests" className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">View all <ArrowRight className="h-3 w-3" /></Link>
                  }
                >
                  {recentRequests.length > 0 && (
                    <div className="space-y-1">
                      {recentRequests.slice(0, 5).map((r) => (
                        <Link key={r.id} to={`/admin/requests/${r.id}`} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors group">
                          <UserAvatar avatarUrl={r.user_avatar_url} firstName={r.user_first_name} lastName={r.user_last_name} email={r.user_email} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{r.project_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{r.user_first_name} {r.user_last_name}</p>
                          </div>
                          <Badge variant="outline" className={cn('text-[10px] shrink-0', STATUS_COLORS[r.status] || '')}>
                            {r.status === 'picked_up' ? 'Active' : r.status.charAt(0).toUpperCase() + r.status.slice(1)}
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

        {/* ── Row 5: Loan Activity Chart (full width) ── */}
        {hasChartLoans && (
          <motion.div {...fadeUp(nextDelay())} className="h-[320px]">
            <ChartWidget title="Loan Activity" icon={Activity}>
              <LoansChart requests={requests} />
            </ChartWidget>
          </motion.div>
        )}

        {/* ── Row 6: Overdue Returns + Low Stock ── */}
        {visibleSecondaryLists.length > 0 && (
          <div className={cn(
            'grid gap-4',
            visibleSecondaryLists.length >= 2 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
          )}>
            {isVisible('overdue-returns') && (
              <motion.div {...fadeUp(nextDelay())} className="h-[380px]">
                <ListWidget
                  title={`Overdue Returns (${overdue.length})`}
                  icon={AlertTriangle}
                  iconColor="text-destructive"
                  iconBg="bg-destructive/10"
                  emptyIcon={AlertTriangle}
                  emptyText="No overdue returns — all clear!"
                  borderClass={overdue.length > 0 ? 'border-destructive/30' : ''}
                >
                  {overdue.length > 0 && (
                    <div className="space-y-1">
                      {overdue.slice(0, 5).map((r) => (
                        <Link key={r.id} to={`/admin/requests/${r.id}`} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors group">
                          <UserAvatar avatarUrl={r.user_avatar_url} firstName={r.user_first_name} lastName={r.user_last_name} email={r.user_email} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate group-hover:text-destructive transition-colors">{r.project_name}</p>
                            <p className="text-xs text-muted-foreground">{r.user_first_name} {r.user_last_name} · Due {r.return_date}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px] bg-destructive/15 text-destructive border-destructive/30 shrink-0">Overdue</Badge>
                        </Link>
                      ))}
                    </div>
                  )}
                </ListWidget>
              </motion.div>
            )}
            {isVisible('low-stock') && (
              <motion.div {...fadeUp(nextDelay())} className="h-[380px]">
                <ListWidget
                  title={`Low Stock (${lowStock.length})`}
                  icon={TrendingDown}
                  iconColor="text-warning"
                  iconBg="bg-warning/10"
                  emptyIcon={Box}
                  emptyText="All stock levels healthy"
                  borderClass={lowStock.length > 0 ? 'border-warning/30' : ''}
                  headerRight={
                    <Link to="/admin/products" className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">Manage <ArrowRight className="h-3 w-3" /></Link>
                  }
                >
                  {lowStock.length > 0 && (
                    <div className="space-y-1">
                      {lowStock.slice(0, 5).map((p) => (
                        <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors">
                          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <Box className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.category_name}</p>
                          </div>
                          <Badge variant="outline" className={cn('text-[10px] shrink-0', p.total_stock === 0 ? 'bg-destructive/15 text-destructive border-destructive/30' : 'bg-warning/15 text-warning border-warning/30')}>
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
    </div>
  )
}
