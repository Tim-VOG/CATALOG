import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ResponsiveGridLayout as RGLResponsive } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { useLoanRequests } from '@/hooks/use-loan-requests'
import { useProducts } from '@/hooks/use-products'
import { useDashboardLayout } from '@/hooks/use-dashboard-layout'
import { BREAKPOINTS, COLS, ROW_HEIGHT } from '@/components/admin/dashboard/dashboard-layouts'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/common/UserAvatar'
import { motion } from 'motion/react'
import { AnimatedCounter } from '@/components/ui/motion'
import {
  Inbox, PackageCheck, AlertTriangle, PackageX,
  ArrowRight, CalendarRange, Box, TrendingDown,
  GripHorizontal, RotateCcw,
} from 'lucide-react'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { cn } from '@/lib/utils'

// react-grid-layout v2 exports ResponsiveGridLayout directly with built-in width detection

// ── Stat widget (small card) ──
function StatWidget({ label, value, icon: Icon, color, borderColor, bgColor, link }) {
  return (
    <Link to={link} className="block h-full">
      <Card variant="elevated" hoverable className={cn('h-full border-l-4 flex flex-col', borderColor)}>
        <div className="drag-handle flex items-center justify-center py-1 cursor-grab active:cursor-grabbing opacity-0 hover:opacity-100 transition-opacity">
          <GripHorizontal className="h-3 w-3 text-muted-foreground/40" />
        </div>
        <CardContent className="px-5 pb-5 pt-0 flex-1 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
            <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', bgColor)}>
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
    <Card variant="elevated" className={cn('h-full flex flex-col overflow-hidden', borderClass)}>
      <div className="drag-handle flex items-center justify-between px-5 pt-4 pb-2 cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-2">
          <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', iconBg)}>
            <Icon className={cn('h-4 w-4', iconColor)} />
          </div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          {headerRight}
          <GripHorizontal className="h-3.5 w-3.5 text-muted-foreground/30" />
        </div>
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

export function AdminDashboardPage() {
  const { data: requests = [], isLoading: requestsLoading } = useLoanRequests()
  const { data: products = [], isLoading: productsLoading } = useProducts()
  const { layouts, onLayoutChange, resetLayout } = useDashboardLayout()

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

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-gradient-primary">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your equipment management</p>
          <motion.div
            className="mt-3 h-0.5 w-16 rounded-full bg-primary/60"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{ originX: 0 }}
          />
        </div>
        <Button variant="ghost" size="sm" onClick={resetLayout} className="gap-2 text-xs text-muted-foreground">
          <RotateCcw className="h-3 w-3" />
          Reset Layout
        </Button>
      </div>

      {/* ── Responsive grid layout ── */}
      <RGLResponsive
        className="dashboard-grid -mx-2"
        layouts={layouts}
        breakpoints={BREAKPOINTS}
        cols={COLS}
        rowHeight={ROW_HEIGHT}
        onLayoutChange={onLayoutChange}
        draggableHandle=".drag-handle"
        isResizable
        isDraggable
        compactType="vertical"
        margin={[16, 16]}
      >
        {/* Stat cards */}
        <div key="stat-pending">
          <StatWidget label="Pending" value={pending.length} icon={Inbox} color="text-warning" borderColor="border-l-warning" bgColor="bg-warning/8" link="/admin/requests" />
        </div>
        <div key="stat-active">
          <StatWidget label="Active Loans" value={active.length} icon={PackageCheck} color="text-primary" borderColor="border-l-primary" bgColor="bg-primary/8" link="/admin/requests" />
        </div>
        <div key="stat-overdue">
          <StatWidget label="Overdue" value={overdue.length} icon={AlertTriangle} color="text-destructive" borderColor="border-l-destructive" bgColor="bg-destructive/8" link="/admin/requests" />
        </div>
        <div key="stat-pickup">
          <StatWidget label="Awaiting Pickup" value={approved.length} icon={PackageX} color="text-accent" borderColor="border-l-accent" bgColor="bg-accent/8" link="/admin/requests" />
        </div>

        {/* Active loans */}
        <div key="active-loans">
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
        </div>

        {/* Recent requests */}
        <div key="recent-requests">
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
        </div>

        {/* Overdue returns */}
        <div key="overdue-returns">
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
        </div>

        {/* Low stock */}
        <div key="low-stock">
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
        </div>
      </RGLResponsive>
    </div>
  )
}
