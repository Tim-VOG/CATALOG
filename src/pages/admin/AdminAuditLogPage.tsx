import { useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import { useAuditLogs } from '@/hooks/use-audit-logs'
import type { AuditLogRow } from '@/lib/api/audit-logs'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/common/DataTable'
import { ShieldCheck, Plus, Pencil, Trash2, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const ENTITY_TYPES = ['loan_requests', 'it_requests', 'qr_codes', 'products', 'profiles', 'it_device_credentials']
const ENTITY_FILTERS = ['all', ...ENTITY_TYPES]

function entityLabel(t: (key: string) => string, type: string): string {
  switch (type) {
    case 'loan_requests': return t('admin.auditLog.entityLoanRequests')
    case 'it_requests': return t('admin.auditLog.entityItRequests')
    case 'qr_codes': return t('admin.auditLog.entityQrCodes')
    case 'products': return t('admin.auditLog.entityProducts')
    case 'profiles': return t('admin.auditLog.entityProfiles')
    case 'it_device_credentials': return t('admin.auditLog.entityItDeviceCredentials')
    default: return type
  }
}

function actionMeta(t: (key: string, opts?: any) => string, action: string): { label: string; icon: typeof Plus; classes: string } {
  if (action === 'create') return { label: t('admin.auditLog.actionCreated'), icon: Plus, classes: 'bg-emerald-500/12 text-emerald-600 border-emerald-500/30' }
  if (action === 'delete') return { label: t('admin.auditLog.actionDeleted'), icon: Trash2, classes: 'bg-rose-500/12 text-rose-500 border-rose-500/30' }
  if (action.startsWith('status:')) return { label: t('admin.auditLog.actionStatusTo', { status: action.slice(7) }), icon: ArrowRight, classes: 'bg-blue-500/12 text-blue-600 border-blue-500/30' }
  if (action.startsWith('role:')) return { label: t('admin.auditLog.actionRoleTo', { role: action.slice(5) }), icon: ShieldCheck, classes: 'bg-amber-500/12 text-amber-600 border-amber-500/30' }
  return { label: t('admin.auditLog.actionUpdated'), icon: Pencil, classes: 'bg-muted text-muted-foreground border-border' }
}

function actorName(t: (key: string) => string, log: AuditLogRow): string {
  const name = [log.actor_first_name, log.actor_last_name].filter(Boolean).join(' ')
  return name || log.actor_email || t('admin.auditLog.systemUnknown')
}

function changedKeys(log: AuditLogRow): string {
  const keys = Object.keys(log.new_values || log.old_values || {}).filter((k: any) => k !== 'updated_at' && k !== 'id')
  if (!keys.length) return ''
  return keys.slice(0, 5).join(', ') + (keys.length > 5 ? '…' : '')
}

export function AdminAuditLogPage() {
  const { t } = useTranslation()
  const [entityType, setEntityType] = useState('all')
  const { data: logs = [], isLoading } = useAuditLogs({ entityType })

  const columns: Column<AuditLogRow>[] = [
    {
      key: 'time', header: t('admin.auditLog.csvHeaderTime'), sortable: true, width: '150px',
      value: (l) => new Date(l.created_at).getTime(),
      render: (l) => (
        <div>
          <div className="text-xs">{formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: fr })}</div>
          <div className="text-[10px] text-muted-foreground/70">{format(new Date(l.created_at), 'd MMM HH:mm', { locale: fr })}</div>
        </div>
      ),
    },
    {
      key: 'actor', header: t('admin.auditLog.csvHeaderActor'), sortable: true,
      value: (l) => actorName(t, l), render: (l) => <span className="font-medium">{actorName(t, l)}</span>,
    },
    {
      key: 'action', header: t('admin.auditLog.csvHeaderAction'), sortable: true, value: (l) => l.action,
      render: (l) => { const m = actionMeta(t, l.action); const I = m.icon; return <Badge variant="outline" className={cn('text-[10px] gap-1', m.classes)}><I className="h-2.5 w-2.5" /> {m.label}</Badge> },
    },
    {
      key: 'entity', header: t('admin.auditLog.csvHeaderEntity'), sortable: true,
      value: (l) => entityLabel(t, l.entity_type), render: (l) => <span className="text-muted-foreground">{entityLabel(t, l.entity_type)}</span>,
    },
    {
      key: 'fields', header: t('admin.auditLog.csvHeaderChangedFields'),
      value: (l) => changedKeys(l), render: (l) => <span className="text-[11px] font-mono text-muted-foreground/80">{changedKeys(l) || '—'}</span>,
    },
  ]

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title={t('admin.auditLog.title')}
        section="SECURITY"
        description={t('admin.auditLog.description', { count: logs.length })}
      />

      <DataTable
        columns={columns}
        data={logs}
        getRowId={(l) => l.id}
        loading={isLoading}
        searchPlaceholder={t('admin.auditLog.searchPlaceholder')}
        initialSort={{ key: 'time', dir: 'desc' }}
        exportName="vo-hub-audit"
        emptyIcon={<ShieldCheck className="h-8 w-8 opacity-30" />}
        emptyTitle={t('admin.auditLog.emptyTitle')}
        emptyDescription={t('admin.auditLog.emptyDescription')}
        toolbar={
          <div className="flex flex-wrap gap-1">
            {ENTITY_FILTERS.map((e) => (
              <Button key={e} variant={entityType === e ? 'secondary' : 'ghost'} size="sm" className="text-xs h-8" onClick={() => setEntityType(e)}>
                {e === 'all' ? t('admin.auditLog.allEntities') : entityLabel(t, e)}
              </Button>
            ))}
          </div>
        }
      />
    </div>
  )
}
