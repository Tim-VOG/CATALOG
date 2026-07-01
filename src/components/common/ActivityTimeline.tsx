import { useMemo } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Package, ScanLine, UserPlus, UserMinus, Mail, ClipboardList,
  Activity, ArrowDownToLine, ArrowUpFromLine,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMyLoanRequests } from '@/hooks/use-loan-requests'
import { useMyItRequests } from '@/hooks/use-it-requests'
import { useMyMailboxRequests } from '@/hooks/use-mailbox-requests'
import { useScanLogsForUser } from '@/hooks/use-qr-codes'
import { cn } from '@/lib/utils'

interface TimelineEvent {
  id: string
  date: string
  icon: typeof Package
  color: string
  title: string
  subtitle?: string
}

/**
 * Unified chronological activity feed for one user: equipment / IT /
 * mailbox requests AND the physical pickup/return scan events. Drop
 * it on the profile page or admin user-detail page.
 */
export function ActivityTimeline({ userId }: { userId: string }) {
  const { data: loanReqs = [] } = useMyLoanRequests(userId)
  const { data: itReqs = [] } = useMyItRequests(userId)
  const { data: mailboxReqs = [] } = useMyMailboxRequests(userId)
  const { data: scans = [] } = useScanLogsForUser(userId)

  const events = useMemo<TimelineEvent[]>(() => {
    const out: TimelineEvent[] = []

    for (const r of loanReqs as any[]) {
      out.push({
        id: `loan-${r.id}`,
        date: r.created_at,
        icon: Package,
        color: 'text-primary bg-primary/10',
        title: `Requested equipment — ${r.project_name || 'untitled'}`,
        subtitle: `${r.item_count || 0} item${(r.item_count || 0) !== 1 ? 's' : ''} · ${r.status}`,
      })
    }
    for (const r of itReqs as any[]) {
      const data = r.data || {}
      const name = data.name || [data.first_name, data.last_name].filter(Boolean).join(' ')
      const meta = r.type === 'onboarding'
        ? { icon: UserPlus, color: 'text-cyan-500 bg-cyan-500/10', label: 'Onboarding' }
        : r.type === 'offboarding'
          ? { icon: UserMinus, color: 'text-rose-500 bg-rose-500/10', label: 'Offboarding' }
          : { icon: ClipboardList, color: 'text-amber-500 bg-amber-500/10', label: 'IT request' }
      out.push({
        id: `it-${r.id}`,
        date: r.created_at,
        icon: meta.icon,
        color: meta.color,
        title: `${meta.label}${name ? ` — ${name}` : ''}`,
        subtitle: r.status,
      })
    }
    for (const r of mailboxReqs as any[]) {
      out.push({
        id: `mb-${r.id}`,
        date: r.created_at,
        icon: Mail,
        color: 'text-violet-500 bg-violet-500/10',
        title: `Mailbox request — ${r.email_to_create || r.project_name || ''}`,
        subtitle: r.status,
      })
    }
    for (const s of scans as any[]) {
      const isTake = s.action === 'take'
      out.push({
        id: `scan-${s.id}`,
        date: s.created_at,
        icon: isTake ? ArrowDownToLine : ArrowUpFromLine,
        color: isTake ? 'text-amber-600 bg-amber-500/10' : 'text-emerald-600 bg-emerald-500/10',
        title: `${isTake ? 'Picked up' : 'Returned'} — ${s.product_name || s.qr_code}`,
        subtitle: s.qr_code,
      })
    }

    return out.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [loanReqs, itReqs, mailboxReqs, scans])

  return (
    <Card variant="elevated">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Activity
          <span className="text-xs font-normal text-muted-foreground">({events.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-5">
        {events.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-muted-foreground">
            <ScanLine className="h-7 w-7 mb-2 opacity-30" />
            <p className="text-sm">No activity yet</p>
          </div>
        ) : (
          <div className="relative pl-2">
            {/* vertical rail */}
            <div className="absolute left-[18px] top-1 bottom-1 w-px bg-border/50" aria-hidden />
            <div className="space-y-1">
              {events.slice(0, 30).map((e: any) => {
                const Icon = e.icon
                return (
                  <div key={e.id} className="relative flex items-start gap-3 py-1.5">
                    <div className={cn('relative z-10 h-8 w-8 rounded-lg flex items-center justify-center shrink-0', e.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-sm truncate">{e.title}</p>
                      {e.subtitle && (
                        <p className="text-[11px] text-muted-foreground/80 truncate font-mono">{e.subtitle}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] text-muted-foreground" title={format(new Date(e.date), 'd MMM yyyy HH:mm', { locale: fr })}>
                        {formatDistanceToNow(new Date(e.date), { addSuffix: true, locale: fr })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
