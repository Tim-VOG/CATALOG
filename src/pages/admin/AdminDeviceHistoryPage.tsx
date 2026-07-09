import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQRCodes, useScanLogsForQrCode } from '@/hooks/use-qr-codes'
import {
  Search, QrCode, ArrowLeft, ArrowDownToLine, ArrowUpFromLine, Clock, User, Package,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { cn } from '@/lib/utils'

const fmtDateTime = (d: any) =>
  d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

function DeviceTimeline({ device, onBack }: any) {
  const { t } = useTranslation()
  const { data: logs = [], isLoading } = useScanLogsForQrCode(device.id)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-xs">
          <ArrowLeft className="h-3.5 w-3.5" /> {t('admin.deviceHistory.back')}
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-display font-bold truncate">{device.product_name || device.label}</h2>
          <p className="text-xs text-muted-foreground font-mono">{device.serial_number || device.qr_code}</p>
        </div>
        {device.status && <Badge variant="outline" className="text-[10px]">{device.status}</Badge>}
      </div>

      {device.assigned_to_name && (
        <Card variant="elevated" className="border-primary/30">
          <CardContent className="p-4 flex items-center gap-3 text-sm">
            <User className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">{t('admin.deviceHistory.currentHolder')}</span>
            <span className="font-medium">{device.assigned_to_name}</span>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <PageLoading />
      ) : logs.length === 0 ? (
        <div className="text-center py-16">
          <Clock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">{t('admin.deviceHistory.noHistory')}</p>
        </div>
      ) : (
        <div className="relative pl-6">
          <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
          <div className="space-y-4">
            {logs.map((log: any) => {
              const take = log.action === 'take'
              return (
                <div key={log.id} className="relative">
                  <div className={cn('absolute -left-[18px] top-1 h-3.5 w-3.5 rounded-full border-2 border-background', take ? 'bg-orange-500' : 'bg-emerald-500')} />
                  <div className="flex items-start gap-3">
                    <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', take ? 'bg-orange-500/10' : 'bg-emerald-500/10')}>
                      {take ? <ArrowUpFromLine className="h-4 w-4 text-orange-500" /> : <ArrowDownToLine className="h-4 w-4 text-emerald-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{take ? t('admin.deviceHistory.takenOut') : t('admin.deviceHistory.returned')}</span>
                        {log.user_name && <span className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> {log.user_name}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Clock className="h-3 w-3" /> {fmtDateTime(log.created_at)}</p>
                      {log.notes && <p className="text-xs text-muted-foreground/80 mt-1 italic">{log.notes}</p>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function AdminDeviceHistoryPage() {
  const { t } = useTranslation()
  const { data: devices = [], isLoading } = useQRCodes()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any>(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return devices
    const q = search.toLowerCase()
    return (devices as any[]).filter((d: any) =>
      d.product_name?.toLowerCase().includes(q) ||
      d.serial_number?.toLowerCase().includes(q) ||
      d.label?.toLowerCase().includes(q) ||
      d.qr_code?.toLowerCase().includes(q) ||
      d.assigned_to_name?.toLowerCase().includes(q)
    )
  }, [devices, search])

  if (isLoading) return <PageLoading />
  if (selected) return <DeviceTimeline device={selected} onBack={() => setSelected(null)} />

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('admin.deviceHistory.title')} description={t('admin.deviceHistory.description')} />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder={t('admin.deviceHistory.searchPlaceholder')} className="pl-9" value={search} onChange={(e: any) => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <QrCode className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">{t('admin.deviceHistory.noDevices')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((d: any) => (
            <Card key={d.id} variant="elevated" className="hover:shadow-card-hover transition-all cursor-pointer group" onClick={() => setSelected(d)}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{d.product_name || d.label}</span>
                    {d.status && <Badge variant="outline" className="text-[10px]">{d.status}</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    {d.serial_number && <span className="font-mono">{d.serial_number}</span>}
                    {d.assigned_to_name && <span className="flex items-center gap-1"><User className="h-3 w-3" /> {d.assigned_to_name}</span>}
                  </div>
                </div>
                <Clock className="h-4 w-4 text-muted-foreground/40 shrink-0 group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
