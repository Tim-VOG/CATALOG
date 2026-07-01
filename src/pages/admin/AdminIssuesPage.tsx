import { useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useEquipmentIssues, useResolveEquipmentIssue } from '@/hooks/use-equipment-issues'
import { useUIStore } from '@/stores/ui-store'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Check, Wrench, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AdminIssuesPage() {
  const showToast = useUIStore((s) => s.showToast)
  const [statusFilter, setStatusFilter] = useState('open')
  const { data: issues = [], isLoading } = useEquipmentIssues(statusFilter)
  const resolve = useResolveEquipmentIssue()

  const handleResolve = async (id: string) => {
    try {
      await resolve.mutateAsync(id)
      showToast('Marked resolved', 'success')
    } catch (err: any) {
      showToast(err?.message || 'Could not resolve', 'error')
    }
  }

  if (isLoading) return <PageLoading />

  const openCount = issues.filter((i) => i.status === 'open').length

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Equipment issues"
        section="SUPPORT"
        description={statusFilter === 'open' ? `${openCount} open ticket${openCount !== 1 ? 's' : ''}` : 'Problems reported by users'}
      />

      <div className="flex flex-wrap gap-1">
        {['open', 'resolved', 'all'].map((s) => (
          <Button key={s} variant={statusFilter === s ? 'secondary' : 'ghost'} size="sm" className="text-xs h-8 capitalize" onClick={() => setStatusFilter(s)}>
            {s}
          </Button>
        ))}
      </div>

      {issues.length === 0 ? (
        <div className="border border-border/50 rounded-xl py-16 flex flex-col items-center justify-center text-muted-foreground bg-card">
          <Wrench className="h-8 w-8 mb-2 opacity-30" />
          <p className="text-sm">No {statusFilter === 'all' ? '' : statusFilter} issues.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => (
            <div key={issue.id} className="rounded-xl border border-border/50 bg-card p-4">
              <div className="flex items-start gap-3">
                <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                  issue.status === 'open' ? 'bg-rose-500/12 text-rose-500' : 'bg-emerald-500/12 text-emerald-600')}>
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{issue.product_name || issue.qr_code || 'Device'}</p>
                    {issue.qr_code && <span className="text-[11px] font-mono text-muted-foreground">{issue.qr_code}</span>}
                    <Badge variant="outline" className={cn('text-[10px]', issue.status === 'open' ? 'bg-rose-500/10 text-rose-500 border-rose-500/30' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30')}>
                      {issue.status}
                    </Badge>
                  </div>
                  <p className="text-sm mt-1.5 whitespace-pre-line">{issue.description}</p>
                  {issue.photo_url && (
                    <a href={issue.photo_url} target="_blank" rel="noreferrer">
                      <img src={issue.photo_url} alt="" className="mt-2 h-28 rounded-lg border border-border/50" />
                    </a>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{issue.reporter_name || issue.reporter_email || 'Unknown'}</span>
                    <span title={format(new Date(issue.created_at), 'd MMM yyyy HH:mm', { locale: fr })}>
                      {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true, locale: fr })}
                    </span>
                    {issue.reporter_email && (
                      <a href={`mailto:${issue.reporter_email}?subject=${encodeURIComponent(`[VO Hub] Re: ${issue.product_name || issue.qr_code}`)}`} className="inline-flex items-center gap-1 hover:text-foreground">
                        <Mail className="h-3 w-3" /> Reply
                      </a>
                    )}
                  </div>
                </div>
                {issue.status === 'open' && (
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs shrink-0" onClick={() => handleResolve(issue.id)} disabled={resolve.isPending}>
                    <Check className="h-3 w-3" /> Resolve
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
