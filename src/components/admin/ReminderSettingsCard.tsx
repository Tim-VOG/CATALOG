import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { AlarmClock, Save, Loader2 } from 'lucide-react'
import { useAppSettings, useUpdateAppSettings } from '@/hooks/use-settings'
import { useUIStore } from '@/stores/ui-store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

/**
 * Admin control for the equipment return reminders sent by the
 * daily-reminders edge function: how many days before the due date, how
 * many days after it becomes overdue, and whether each is enabled.
 */
export function ReminderSettingsCard() {
  const { t } = useTranslation()
  const { data: settings } = useAppSettings()
  const update = useUpdateAppSettings()
  const showToast = useUIStore((s: any) => s.showToast)

  const [beforeDays, setBeforeDays] = useState('3')
  const [overdueDays, setOverdueDays] = useState('1')
  const [beforeEnabled, setBeforeEnabled] = useState(true)
  const [overdueEnabled, setOverdueEnabled] = useState(true)

  useEffect(() => {
    if (!settings) return
    setBeforeDays(String(settings.reminder_before_days ?? 3))
    setOverdueDays(String(settings.reminder_overdue_days ?? 1))
    setBeforeEnabled(settings.reminder_before_enabled !== false)
    setOverdueEnabled(settings.reminder_overdue_enabled !== false)
  }, [settings])

  const save = () => {
    update.mutate(
      {
        reminder_before_days: Math.max(1, parseInt(beforeDays, 10) || 3),
        reminder_overdue_days: Math.max(1, parseInt(overdueDays, 10) || 1),
        reminder_before_enabled: beforeEnabled,
        reminder_overdue_enabled: overdueEnabled,
      },
      { onSuccess: () => showToast(t('admin.reminderSettings.saved')) },
    )
  }

  return (
    <Card variant="elevated">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <AlarmClock className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">{t('admin.reminderSettings.title')}</h3>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">{t('admin.reminderSettings.subtitle')}</p>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 p-3">
          <div className="flex items-center gap-3">
            <Switch checked={beforeEnabled} onCheckedChange={setBeforeEnabled} />
            <span className="text-sm">{t('admin.reminderSettings.beforeLabel')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Input type="number" min="1" value={beforeDays} disabled={!beforeEnabled}
              onChange={(e: any) => setBeforeDays(e.target.value)} className="w-16 h-8 text-center" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">{t('admin.reminderSettings.daysBefore')}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 p-3">
          <div className="flex items-center gap-3">
            <Switch checked={overdueEnabled} onCheckedChange={setOverdueEnabled} />
            <span className="text-sm">{t('admin.reminderSettings.overdueLabel')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Input type="number" min="1" value={overdueDays} disabled={!overdueEnabled}
              onChange={(e: any) => setOverdueDays(e.target.value)} className="w-16 h-8 text-center" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">{t('admin.reminderSettings.daysAfter')}</span>
          </div>
        </div>

        <div className="flex justify-end">
          <Button size="sm" onClick={save} disabled={update.isPending} className="gap-2">
            {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t('admin.reminderSettings.save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
