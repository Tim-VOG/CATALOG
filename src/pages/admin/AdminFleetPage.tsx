import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useProducts } from '@/hooks/use-products'
import { useItInventory } from '@/hooks/use-it-inventory'
import { Package, PackageCheck, Send, AlertTriangle, ShieldAlert, CalendarClock, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { cn } from '@/lib/utils'

const daysUntil = (d: any) => {
  if (!d) return null
  const ms = new Date(String(d).slice(0, 10)).getTime() - new Date(new Date().toISOString().slice(0, 10)).getTime()
  return Math.round(ms / 86400000)
}

export function AdminFleetPage() {
  const { t, i18n } = useTranslation()
  const { data: products = [], isLoading } = useProducts()
  const { data: inventory = [] } = useItInventory()

  const stats = useMemo(() => {
    let total = 0, available = 0
    for (const p of products as any[]) {
      const tot = p.total_stock || 0
      const avail = p.available != null ? p.available : tot
      total += tot
      available += Math.max(0, avail)
    }
    return { total, available, onLoan: Math.max(0, total - available) }
  }, [products])

  const lowStock = useMemo(
    () => (products as any[]).filter((p: any) => (p.available != null ? p.available : p.total_stock) <= 1)
      .sort((a: any, b: any) => (a.available ?? a.total_stock) - (b.available ?? b.total_stock)),
    [products]
  )

  const byCategory = useMemo(() => {
    const map: Record<string, { total: number; available: number }> = {}
    for (const p of products as any[]) {
      const c = p.category_name || t('admin.fleet.uncategorised')
      const tot = p.total_stock || 0
      const avail = p.available != null ? Math.max(0, p.available) : tot
      const e = map[c] || (map[c] = { total: 0, available: 0 })
      e.total += tot; e.available += avail
    }
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total)
  }, [products, t])

  // C4 — warranty / leasing expirations (within 90 days or already past).
  const expirations = useMemo(() => {
    const rows: any[] = []
    for (const it of inventory as any[]) {
      for (const [kind, date] of [['warranty', it.warranty_end], ['leasing', it.leasing_end]] as const) {
        const d = daysUntil(date)
        if (d == null || d > 90) continue
        rows.push({ kind, date, days: d, name: it.name, company: it.company, model: it.model, serial: it.serial_number })
      }
    }
    return rows.sort((a, b) => a.days - b.days)
  }, [inventory])

  const fmt = (d: any) => new Date(d).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' })

  if (isLoading) return <PageLoading />

  const tiles = [
    { label: t('admin.fleet.totalUnits'), value: stats.total, icon: Package, tint: 'text-foreground', bg: 'bg-muted' },
    { label: t('admin.fleet.available'), value: stats.available, icon: PackageCheck, tint: 'text-emerald-600', bg: 'bg-emerald-500/10' },
    { label: t('admin.fleet.onLoan'), value: stats.onLoan, icon: Send, tint: 'text-blue-600', bg: 'bg-blue-500/10' },
    { label: t('admin.fleet.lowStock'), value: lowStock.length, icon: AlertTriangle, tint: 'text-amber-600', bg: 'bg-amber-500/10' },
  ]

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('admin.fleet.title')} description={t('admin.fleet.description')} />

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((s) => (
          <Card key={s.label} variant="elevated">
            <CardContent className="p-4">
              <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center mb-2', s.bg)}>
                <s.icon className={cn('h-4 w-4', s.tint)} />
              </div>
              <div className={cn('text-2xl font-bold', s.tint)}>{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* By category */}
        <Card variant="elevated">
          <CardContent className="p-5 space-y-3">
            <h3 className="text-sm font-semibold">{t('admin.fleet.byCategory')}</h3>
            {byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('admin.fleet.noData')}</p>
            ) : byCategory.map(([cat, v]) => {
              const pct = v.total ? Math.round((v.available / v.total) * 100) : 0
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{cat}</span>
                    <span className="text-muted-foreground">{v.available}/{v.total} {t('admin.fleet.avail')}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={cn('h-full rounded-full', pct > 30 ? 'bg-emerald-500' : pct > 0 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Low stock */}
        <Card variant="elevated">
          <CardContent className="p-5 space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> {t('admin.fleet.lowStockTitle')}
            </h3>
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('admin.fleet.allStocked')}</p>
            ) : lowStock.slice(0, 8).map((p: any) => (
              <div key={p.id} className="flex items-center gap-3 text-sm py-1">
                <span className="flex-1 truncate">{p.name}</span>
                {p.category_name && <Badge variant="secondary" className="text-[10px]">{p.category_name}</Badge>}
                <Badge variant="outline" className={cn('text-[10px]', (p.available ?? p.total_stock) === 0 ? 'bg-red-500/10 text-red-600 border-red-500/30' : 'bg-amber-500/10 text-amber-600 border-amber-500/30')}>
                  {t('admin.fleet.leftCount', { count: (p.available ?? p.total_stock) })}
                </Badge>
              </div>
            ))}
            <Link to="/admin/products" className="inline-flex items-center gap-1 text-xs text-primary hover:underline pt-1">
              {t('admin.fleet.manageStock')} <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* C4 — Warranty / leasing expirations */}
      <Card variant="elevated">
        <CardContent className="p-5 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-rose-500" /> {t('admin.fleet.expirationsTitle')}
          </h3>
          {expirations.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('admin.fleet.noExpirations')}</p>
          ) : (
            <div className="space-y-1.5">
              {expirations.slice(0, 20).map((e: any, i: number) => {
                const overdue = e.days < 0
                const soon = e.days >= 0 && e.days <= 30
                return (
                  <div key={i} className="flex items-center gap-3 text-sm py-1.5 border-b border-border/40 last:border-0">
                    <CalendarClock className={cn('h-4 w-4 shrink-0', overdue ? 'text-red-500' : soon ? 'text-amber-500' : 'text-muted-foreground')} />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{e.name || e.model || '—'}</span>
                      {e.company && <span className="text-xs text-muted-foreground ml-2">{e.company}</span>}
                      {e.serial && <span className="text-[10px] text-muted-foreground/70 ml-2 font-mono">{e.serial}</span>}
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {e.kind === 'warranty' ? t('admin.fleet.warranty') : t('admin.fleet.leasing')}
                    </Badge>
                    <span className={cn('text-xs whitespace-nowrap w-28 text-right', overdue ? 'text-red-600 font-semibold' : soon ? 'text-amber-600' : 'text-muted-foreground')}>
                      {overdue ? t('admin.fleet.expiredOn', { date: fmt(e.date) }) : t('admin.fleet.inDays', { count: e.days })}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
