import { useState } from 'react'
import { differenceInCalendarDays, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useOverdueScans } from '@/hooks/use-qr-codes'
import { useUIStore } from '@/stores/ui-store'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlarmClock, CheckCircle2, Mail } from 'lucide-react'
import { sendOverdueReminder } from '@/services/return-reminder-service'

export function AdminOverduePage() {
  const showToast = useUIStore((s: any) => s.showToast)
  const { data: overdue = [], isLoading } = useOverdueScans()
  // Track which rows we've just relaunched so the button reflects it.
  const [sending, setSending] = useState<string | null>(null)
  const [reminded, setReminded] = useState<Record<string, boolean>>({})

  const handleRemind = async (item: any) => {
    if (!item.user_email) {
      showToast('No email on file for this holder', 'error')
      return
    }
    setSending(item.id)
    try {
      await sendOverdueReminder({
        user_email: item.user_email,
        user_name: item.user_name,
        product_name: item.product_name,
        expected_return_date: item.expected_return_date,
      })
      setReminded((prev) => ({ ...prev, [item.id]: true }))
      showToast(`Reminder sent to ${item.user_name || item.user_email}`, 'success')
    } catch (err: any) {
      showToast(err?.message || 'Could not send reminder', 'error')
    } finally {
      setSending(null)
    }
  }

  if (isLoading) return <PageLoading />

  const today = new Date()

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Overdue equipment"
        section="REQUESTS"
        description={`${overdue.length} item${overdue.length !== 1 ? 's' : ''} past the expected return date.`}
      />

      <div className="border border-border/50 rounded-xl overflow-hidden bg-card">
        {overdue.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mb-2 opacity-40 text-emerald-500" />
            <p className="text-sm font-medium text-foreground">Nothing overdue</p>
            <p className="text-xs mt-1">Every loan is within its return date.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {overdue.map((item: any) => {
              const due = item.expected_return_date ? new Date(item.expected_return_date) : null
              const daysLate = due ? differenceInCalendarDays(today, due) : 0
              const wasReminded = reminded[item.id]
              return (
                <div key={item.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20">
                  <div className="h-9 w-9 rounded-lg bg-rose-500/12 border border-rose-500/30 flex items-center justify-center shrink-0">
                    <AlarmClock className="h-4 w-4 text-rose-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{item.product_name || item.qr_code}</p>
                      {item.qr_code && <span className="text-[11px] text-muted-foreground/70 font-mono">{item.qr_code}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      Held by {item.user_name || item.user_email || 'unknown'}
                      {item.user_email && item.user_name && (
                        <span className="text-muted-foreground/60"> · {item.user_email}</span>
                      )}
                    </p>
                    {due && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Due {format(due, 'd MMM yyyy', { locale: fr })}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                    <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-500 border-rose-500/30">
                      {daysLate} day{daysLate !== 1 ? 's' : ''} late
                    </Badge>
                    <Button
                      size="sm"
                      variant={wasReminded ? 'ghost' : 'outline'}
                      className="gap-1.5 text-xs h-7"
                      onClick={() => handleRemind(item)}
                      disabled={sending === item.id || !item.user_email}
                    >
                      {wasReminded ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Mail className="h-3 w-3" />}
                      {wasReminded ? 'Reminded' : sending === item.id ? 'Sending…' : 'Remind'}
                    </Button>
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
