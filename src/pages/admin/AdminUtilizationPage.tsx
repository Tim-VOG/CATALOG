import { useMemo } from 'react'
import { useQRCodes, useTakeCounts } from '@/hooks/use-qr-codes'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Row {
  key: string
  name: string
  total: number
  inUse: number
  utilization: number // 0..100, current snapshot
  takes: number       // takes in window
}

function utilStyle(u: number) {
  if (u >= 80) return 'bg-rose-500'
  if (u >= 50) return 'bg-amber-500'
  return 'bg-emerald-500'
}

export function AdminUtilizationPage() {
  const { data: qrCodes = [], isLoading } = useQRCodes()
  const { data: takeCounts = {} } = useTakeCounts(90)

  const { byCategory, byProduct, overall } = useMemo(() => {
    const cat: Record<string, Row> = {}
    const prod: Record<string, Row> = {}
    let total = 0, inUse = 0

    for (const q of qrCodes as any[]) {
      const isInUse = q.status === 'assigned' || q.status === 'reserved'
      total++
      if (isInUse) inUse++

      const catName = q.category_name || '—'
      const c = cat[catName] || (cat[catName] = { key: catName, name: catName, total: 0, inUse: 0, utilization: 0, takes: 0 })
      c.total++; if (isInUse) c.inUse++

      const pName = q.product_name || q.label || '—'
      const pKey = q.product_id || pName
      const p = prod[pKey] || (prod[pKey] = { key: pKey, name: pName, total: 0, inUse: 0, utilization: 0, takes: 0 })
      p.total++; if (isInUse) p.inUse++
      p.takes = takeCounts[q.product_id] || 0
    }

    const finish = (r: Row) => { r.utilization = r.total ? Math.round((r.inUse / r.total) * 100) : 0; return r }
    const byCategory = Object.values(cat).map(finish).sort((a, b) => b.utilization - a.utilization)
    const byProduct = Object.values(prod).map(finish).sort((a, b) => b.utilization - a.utilization)
    return { byCategory, byProduct, overall: total ? Math.round((inUse / total) * 100) : 0 }
  }, [qrCodes, takeCounts])

  if (isLoading) return <PageLoading />

  const overUtilized = byProduct.filter((p) => p.utilization >= 80 && p.total > 0)
  const underUtilized = byProduct.filter((p) => p.utilization < 10 && p.takes === 0 && p.total > 1)

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Utilization"
        section="ANALYTICS"
        description={`Fleet at ${overall}% utilization right now · take counts over the last 90 days`}
      />

      {/* Buy/cut hints */}
      {(overUtilized.length > 0 || underUtilized.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {overUtilized.length > 0 && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
              <p className="text-sm font-medium flex items-center gap-2 text-rose-600"><TrendingUp className="h-4 w-4" /> Often unavailable — consider buying more</p>
              <p className="text-xs text-muted-foreground mt-1">{overUtilized.map((p) => p.name).slice(0, 5).join(', ')}</p>
            </div>
          )}
          {underUtilized.length > 0 && (
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <p className="text-sm font-medium flex items-center gap-2 text-muted-foreground"><TrendingDown className="h-4 w-4" /> Barely used — maybe too many</p>
              <p className="text-xs text-muted-foreground mt-1">{underUtilized.map((p) => p.name).slice(0, 5).join(', ')}</p>
            </div>
          )}
        </div>
      )}

      <UtilSection title="By category" rows={byCategory} showTakes={false} />
      <UtilSection title="By product (90-day takes)" rows={byProduct} showTakes />
    </div>
  )
}

function UtilSection({ title, rows, showTakes }: { title: string; rows: Row[]; showTakes: boolean }) {
  return (
    <div>
      <h2 className="text-sm font-medium mb-3 flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> {title}</h2>
      <div className="rounded-xl border border-border/50 bg-card divide-y divide-border/40">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No data.</p>
        ) : rows.map((r) => (
          <div key={r.key} className="flex items-center gap-3 px-4 py-3">
            <div className="w-40 shrink-0 min-w-0">
              <p className="text-sm truncate">{r.name}</p>
              <p className="text-[11px] text-muted-foreground">{r.inUse}/{r.total} in use</p>
            </div>
            <div className="flex-1 h-2 rounded-full bg-muted/40 overflow-hidden">
              <div className={cn('h-full rounded-full transition-all', utilStyle(r.utilization))} style={{ width: `${r.utilization}%` }} />
            </div>
            <span className="w-10 text-right text-sm tabular-nums font-medium">{r.utilization}%</span>
            {showTakes && (
              <Badge variant="outline" className="text-[10px] w-20 justify-center shrink-0">{r.takes} take{r.takes !== 1 ? 's' : ''}</Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
