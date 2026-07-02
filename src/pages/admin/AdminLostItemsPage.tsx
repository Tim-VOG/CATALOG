import { format, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useLostItems, useResolveLost } from '@/hooks/use-qr-reservations'
import { useUIStore } from '@/stores/ui-store'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, PackageSearch, Check } from 'lucide-react'

export function AdminLostItemsPage() {
  const showToast = useUIStore((s: any) => s.showToast)
  const { data: lost = [], isLoading } = useLostItems()
  const resolveLost = useResolveLost()

  const handleResolve = async (scanLogId: string) => {
    if (!confirm('Mark this item as found / resolved?')) return
    try {
      await resolveLost.mutateAsync(scanLogId)
      showToast('Marked as resolved', 'success')
    } catch (err: any) {
      showToast(err?.message || 'Could not resolve', 'error')
    }
  }

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Lost items"
        section="INVENTORY"
        description={`${lost.length} item${lost.length !== 1 ? 's' : ''} reported lost or unaccounted for.`}
      />

      <div className="border border-border/50 rounded-xl overflow-hidden bg-card">
        {lost.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-muted-foreground">
            <PackageSearch className="h-8 w-8 mb-2 opacity-30 text-emerald-500" />
            <p className="text-sm font-medium text-foreground">Nothing lost</p>
            <p className="text-xs mt-1">Everything's accounted for.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {lost.map((item: any) => (
              <div key={item.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20">
                <div className="h-9 w-9 rounded-lg bg-rose-500/12 border border-rose-500/30 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4 text-rose-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{item.product_name || item.qr_code}</p>
                    <span className="text-[11px] text-muted-foreground/70 font-mono">{item.qr_code}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    Last held by {item.user_name || item.user_email || 'unknown'}
                  </p>
                  {item.lost_notes && (
                    <p className="text-[11px] text-rose-500/90 mt-1 italic">{item.lost_notes}</p>
                  )}
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                  {item.lost_reported_at && (
                    <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-500 border-rose-500/30">
                      {formatDistanceToNow(new Date(item.lost_reported_at), { addSuffix: true, locale: fr })}
                    </Badge>
                  )}
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" onClick={() => handleResolve(item.id)} disabled={resolveLost.isPending}>
                    <Check className="h-3 w-3" /> Resolve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
