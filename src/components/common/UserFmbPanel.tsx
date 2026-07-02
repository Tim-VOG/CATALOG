import { useMemo } from 'react'
import { Mail, ExternalLink } from 'lucide-react'
import { useSharedMailboxes } from '@/hooks/use-shared-mailboxes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Link } from 'react-router-dom'

const CAT_COLORS = {
  LEGER: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  MOYEN: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  LOURD: 'bg-rose-500/15 text-rose-600 border-rose-500/30',
}

/**
 * Lists the shared mailboxes (FMB) that a user is involved in:
 *   - "as project leader" — matched by name on shared_mailboxes.project_leader
 *   - "with access" — matched against the comma-separated have_access list
 * Drop it inside a user profile / admin user detail page.
 */
export function UserFmbPanel({ user  }: any) {
  const { data: mailboxes = [], isLoading } = useSharedMailboxes()
  const fullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim()
  const lowerName = fullName.toLowerCase()
  const lowerEmail = (user?.email || '').toLowerCase()

  const { ledMailboxes, accessMailboxes } = useMemo(() => {
    const led: any[] = []
    const access: any[] = []
    if (!lowerName && !lowerEmail) return { ledMailboxes: led, accessMailboxes: access }
    for (const m of mailboxes) {
      const leader = (m.project_leader || '').toLowerCase()
      // Project leader can be a single name or a comma-separated list
      const isLeader = leader.split(',').map((s: any) => s.trim()).some((s: any) => s && s === lowerName)
      const accessList = (m.have_access || '').toLowerCase()
      const hasAccess = accessList.split(',').map((s: any) => s.trim()).some(
        (s) => s && (s === lowerName || s === lowerEmail)
      )
      if (isLeader) led.push(m)
      else if (hasAccess) access.push(m)
    }
    return { ledMailboxes: led, accessMailboxes: access }
  }, [mailboxes, lowerName, lowerEmail])

  if (isLoading) return null
  if (ledMailboxes.length === 0 && accessMailboxes.length === 0) return null

  const renderRow = (m: any) => (
    <Link
      key={m.id}
      to="/admin/shared-mailboxes"
      className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors group"
    >
      <div className="h-9 w-9 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
        <Mail className="h-4 w-4 text-violet-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">{m.name}</span>
          {m.category && (
            <Badge variant="outline" className={`text-[10px] ${(CAT_COLORS as Record<string, any>)[m.category] || ''}`}>
              {m.category}
            </Badge>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground truncate">
          {m.mail}{m.company ? ` · ${m.company}` : ''}
        </div>
      </div>
      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </Link>
  )

  return (
    <Card variant="elevated">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Mail className="h-4 w-4 text-violet-600" />
          Shared mailboxes (FMB)
          <Badge variant="secondary" className="text-[10px] ml-1">
            {ledMailboxes.length + accessMailboxes.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {ledMailboxes.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              As project leader · {ledMailboxes.length}
            </div>
            <div className="space-y-1.5">{ledMailboxes.map(renderRow)}</div>
          </div>
        )}
        {accessMailboxes.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              With access · {accessMailboxes.length}
            </div>
            <div className="space-y-1.5">{accessMailboxes.map(renderRow)}</div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
