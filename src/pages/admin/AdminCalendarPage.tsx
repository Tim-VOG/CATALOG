import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useItRequests } from '@/hooks/use-it-requests'
import { useOffboardingProcesses } from '@/hooks/use-offboarding'
import { useHolidays } from '@/hooks/use-holidays'
import { ChevronLeft, ChevronRight, UserPlus, UserMinus, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { cn } from '@/lib/utils'

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const fullName = (...parts: any[]) => parts.filter(Boolean).join(' ').trim()

export function AdminCalendarPage() {
  const { t, i18n } = useTranslation()
  const { data: itRequests = [] } = useItRequests()
  const { data: offboardings = [] } = useOffboardingProcesses()
  const { data: holidays = [] } = useHolidays()

  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })

  // Map "YYYY-MM-DD" → events for that day.
  const eventsByDay = useMemo(() => {
    const map: Record<string, any[]> = {}
    const push = (day: any, ev: any) => { if (!day) return; const k = String(day).slice(0, 10); (map[k] || (map[k] = [])).push(ev) }

    for (const r of itRequests as any[]) {
      if (r.type !== 'onboarding') continue
      const d = r.data || {}
      push(d.first_day, { kind: 'arrival', name: fullName(d.first_name, d.last_name) || t('admin.calendar.newHire'), bu: d.company || d.business_unit || '' })
    }
    for (const o of offboardings as any[]) {
      const day = o.departure_date || o.last_day
      push(day, { kind: 'departure', name: o.employee_name || fullName(o.first_name, o.last_name) || t('admin.calendar.leaver'), bu: o.company || o.business_unit || '' })
    }
    return map
  }, [itRequests, offboardings, t])

  const holidaySet = useMemo(() => new Set((holidays as any[]).map((h: any) => String(h.day).slice(0, 10))), [holidays])
  const holidayLabel = (k: string) => (holidays as any[]).find((h: any) => String(h.day).slice(0, 10) === k)?.label

  // Build the month grid (Mon-first).
  const weeks = useMemo(() => {
    const year = cursor.getFullYear(), month = cursor.getMonth()
    const first = new Date(year, month, 1)
    const startOffset = (first.getDay() + 6) % 7 // Monday = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: any[] = []
    for (let i = 0; i < startOffset; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
    while (cells.length % 7 !== 0) cells.push(null)
    const rows: any[] = []
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
    return rows
  }, [cursor])

  const monthLabel = cursor.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })
  const todayKey = ymd(new Date())
  const weekdays = useMemo(() => {
    const base = new Date(2024, 0, 1) // a Monday
    return Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(i18n.language, { weekday: 'short' }))
      .map((s) => s.replace('.', ''))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language])

  const monthArrivals = Object.entries(eventsByDay).filter(([k]) => k.slice(0, 7) === ymd(cursor).slice(0, 7)).flatMap(([, evs]) => evs).filter((e: any) => e.kind === 'arrival').length
  const monthDepartures = Object.entries(eventsByDay).filter(([k]) => k.slice(0, 7) === ymd(cursor).slice(0, 7)).flatMap(([, evs]) => evs).filter((e: any) => e.kind === 'departure').length

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('admin.calendar.title')} description={t('admin.calendar.description')} />

      <Card variant="elevated">
        <CardContent className="p-4 sm:p-5">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-sm font-bold capitalize min-w-[140px] text-center">{monthLabel}</h2>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-xs ml-1" onClick={() => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)) }}>
                {t('admin.calendar.today')}
              </Button>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> {t('admin.calendar.arrivals', { count: monthArrivals })}</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> {t('admin.calendar.departures', { count: monthDepartures })}</span>
            </div>
          </div>

          {/* Weekday header */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {weekdays.map((w) => (
              <div key={w} className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium text-center py-1 capitalize">{w}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-1">
            {weeks.flat().map((day: Date | null, idx: number) => {
              if (!day) return <div key={idx} className="min-h-[84px] rounded-lg bg-muted/20" />
              const key = ymd(day)
              const evs = eventsByDay[key] || []
              const isToday = key === todayKey
              const isHoliday = holidaySet.has(key)
              return (
                <div key={idx} className={cn('min-h-[84px] rounded-lg border p-1.5 flex flex-col gap-1',
                  isToday ? 'border-primary bg-primary/5' : 'border-border/50',
                  isHoliday && 'bg-amber-500/5 border-amber-500/20')}>
                  <div className="flex items-center justify-between">
                    <span className={cn('text-xs font-medium', isToday ? 'text-primary' : 'text-muted-foreground')}>{day.getDate()}</span>
                    {isHoliday && <span className="text-[9px] text-amber-600 truncate max-w-[60px]" title={holidayLabel(key)}>{holidayLabel(key)}</span>}
                  </div>
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    {evs.slice(0, 3).map((e: any, i: number) => (
                      <div key={i} className={cn('text-[10px] rounded px-1 py-0.5 truncate flex items-center gap-1',
                        e.kind === 'arrival' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-rose-500/10 text-rose-700')}
                        title={`${e.name}${e.bu ? ' · ' + e.bu : ''}`}>
                        {e.kind === 'arrival' ? <UserPlus className="h-2.5 w-2.5 shrink-0" /> : <UserMinus className="h-2.5 w-2.5 shrink-0" />}
                        <span className="truncate">{e.name}</span>
                      </div>
                    ))}
                    {evs.length > 3 && <span className="text-[9px] text-muted-foreground pl-1">+{evs.length - 3}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming list */}
      {(() => {
        const upcoming = Object.entries(eventsByDay)
          .filter(([k]) => k >= todayKey)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(0, 8)
        if (!upcoming.length) return null
        return (
          <Card variant="elevated">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold mb-1">
                <CalendarDays className="h-4 w-4 text-primary" /> {t('admin.calendar.upcoming')}
              </div>
              {upcoming.map(([k, evs]) => (
                <div key={k} className="flex items-start gap-3 text-sm">
                  <span className="text-xs text-muted-foreground w-24 shrink-0 pt-0.5">{new Date(k).toLocaleDateString(i18n.language, { weekday: 'short', day: '2-digit', month: 'short' })}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(evs as any[]).map((e: any, i: number) => (
                      <Badge key={i} variant="outline" className={cn('text-[10px] gap-1', e.kind === 'arrival' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-rose-500/10 text-rose-600 border-rose-500/30')}>
                        {e.kind === 'arrival' ? <UserPlus className="h-2.5 w-2.5" /> : <UserMinus className="h-2.5 w-2.5" />}
                        {e.name}{e.bu ? ` · ${e.bu}` : ''}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )
      })()}
    </div>
  )
}
