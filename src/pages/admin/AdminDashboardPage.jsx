import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useLoanRequests } from '@/hooks/use-loan-requests'
import { useProducts } from '@/hooks/use-products'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/common/UserAvatar'
import { motion } from 'motion/react'
import { ScrollFadeIn, AnimatedCounter } from '@/components/ui/motion'
import { Inbox, PackageCheck, AlertTriangle, PackageX, ArrowRight } from 'lucide-react'
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

  // Low stock: count reserved qty per product from active requests
  const lowStock = useMemo(() => {
    const reserved = {}
    for (const r of requests) {
      if (!['pending', 'approved', 'reserved', 'picked_up'].includes(r.status)) continue
      // item_count from the view is total items, but we need per-product data
      // We use a rough approach: each request counts as 1 unit per product item
      // For accurate count we'd need loan_request_items, but item_count gives a signal
    }
    // Simpler approach: count requests per product isn't available from view
    // So just check products where total_stock <= 2 as "low stock" signal
    return products.filter((p) => p.total_stock <= 1)
  }, [requests, products])

  if (requestsLoading || productsLoading) return <PageLoading />

  const stats = [
    { label: 'Pending Requests', value: pending.length, icon: Inbox, color: 'text-warning', link: '/admin/requests' },
    { label: 'Active Loans', value: active.length, icon: PackageCheck, color: 'text-primary', link: '/admin/requests' },
    { label: 'Overdue', value: overdue.length, icon: AlertTriangle, color: 'text-destructive', link: '/admin/requests' },
    { label: 'Approved (awaiting pickup)', value: approved.length, icon: PackageX, color: 'text-accent', link: '/admin/requests' },
  ]

  const STATUS_COLORS = {
    pending: 'bg-warning/15 text-warning border-warning/30',
    approved: 'bg-accent/15 text-accent border-accent/30',
    picked_up: 'bg-primary/15 text-primary border-primary/30',
  }

  // Recent activity: last 8 requests with noteworthy statuses
  const recentRequests = requests
    .filter((r) => ['pending', 'approved', 'picked_up'].includes(r.status))
    .slice(0, 8)

  return (
    <div className="space-y-6">
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

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, link }, i) => (
          <ScrollFadeIn key={label} delay={i * 0.08}>
            <Link to={link}>
              <Card hoverable>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{label}</CardTitle>
                  <Icon className={`h-4 w-4 ${color}`} />
                </CardHeader>
                <CardContent>
                  <AnimatedCounter value={value} className={`text-3xl font-display font-bold tracking-tight ${color}`} />
                </CardContent>
              </Card>
            </Link>
          </ScrollFadeIn>
        ))}
      </div>

      {/* Active loans & recent requests */}
      <ScrollFadeIn>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active loans (picked up) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Active Loans</CardTitle>
            <Link to="/admin/requests" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {active.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No active loans</p>
            ) : (
              <div className="space-y-3">
                {active.slice(0, 5).map((r) => {
                  const isOverdue = r.return_date < today
                  return (
                    <Link key={r.id} to={`/admin/requests/${r.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <UserAvatar
                        avatarUrl={r.user_avatar_url}
                        firstName={r.user_first_name}
                        lastName={r.user_last_name}
                        email={r.user_email}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{r.project_name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {r.user_first_name} {r.user_last_name} · {r.item_count} item{r.item_count > 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={cn('text-xs font-medium', isOverdue ? 'text-destructive' : 'text-muted-foreground')}>
                          {isOverdue ? 'Overdue' : `Due ${r.return_date}`}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent requests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Requests</CardTitle>
            <Link to="/admin/requests" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No recent requests</p>
            ) : (
              <div className="space-y-3">
                {recentRequests.map((r) => (
                  <Link key={r.id} to={`/admin/requests/${r.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <UserAvatar
                      avatarUrl={r.user_avatar_url}
                      firstName={r.user_first_name}
                      lastName={r.user_last_name}
                      email={r.user_email}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.project_name}</p>
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
      </div>
      </ScrollFadeIn>

      {/* Overdue alert */}
      {overdue.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Overdue Returns ({overdue.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overdue.map((r) => (
                <Link key={r.id} to={`/admin/requests/${r.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <UserAvatar
                    avatarUrl={r.user_avatar_url}
                    firstName={r.user_first_name}
                    lastName={r.user_last_name}
                    email={r.user_email}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.project_name}</p>
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
      )}
    </div>
  )
}
