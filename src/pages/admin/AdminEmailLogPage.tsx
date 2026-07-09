import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useEmailLog, useClearEmailLog } from '@/hooks/use-email-log'
import { useUIStore } from '@/stores/ui-store'
import {
  Search, Mail, CheckCircle, XCircle, Trash2, RefreshCw, AlertTriangle, Repeat,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { cn } from '@/lib/utils'

const fmtDateTime = (d: any) =>
  d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

export function AdminEmailLogPage() {
  const { t } = useTranslation()
  const { data: rows = [], isLoading, refetch, isFetching } = useEmailLog()
  const clearLog = useClearEmailLog()
  const showToast = useUIStore((s: any) => s.showToast)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'failed'>('all')
  const [confirmClear, setConfirmClear] = useState(false)

  const counts = useMemo(() => ({
    total: rows.length,
    sent: rows.filter((r: any) => r.status === 'sent').length,
    failed: rows.filter((r: any) => r.status === 'failed').length,
  }), [rows])

  const filtered = useMemo(() => {
    let list = rows
    if (statusFilter !== 'all') list = list.filter((r: any) => r.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((r: any) =>
        r.to_email?.toLowerCase().includes(q) ||
        r.subject?.toLowerCase().includes(q) ||
        r.template_key?.toLowerCase().includes(q) ||
        r.business_unit?.toLowerCase().includes(q)
      )
    }
    return list
  }, [rows, statusFilter, search])

  const handleClear = async () => {
    try {
      await clearLog.mutateAsync()
      showToast(t('admin.emailLog.cleared'))
    } catch (err: any) {
      showToast(err.message, 'error')
    }
    setConfirmClear(false)
  }

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('admin.emailLog.title')} description={t('admin.emailLog.description')} />

      {/* Stat tiles */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { key: 'total', label: t('admin.emailLog.statTotal'), value: counts.total, tint: 'text-foreground', bg: 'bg-muted' },
          { key: 'sent', label: t('admin.emailLog.statSent'), value: counts.sent, tint: 'text-emerald-600', bg: 'bg-emerald-500/10' },
          { key: 'failed', label: t('admin.emailLog.statFailed'), value: counts.failed, tint: 'text-red-600', bg: 'bg-red-500/10' },
        ].map((s) => (
          <Card key={s.key} variant="elevated">
            <CardContent className="p-4">
              <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center mb-2', s.bg)}>
                <Mail className={cn('h-4 w-4', s.tint)} />
              </div>
              <div className={cn('text-2xl font-bold', s.tint)}>{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Failed banner */}
      {counts.failed > 0 && (
        <Card variant="elevated" className="border-red-500/30">
          <CardContent className="p-3 flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
            <span className="text-muted-foreground">{t('admin.emailLog.failedNotice', { count: counts.failed })}</span>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('admin.emailLog.searchPlaceholder')} className="pl-9" value={search} onChange={(e: any) => setSearch(e.target.value)} />
        </div>
        <div className="inline-flex rounded-lg border border-border/50 overflow-hidden">
          {(['all', 'sent', 'failed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn('px-3 py-1.5 text-xs font-medium transition-colors',
                statusFilter === s ? 'bg-foreground text-background' : 'bg-transparent text-muted-foreground hover:bg-muted')}
            >
              {t(`admin.emailLog.filter_${s}`)}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => refetch()}>
          <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} /> {t('admin.emailLog.refresh')}
        </Button>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-destructive ml-auto" onClick={() => setConfirmClear(true)} disabled={!rows.length}>
          <Trash2 className="h-3.5 w-3.5" /> {t('admin.emailLog.clear')}
        </Button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Mail className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">{t('admin.emailLog.empty')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r: any) => {
            const ok = r.status === 'sent'
            return (
              <Card key={r.id} variant="elevated" className={cn(!ok && 'border-red-500/30')}>
                <CardContent className="p-3.5">
                  <div className="flex items-start gap-3">
                    <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', ok ? 'bg-emerald-500/10' : 'bg-red-500/10')}>
                      {ok ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{r.to_email}</span>
                        {r.template_key && <Badge variant="outline" className="text-[10px]">{r.template_key}</Badge>}
                        {r.business_unit && <Badge variant="secondary" className="text-[10px]">{r.business_unit}</Badge>}
                        {r.attempts > 1 && (
                          <Badge variant="outline" className="text-[10px] gap-1 bg-amber-500/10 text-amber-600 border-amber-500/30">
                            <Repeat className="h-2.5 w-2.5" /> {t('admin.emailLog.attempts', { count: r.attempts })}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{r.subject || '—'}</p>
                      {r.cc && <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">Cc: {r.cc}</p>}
                      {!ok && r.error && <p className="text-[11px] text-red-600 mt-1 break-words">{r.error}</p>}
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0 whitespace-nowrap">{fmtDateTime(r.created_at)}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={confirmClear} onOpenChange={() => setConfirmClear(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.emailLog.clearTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t('admin.emailLog.clearConfirm')}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmClear(false)}>{t('admin.emailLog.cancel')}</Button>
            <Button variant="destructive" onClick={handleClear}>{t('admin.emailLog.clear')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
