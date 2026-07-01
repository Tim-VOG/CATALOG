import { useMemo, useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAuditLogs } from '@/hooks/use-audit-logs'
import type { AuditLogRow } from '@/lib/api/audit-logs'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Search, ShieldCheck, Plus, Pencil, Trash2, ArrowRight, Download,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ENTITY_LABELS: Record<string, string> = {
  loan_requests: 'Equipment request',
  it_requests: 'Onboarding / Offboarding',
  qr_codes: 'QR code',
  products: 'Product',
  profiles: 'User',
  it_device_credentials: 'Device credential',
}

const ENTITY_FILTERS = ['all', ...Object.keys(ENTITY_LABELS)]

function actionMeta(action: string): { label: string; icon: typeof Plus; classes: string } {
  if (action === 'create') return { label: 'Created', icon: Plus, classes: 'bg-emerald-500/12 text-emerald-600 border-emerald-500/30' }
  if (action === 'delete') return { label: 'Deleted', icon: Trash2, classes: 'bg-rose-500/12 text-rose-500 border-rose-500/30' }
  if (action.startsWith('status:')) return { label: `→ ${action.slice(7)}`, icon: ArrowRight, classes: 'bg-blue-500/12 text-blue-600 border-blue-500/30' }
  if (action.startsWith('role:')) return { label: `Role → ${action.slice(5)}`, icon: ShieldCheck, classes: 'bg-amber-500/12 text-amber-600 border-amber-500/30' }
  return { label: 'Updated', icon: Pencil, classes: 'bg-muted text-muted-foreground border-border' }
}

function actorName(log: AuditLogRow): string {
  const name = [log.actor_first_name, log.actor_last_name].filter(Boolean).join(' ')
  return name || log.actor_email || 'System / unknown'
}

function changedKeys(log: AuditLogRow): string {
  const keys = Object.keys(log.new_values || log.old_values || {})
    .filter((k: any) => k !== 'updated_at' && k !== 'id')
  if (!keys.length) return ''
  return keys.slice(0, 5).join(', ') + (keys.length > 5 ? '…' : '')
}

export function AdminAuditLogPage() {
  const [entityType, setEntityType] = useState('all')
  const [search, setSearch] = useState('')
  const { data: logs = [], isLoading } = useAuditLogs({ entityType })

  const filtered = useMemo(() => {
    if (!search.trim()) return logs
    const q = search.toLowerCase()
    return logs.filter((l: any) =>
      actorName(l).toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      (ENTITY_LABELS[l.entity_type] || l.entity_type).toLowerCase().includes(q) ||
      changedKeys(l).toLowerCase().includes(q),
    )
  }, [logs, search])

  const handleExportCsv = () => {
    const headers = ['Time', 'Actor', 'Action', 'Entity', 'Entity ID', 'Changed fields']
    const lines = filtered.map((l: any) => [
      new Date(l.created_at).toISOString(),
      actorName(l),
      l.action,
      ENTITY_LABELS[l.entity_type] || l.entity_type,
      l.entity_id || '',
      changedKeys(l),
    ].map((v: any) => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v)).join(','))
    const csv = [headers.join(','), ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `vo-hub-audit-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Audit log"
        section="SECURITY"
        description={`${logs.length} recorded action${logs.length !== 1 ? 's' : ''} · who changed what, when`}
      >
        <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-2">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
      </AdminPageHeader>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search actor, action, field…"
            className="pl-9 h-9"
            value={search}
            onChange={(e: any) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {ENTITY_FILTERS.map((e: any) => (
            <Button
              key={e}
              variant={entityType === e ? 'secondary' : 'ghost'}
              size="sm"
              className="text-xs h-8"
              onClick={() => setEntityType(e)}
            >
              {e === 'all' ? 'All' : ENTITY_LABELS[e]}
            </Button>
          ))}
        </div>
      </div>

      <div className="border border-border/50 rounded-xl overflow-hidden bg-card">
        {filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-muted-foreground">
            <ShieldCheck className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-sm">No audit entries yet.</p>
            <p className="text-xs mt-1">Actions get logged once migration 100 is applied.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {filtered.map((log: any) => {
              const meta = actionMeta(log.action)
              const Icon = meta.icon
              const fields = changedKeys(log)
              return (
                <div key={log.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20">
                  <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border', meta.classes)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">
                      <span className="font-medium">{actorName(log)}</span>
                      <span className="text-muted-foreground"> · </span>
                      <Badge variant="outline" className={cn('text-[10px] align-middle', meta.classes)}>{meta.label}</Badge>
                      <span className="text-muted-foreground"> · {ENTITY_LABELS[log.entity_type] || log.entity_type}</span>
                    </p>
                    {fields && (
                      <p className="text-[11px] text-muted-foreground/80 truncate mt-0.5 font-mono">{fields}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: fr })}</p>
                    <p className="text-[10px] text-muted-foreground/60">{format(new Date(log.created_at), 'd MMM HH:mm', { locale: fr })}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
