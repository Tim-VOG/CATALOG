import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useLoanRequests } from '@/hooks/use-loan-requests'
import { useProducts } from '@/hooks/use-products'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/common/UserAvatar'
import { motion } from 'motion/react'
import { ScrollFadeIn, AnimatedCounter } from '@/components/ui/motion'
import {
  Inbox, PackageCheck, AlertTriangle, PackageX,
  ArrowRight, CalendarRange, Box, TrendingDown,
} from 'lucide-react'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { cn } from '@/lib/utils'

export function AdminDashboardPage() {
  const { data: requests = [], isLoading: requestsLoading } = useLoanRequests()
  const { data: products = [], isLoading: productsLoading } = useProducts()

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

  if (requestsLoading || productsLoading) return <PageLoading />

  const stats = [
    { label: 'Pending', value: pending.length, icon: Inbox, color: 'text-warning', borderColor: 'border-l-warning', bgColor: 'bg-warning/8', link: '/admin/requests' },
    { label: 'Active Loans', value: active.length, icon: PackageCheck, color: 'text-primary', borderColor: 'border-l-primary', bgColor: 'bg-primary/8', link: '/admin/requests' },
    { label: 'Overdue', value: overdue.length, icon: AlertTriangle, color: 'text-destructive', borderColor: 'border-l-destructive', bgColor: 'bg-destructive/8', link: '/admin/requests' },
    { label: 'Awaiting Pickup', value: approved.length, icon: PackageX, color: 'text-accent', borderColor: 'border-l-accent', bgColor: 'bg-accent/8', link: '/admin/requests' },
  ]

  const STATUS_COLORS = {
    pending: 'bg-warning/15 text-warning border-warning/30',
    approved: 'bg-accent/15 text-accent border-accent/30',
    picked_up: 'bg-primary/15 text-primary border-primary/30',
  }

  const recentRequests = requests
    .filter((r) => ['pending', 'approved', 'picked_up'].includes(r.status))
    .slice(0, 8)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page header */}
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

      {/* ── Bento grid ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* ── Top-left: 4 stat cards in 2×2 ──────────── */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-4">
          {stats.map(({ label, value, icon: Icon, color, borderColor, bgColor, link }, i) => (
            <ScrollFadeIn key={label} delay={i * 0.06}>
              <Link to={link} className="block h-full">
                <Card variant="elevated" hoverable className={cn('h-full border-l-4', borderColor)}>
                  <CardContent className="p-5">
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
            </ScrollFadeIn>
          ))}
        </div>

        {/* ── Top-right: Active Loans (tall, spans 2 rows) ── */}
        <div className="lg:col-span-7 lg:row-span-2">
          <ScrollFadeIn delay={0.1}>
            <Card variant="elevated" className="h-full">
              <CardHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <PackageCheck className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-base font-semibold">Active Loans</CardTitle>
                </div>
                <Link to="/admin/requests" className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                {active.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <PackageCheck className="h-10 w-10 mb-3 opacity-30" />
                    <p className="text-sm">No active loans</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {active.slice(0, 8).map((r) => {
                      const isOverdue = r.return_date < today
                      return (
                        <Link
                          key={r.id}
                          to={`/admin/requests/${r.id}`}
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40 transition-colors group"
                        >
                          <UserAvatar
                            avatarUrl={r.user_avatar_url}
                            firstName={r.user_first_name}
                            lastName={r.user_last_name}
                            email={r.user_email}
                            size="sm"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{r.project_name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {r.user_first_name} {r.user_last_name} · {r.item_count} item{r.item_count > 1 ? 's' : ''}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            {isOverdue ? (
                              <Badge variant="outline" className="text-[10px] bg-destructive/15 text-destructive border-destructive/30">
                                Overdue
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <CalendarRange className="h-3 w-3" />
                                {r.return_date}
                              </span>
                            )}
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </ScrollFadeIn>
        </div>

        {/* ── Bottom-left: Recent Requests ────────────── */}
        <div className="lg:col-span-5">
          <ScrollFadeIn delay={0.15}>
            <Card variant="elevated" className="h-full">
              <CardHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Inbox className="h-4 w-4 text-accent" />
                  </div>
                  <CardTitle className="text-base font-semibold">Recent Requests</CardTitle>
                </div>
                <Link to="/admin/requests" className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                {recentRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Inbox className="h-10 w-10 mb-3 opacity-30" />
                    <p className="text-sm">No recent requests</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {recentRequests.slice(0, 5).map((r) => (
                      <Link
                        key={r.id}
                        to={`/admin/requests/${r.id}`}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40 transition-colors group"
                      >
                        <UserAvatar
                          avatarUrl={r.user_avatar_url}
                          firstName={r.user_first_name}
                          lastName={r.user_last_name}
                          email={r.user_email}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{r.project_name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {r.user_first_name} {r.user_last_name}
                          </p>
                        </div>
                        <Badge variant="outline" className={cn('text-[10px] shrink-0', STATUS_COLORS[r.status] || '')}>
                          {r.status === 'picked_up' ? 'Active' : r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </ScrollFadeIn>
        </div>
      </div>

      {/* ── Full-width bottom row: Overdue + Low Stock ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Overdue alert */}
        {overdue.length > 0 && (
          <ScrollFadeIn delay={0.2}>
            <Card className="border-destructive/30 h-full">
              <CardHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </div>
                  <CardTitle className="text-base font-semibold text-destructive">
                    Overdue Returns ({overdue.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="space-y-1">
                  {overdue.slice(0, 5).map((r) => (
                    <Link
                      key={r.id}
                      to={`/admin/requests/${r.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40 transition-colors group"
                    >
                      <UserAvatar
                        avatarUrl={r.user_avatar_url}
                        firstName={r.user_first_name}
                        lastName={r.user_last_name}
                        email={r.user_email}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-destructive transition-colors">{r.project_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.user_first_name} {r.user_last_name} · Due {r.return_date}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-destructive/15 text-destructive border-destructive/30 shrink-0">
                        Overdue
                      </Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </ScrollFadeIn>
        )}

        {/* Low stock alert */}
        {lowStock.length > 0 && (
          <ScrollFadeIn delay={0.25}>
            <Card className="border-warning/30 h-full">
              <CardHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
                    <TrendingDown className="h-4 w-4 text-warning" />
                  </div>
                  <CardTitle className="text-base font-semibold text-warning">
                    Low Stock ({lowStock.length})
                  </CardTitle>
                </div>
                <Link to="/admin/products" className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
                  Manage <ArrowRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="space-y-1">
                  {lowStock.slice(0, 5).map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40 transition-colors"
                    >
                      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Box className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.category_name}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] shrink-0',
                          p.total_stock === 0
                            ? 'bg-destructive/15 text-destructive border-destructive/30'
                            : 'bg-warning/15 text-warning border-warning/30'
                        )}
                      >
                        {p.total_stock === 0 ? 'Out of stock' : `${p.total_stock} left`}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </ScrollFadeIn>
        )}
      </div>
    </div>
  )
}
