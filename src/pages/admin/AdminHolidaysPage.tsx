import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useHolidays, useCreateHoliday, useDeleteHoliday } from '@/hooks/use-holidays'
import { useUIStore } from '@/stores/ui-store'
import { CalendarOff, Plus, Trash2, CalendarDays } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'

export function AdminHolidaysPage() {
  const { t, i18n } = useTranslation()
  const { data: holidays = [], isLoading } = useHolidays()
  const createHoliday = useCreateHoliday()
  const deleteHoliday = useDeleteHoliday()
  const showToast = useUIStore((s: any) => s.showToast)

  const [day, setDay] = useState('')
  const [label, setLabel] = useState('')

  const todayKey = new Date().toISOString().slice(0, 10)
  const { upcoming, past } = useMemo(() => {
    const up: any[] = [], pa: any[] = []
    for (const h of holidays as any[]) (String(h.day).slice(0, 10) >= todayKey ? up : pa).push(h)
    return { upcoming: up, past: pa.reverse() }
  }, [holidays, todayKey])

  const add = async () => {
    if (!day || !label.trim()) return
    try {
      await createHoliday.mutateAsync({ day, label: label.trim() })
      showToast(t('admin.holidays.added'))
      setDay(''); setLabel('')
    } catch (err: any) {
      showToast(err.message?.includes('duplicate') ? t('admin.holidays.duplicate') : err.message, 'error')
    }
  }

  const remove = async (id: string) => {
    try { await deleteHoliday.mutateAsync(id); showToast(t('admin.holidays.removed')) }
    catch (err: any) { showToast(err.message, 'error') }
  }

  const fmt = (d: any) => new Date(d).toLocaleDateString(i18n.language, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

  if (isLoading) return <PageLoading />

  const Row = ({ h, muted }: any) => (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/40 transition-colors group">
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${muted ? 'bg-muted' : 'bg-amber-500/10'}`}>
        <CalendarOff className={`h-4 w-4 ${muted ? 'text-muted-foreground' : 'text-amber-600'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${muted ? 'text-muted-foreground' : ''}`}>{h.label}</p>
        <p className="text-xs text-muted-foreground capitalize">{fmt(h.day)}</p>
      </div>
      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive" onClick={() => remove(h.id)}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('admin.holidays.title')} description={t('admin.holidays.description')} />

      {/* Add */}
      <Card variant="elevated">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{t('admin.holidays.dateLabel')}</Label>
            <Input type="date" value={day} onChange={(e: any) => setDay(e.target.value)} className="w-full sm:w-44" />
          </div>
          <div className="space-y-1.5 flex-1">
            <Label className="text-xs">{t('admin.holidays.nameLabel')}</Label>
            <Input value={label} onChange={(e: any) => setLabel(e.target.value)} onKeyDown={(e: any) => { if (e.key === 'Enter') add() }} placeholder={t('admin.holidays.namePlaceholder')} />
          </div>
          <Button onClick={add} disabled={!day || !label.trim()} className="gap-2">
            <Plus className="h-4 w-4" /> {t('admin.holidays.addButton')}
          </Button>
        </CardContent>
      </Card>

      {holidays.length === 0 ? (
        <div className="text-center py-16">
          <CalendarDays className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">{t('admin.holidays.empty')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <Card variant="elevated">
              <CardContent className="p-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-1.5">{t('admin.holidays.upcoming')}</h3>
                {upcoming.map((h: any) => <Row key={h.id} h={h} />)}
              </CardContent>
            </Card>
          )}
          {past.length > 0 && (
            <Card variant="elevated">
              <CardContent className="p-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-1.5">{t('admin.holidays.past')}</h3>
                {past.map((h: any) => <Row key={h.id} h={h} muted />)}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
