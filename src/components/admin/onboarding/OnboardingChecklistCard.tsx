import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useUpdateItRequest } from '@/hooks/use-it-requests'
import { useUIStore } from '@/stores/ui-store'
import { ListChecks, Plus, X, GripVertical, Check } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Stable-ish id without Date.now/Math.random (kept deterministic per label+index).
const mkId = (label: string, i: number) => `step-${i}-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 20)}`

export function OnboardingChecklistCard({ req }: any) {
  const { t } = useTranslation()
  const updateRequest = useUpdateItRequest()
  const showToast = useUIStore((s: any) => s.showToast)

  const defaults = useMemo(() => [
    t('admin.onboardingChecklist.stepAd'),
    t('admin.onboardingChecklist.stepLicense'),
    t('admin.onboardingChecklist.stepPc'),
  ].map((label: string, i: number) => ({ id: mkId(label, i), label, done: false })), [t])

  const [items, setItems] = useState<any[]>(() =>
    Array.isArray(req.checklist) && req.checklist.length ? req.checklist : defaults
  )
  const [newLabel, setNewLabel] = useState('')

  // Re-seed when switching to a different request.
  useEffect(() => {
    setItems(Array.isArray(req.checklist) && req.checklist.length ? req.checklist : defaults)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req.id])

  const persist = async (next: any[]) => {
    setItems(next)
    try {
      await updateRequest.mutateAsync({ id: req.id, checklist: next })
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  const toggle = (id: string) => persist(items.map((it) => it.id === id ? { ...it, done: !it.done } : it))
  const remove = (id: string) => persist(items.filter((it) => it.id !== id))
  const rename = (id: string, label: string) => setItems(items.map((it) => it.id === id ? { ...it, label } : it))
  const add = () => {
    const label = newLabel.trim()
    if (!label) return
    persist([...items, { id: mkId(label, items.length), label, done: false }])
    setNewLabel('')
  }

  const doneCount = items.filter((it) => it.done).length
  const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0
  const allDone = items.length > 0 && doneCount === items.length

  return (
    <Card variant="elevated" className={cn(allDone && 'border-emerald-500/30')}>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', allDone ? 'bg-emerald-500/10' : 'bg-primary/10')}>
            <ListChecks className={cn('h-4 w-4', allDone ? 'text-emerald-500' : 'text-primary')} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm">{t('admin.onboardingChecklist.title')}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('admin.onboardingChecklist.progress', { done: doneCount, total: items.length })}
            </p>
          </div>
          <span className={cn('text-sm font-bold', allDone ? 'text-emerald-600' : 'text-primary')}>{pct}%</span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className={cn('h-full rounded-full transition-all', allDone ? 'bg-emerald-500' : 'bg-primary')} style={{ width: `${pct}%` }} />
        </div>

        {/* Steps */}
        <div className="space-y-1.5">
          {items.map((it) => (
            <div key={it.id} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/40 transition-colors">
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
              <button
                type="button"
                onClick={() => toggle(it.id)}
                className={cn('h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-colors',
                  it.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-muted-foreground/30 hover:border-primary')}
              >
                {it.done && <Check className="h-3.5 w-3.5" />}
              </button>
              <input
                value={it.label}
                onChange={(e: any) => rename(it.id, e.target.value)}
                onBlur={() => persist(items)}
                className={cn('flex-1 bg-transparent text-sm outline-none', it.done && 'line-through text-muted-foreground')}
              />
              <button type="button" onClick={() => remove(it.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Add step */}
        <div className="flex items-center gap-2 pt-1">
          <Input
            value={newLabel}
            onChange={(e: any) => setNewLabel(e.target.value)}
            onKeyDown={(e: any) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
            placeholder={t('admin.onboardingChecklist.addPlaceholder')}
            className="h-8 text-sm"
          />
          <Button variant="outline" size="sm" onClick={add} disabled={!newLabel.trim()} className="gap-1.5 text-xs shrink-0">
            <Plus className="h-3.5 w-3.5" /> {t('admin.onboardingChecklist.addButton')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
