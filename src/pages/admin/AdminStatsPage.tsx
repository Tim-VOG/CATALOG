import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useLoanRequests } from '@/hooks/use-loan-requests'
import { useItRequests } from '@/hooks/use-it-requests'
import { useMailboxRequests } from '@/hooks/use-mailbox-requests'
import { useProducts } from '@/hooks/use-products'
import { useQRCodes } from '@/hooks/use-qr-codes'
import { BarChart3, Package, Users, TrendingUp, Clock, CheckCircle, Inbox } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { cn } from '@/lib/utils'

function StatCard({ label, value, sub, icon: Icon, color  }: any) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center', color)}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-3xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

export function AdminStatsPage() {
  const { t } = useTranslation()
  const { data: loanReqs = [], isLoading: l1 } = useLoanRequests()
  const { data: itReqs = [], isLoading: l2 } = useItRequests()
  const { data: mailboxReqs = [], isLoading: l3 } = useMailboxRequests()
  const { data: products = [] } = useProducts()
  const { data: qrCodes = [] } = useQRCodes({})

  const isLoading = l1 || l2 || l3

  const stats = useMemo(() => {
    const allReqs = [...loanReqs, ...itReqs, ...mailboxReqs]
    const thisMonth = allReqs.filter((r: any) => {
      const d = new Date(r.created_at)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    const lastMonth = allReqs.filter((r: any) => {
      const d = new Date(r.created_at)
      const now = new Date()
      const lm = new Date(now.getFullYear(), now.getMonth() - 1)
      return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear()
    })

    const pending = allReqs.filter((r: any) => r.status === 'pending').length
    const inProgress = allReqs.filter((r: any) => r.status === 'in_progress').length
    const ready = allReqs.filter((r: any) => r.status === 'ready').length

    const assigned = qrCodes.filter((q: any) => q.status === 'assigned').length
    const available = qrCodes.filter((q: any) => (q.status || 'available') === 'available').length
    const lowStock = products.filter((p: any) => p.total_stock <= 1).length

    // Most requested products
    const productCounts: Record<string, any> = {}
    for (const r of loanReqs) {
      const name = r.project_name || 'Unknown'
      productCounts[name] = (productCounts[name] || 0) + 1
    }
    const topRequested = Object.entries(productCounts as Record<string, any>).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5)

    // Requests by type
    const byType: Record<string, number> = { equipment: loanReqs.length, onboarding: 0, offboarding: 0, mailbox: mailboxReqs.length }
    for (const r of itReqs) {
      const t = r.type || 'it'
      if (byType[t] !== undefined) byType[t]++
    }

    return { total: allReqs.length, thisMonth: thisMonth.length, lastMonth: lastMonth.length, pending, inProgress, ready, assigned, available, lowStock, topRequested, byType, totalProducts: products.length, totalQR: qrCodes.length }
  }, [loanReqs, itReqs, mailboxReqs, products, qrCodes])

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('admin.stats.title')} description={t('admin.stats.description')} />

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t('admin.stats.totalRequests')} value={stats.total} sub={t('admin.stats.thisMonthSub', { count: stats.thisMonth })} icon={Inbox} color="bg-primary/10 text-primary" />
        <StatCard label={t('admin.stats.pending')} value={stats.pending} icon={Clock} color="bg-amber-500/10 text-amber-500" />
        <StatCard label={t('admin.stats.inProgress')} value={stats.inProgress} icon={TrendingUp} color="bg-blue-500/10 text-blue-500" />
        <StatCard label={t('admin.stats.completed')} value={stats.ready} icon={CheckCircle} color="bg-emerald-500/10 text-emerald-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Inventory */}
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><Package className="h-4 w-4" /> {t('admin.stats.inventory')}</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t('admin.stats.products')}</span><span className="font-bold">{stats.totalProducts}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t('admin.stats.qrCodes')}</span><span className="font-bold">{stats.totalQR}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t('admin.stats.devicesAssigned')}</span><span className="font-bold text-blue-500">{stats.assigned}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t('admin.stats.devicesAvailable')}</span><span className="font-bold text-emerald-500">{stats.available}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t('admin.stats.lowStock')}</span><span className={cn('font-bold', stats.lowStock > 0 ? 'text-rose-500' : 'text-emerald-500')}>{stats.lowStock}</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Requests by type */}
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><BarChart3 className="h-4 w-4" /> {t('admin.stats.requestsByType')}</h3>
            <div className="space-y-3">
              {Object.entries(stats.byType as Record<string, any>).map(([type, count]) => (
                <div key={type} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{t(`admin.requestTypes.${type}`, type)}</span>
                      <span className="font-bold">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Month comparison */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4" /> {t('admin.stats.monthlyComparison')}</h3>
          <div className="flex items-end gap-8">
            <div className="text-center">
              <p className="text-3xl font-bold">{stats.thisMonth}</p>
              <p className="text-xs text-muted-foreground">{t('admin.stats.thisMonth')}</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-muted-foreground">{stats.lastMonth}</p>
              <p className="text-xs text-muted-foreground">{t('admin.stats.lastMonth')}</p>
            </div>
            {stats.lastMonth > 0 && (
              <div className="text-center">
                <p className={cn('text-lg font-bold', stats.thisMonth >= stats.lastMonth ? 'text-emerald-500' : 'text-rose-500')}>
                  {stats.thisMonth >= stats.lastMonth ? '+' : ''}{Math.round(((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100)}%
                </p>
                <p className="text-xs text-muted-foreground">{t('admin.stats.change')}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
