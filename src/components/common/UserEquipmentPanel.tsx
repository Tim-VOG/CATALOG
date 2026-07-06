import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Package, QrCode, Clock, CheckCircle2, Calendar, Inbox, UserPlus, UserMinus, Mail, ClipboardList } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useUserEquipmentFor } from '@/hooks/use-user-equipment'
import { useQRCodesAssignedTo } from '@/hooks/use-qr-codes'
import { useMyLoanRequests } from '@/hooks/use-loan-requests'
import { useMyItRequests } from '@/hooks/use-it-requests'
import { useMyMailboxRequests } from '@/hooks/use-mailbox-requests'

const fmtDate = (d: any) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const REQ_TYPE_META = {
  equipment: { icon: Package, color: 'text-primary', bg: 'bg-primary/10', labelKey: 'typeEquipment' },
  onboarding: { icon: UserPlus, color: 'text-cyan-500', bg: 'bg-cyan-500/10', labelKey: 'typeOnboarding' },
  offboarding: { icon: UserMinus, color: 'text-rose-500', bg: 'bg-rose-500/10', labelKey: 'typeOffboarding' },
  it: { icon: ClipboardList, color: 'text-amber-500', bg: 'bg-amber-500/10', labelKey: 'typeIt' },
  mailbox: { icon: Mail, color: 'text-violet-500', bg: 'bg-violet-500/10', labelKey: 'typeMailbox' },
}

const STATUS_COLOR = {
  pending: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  in_progress: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  ready: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  returned: 'bg-muted text-muted-foreground border-border',
  completed: 'bg-muted text-muted-foreground border-border',
}

/**
 * All-in-one panel showing a user's current equipment, assigned QR
 * codes and the full request history across types. Drop it inside a
 * profile or admin user-detail page.
 */
export function UserEquipmentPanel({ userId  }: any) {
  const { t } = useTranslation()
  const { data: equipment = [], isLoading: equipLoading } = useUserEquipmentFor(userId)
  const { data: qrCodes = [], isLoading: qrLoading } = useQRCodesAssignedTo(userId)
  const { data: loanReqs = [] } = useMyLoanRequests(userId)
  const { data: itReqs = [] } = useMyItRequests(userId)
  const { data: mailboxReqs = [] } = useMyMailboxRequests(userId)

  const typeLabel = (type: string) => {
    const key = (REQ_TYPE_META as Record<string, any>)[type]?.labelKey || 'typeIt'
    return t(`comp.userEquipmentPanel.${key}`)
  }

  const activeEquipment = useMemo(
    () => equipment.filter((e: any) => e.status !== 'returned'),
    [equipment]
  )

  const history = useMemo(() => {
    const items: any[] = []
    for (const r of loanReqs) {
      items.push({
        id: `loan-${r.id}`,
        type: 'equipment',
        title: r.project_name || t('comp.userEquipmentPanel.equipmentRequestFallback'),
        subtitle: t('comp.userEquipmentPanel.itemCount', { count: r.item_count || 0 }),
        status: r.status,
        date: r.created_at,
      })
    }
    for (const r of itReqs) {
      const data = r.data || {}
      const name = data.name || [data.first_name, data.last_name].filter(Boolean).join(' ')
      items.push({
        id: `it-${r.id}`,
        type: r.type || 'it',
        title: name || typeLabel(r.type || 'it') || t('comp.userEquipmentPanel.itRequestFallback'),
        subtitle: data.company || data.business_unit || '',
        status: r.status,
        date: r.created_at,
      })
    }
    for (const r of mailboxReqs) {
      items.push({
        id: `mb-${r.id}`,
        type: 'mailbox',
        title: r.email_to_create || r.project_name || t('comp.userEquipmentPanel.mailboxRequestFallback'),
        subtitle: r.project_name || '',
        status: r.status,
        date: r.created_at,
      })
    }
    return items.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [loanReqs, itReqs, mailboxReqs, t])

  return (
    <div className="space-y-4">
      {/* Current equipment */}
      <Card variant="elevated">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            {t('comp.userEquipmentPanel.currentEquipment')}
            <Badge variant="secondary" className="text-[10px] ml-1">{activeEquipment.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {equipLoading ? (
            <p className="text-xs text-muted-foreground">{t('comp.userEquipmentPanel.loading')}</p>
          ) : activeEquipment.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">{t('comp.userEquipmentPanel.noEquipmentAssigned')}</p>
          ) : (
            <div className="space-y-2">
              {activeEquipment.map((e: any) => (
                <div key={e.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border border-border/40">
                  {e.product_image
                    ? <img src={e.product_image} alt="" className="h-10 w-10 rounded-lg object-cover border border-border/50" />
                    : <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Package className="h-5 w-5 text-primary" /></div>}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{e.product_name}</div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      {e.category_name && <span>{e.category_name}</span>}
                      {e.assigned_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDate(e.assigned_date)}</span>}
                      {e.expected_return_date && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{t('comp.userEquipmentPanel.returnDate', { date: fmtDate(e.expected_return_date) })}</span>}
                    </div>
                    {e.notes && <div className="text-[11px] text-muted-foreground/80 mt-0.5 italic truncate">{e.notes}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assigned QR codes */}
      <Card variant="elevated">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <QrCode className="h-4 w-4 text-primary" />
            {t('comp.userEquipmentPanel.assignedQrCodes')}
            <Badge variant="secondary" className="text-[10px] ml-1">{qrCodes.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {qrLoading ? (
            <p className="text-xs text-muted-foreground">{t('comp.userEquipmentPanel.loading')}</p>
          ) : qrCodes.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">{t('comp.userEquipmentPanel.noQrCodesAssigned')}</p>
          ) : (
            <div className="space-y-2">
              {qrCodes.map((q: any) => (
                <div key={q.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border border-border/40">
                  <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <QrCode className="h-4.5 w-4.5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm font-medium">{q.code}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {q.product_name}{q.label ? ` — ${q.label}` : ''}
                    </div>
                  </div>
                  {q.assigned_at && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
                      <Calendar className="h-3 w-3" />{fmtDate(q.assigned_at)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request history */}
      <Card variant="elevated">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Inbox className="h-4 w-4 text-primary" />
            {t('comp.userEquipmentPanel.requestHistory')}
            <Badge variant="secondary" className="text-[10px] ml-1">{history.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">{t('comp.userEquipmentPanel.noRequestsYet')}</p>
          ) : (
            <div className="space-y-1.5">
              {history.map((h: any) => {
                const meta = (REQ_TYPE_META as Record<string, any>)[h.type] || REQ_TYPE_META.it
                const Icon = meta.icon
                return (
                  <div key={h.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
                    <div className={`h-8 w-8 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`h-4 w-4 ${meta.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{h.title}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {typeLabel(h.type)}{h.subtitle ? ` · ${h.subtitle}` : ''} · {fmtDate(h.date)}
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${(STATUS_COLOR as Record<string, any>)[h.status] || ''}`}>
                      {t(`comp.userEquipmentPanel.status.${h.status}`, { defaultValue: h.status })}
                    </Badge>
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
