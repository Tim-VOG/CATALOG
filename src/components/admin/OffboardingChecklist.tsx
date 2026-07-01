import { useMemo, useState, useEffect } from 'react'
import { useOffboardingFormFields } from '@/hooks/use-offboarding'
import { useUpdateItRequest } from '@/hooks/use-it-requests'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ListChecks } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEP_LABELS: Record<string, string> = {
  general: 'General',
  access: 'Access revocation',
  equipment: 'Equipment recovery',
  data: 'Data & handover',
}

/**
 * Interactive offboarding checklist. Reads the checkbox tasks seeded
 * in offboarding_form_fields, tracks their done/undone state in the
 * request's data.checklist map, and shows progress. Each toggle
 * persists immediately.
 */
export function OffboardingChecklist({ req }: { req: any }) {
  const { data: fields = [] } = useOffboardingFormFields()
  const updateRequest = useUpdateItRequest()

  // Local mirror so toggles feel instant; seeded from the request.
  const [checked, setChecked] = useState<Record<string, boolean>>(req?.data?.checklist || {})
  useEffect(() => { setChecked(req?.data?.checklist || {}) }, [req?.id])

  const tasks = useMemo(
    () => (fields as any[]).filter((f) => f.field_type === 'checkbox' && f.is_active),
    [fields],
  )

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {}
    for (const t of tasks) {
      const step = t.step || 'general'
      ;(g[step] || (g[step] = [])).push(t)
    }
    return g
  }, [tasks])

  const doneCount = tasks.filter((t) => checked[t.field_key]).length
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0

  const toggle = (key: string, value: boolean) => {
    const next = { ...checked, [key]: value }
    setChecked(next)
    updateRequest.mutate({
      id: req.id,
      data: { ...(req.data || {}), checklist: next },
    } as any)
  }

  if (!tasks.length) return null

  return (
    <Card variant="elevated">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold">Offboarding checklist</h4>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">{doneCount}/{tasks.length} · {pct}%</span>
        </div>

        <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden mb-4">
          <div className={cn('h-full rounded-full transition-all', pct === 100 ? 'bg-emerald-500' : 'bg-primary')} style={{ width: `${pct}%` }} />
        </div>

        <div className="space-y-4">
          {Object.entries(grouped).map(([step, items]) => (
            <div key={step}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1.5">
                {STEP_LABELS[step] || step}
              </p>
              <div className="space-y-1">
                {items.map((t) => {
                  const isDone = !!checked[t.field_key]
                  return (
                    <label key={t.id} className="flex items-start gap-2.5 py-1.5 px-2 -mx-2 rounded-lg hover:bg-muted/20 cursor-pointer">
                      <Checkbox checked={isDone} onCheckedChange={(v: boolean) => toggle(t.field_key, v)} className="mt-0.5" />
                      <div className="min-w-0">
                        <p className={cn('text-sm', isDone && 'line-through text-muted-foreground')}>{t.label}</p>
                        {t.help_text && <p className="text-[11px] text-muted-foreground/70">{t.help_text}</p>}
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
