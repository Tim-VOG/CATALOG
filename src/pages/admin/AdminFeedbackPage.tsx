import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import { useFeedback, useUpdateFeedbackStatus, useDeleteFeedback } from '@/hooks/use-feedback'
import { useUIStore } from '@/stores/ui-store'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Lightbulb, Bug, MessageCircle, Check, Trash2, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

const KIND_META: Record<string, { icon: any; cls: string }> = {
  idea: { icon: Lightbulb, cls: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
  bug: { icon: Bug, cls: 'bg-rose-500/15 text-rose-600 border-rose-500/30' },
  other: { icon: MessageCircle, cls: 'bg-blue-500/15 text-blue-600 border-blue-500/30' },
}

export function AdminFeedbackPage() {
  const { t } = useTranslation()
  const showToast = useUIStore((s: any) => s.showToast)
  const { data: items = [], isLoading } = useFeedback()
  const updateStatus = useUpdateFeedbackStatus()
  const del = useDeleteFeedback()
  const [filter, setFilter] = useState<'all' | 'new' | 'done'>('all')

  if (isLoading) return <PageLoading />

  const newCount = items.filter((i: any) => i.status === 'new').length
  const filtered = items.filter((i: any) =>
    filter === 'all' ? true : filter === 'new' ? i.status === 'new' : i.status === 'done',
  )

  const markSeenIfNew = (item: any) => {
    if (item.status === 'new') updateStatus.mutate({ id: item.id, status: 'seen' })
  }

  const handleDone = (item: any) => updateStatus.mutate({ id: item.id, status: 'done' })
  const handleDelete = (item: any) => {
    if (!confirm(t('admin.feedback.confirmDelete'))) return
    del.mutate(item.id, { onSuccess: () => showToast(t('admin.feedback.deleted')) })
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title={t('admin.feedback.title')}
        section={t('admin.eyebrow.overview')}
        description={t('admin.feedback.description', { count: items.length })}
      />

      <div className="flex flex-wrap gap-1">
        {(['all', 'new', 'done'] as const).map((f) => (
          <Button key={f} variant={filter === f ? 'secondary' : 'ghost'} size="sm" className="text-xs h-8 gap-1.5" onClick={() => setFilter(f)}>
            {t(`admin.feedback.filter_${f}`)}
            {f === 'new' && newCount > 0 && <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5">{newCount}</Badge>}
          </Button>
        ))}
      </div>

      <div className="border border-border/50 rounded-xl overflow-hidden bg-card">
        {filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-muted-foreground">
            <Inbox className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-sm">{t('admin.feedback.empty')}</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {filtered.map((item: any) => {
              const meta = KIND_META[item.kind] || KIND_META.other
              const Icon = meta.icon
              return (
                <div
                  key={item.id}
                  className={cn('flex items-start gap-3 px-4 py-3.5 hover:bg-muted/20', item.status === 'new' && 'bg-primary/[0.03]')}
                  onMouseEnter={() => markSeenIfNew(item)}
                >
                  <div className={cn('mt-0.5 h-9 w-9 rounded-lg border flex items-center justify-center shrink-0', meta.cls)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground whitespace-pre-wrap break-words">{item.message}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground/80">{item.user_name || item.user_email || t('admin.feedback.anonymous')}</span>
                      {item.page && <span className="font-mono">{item.page}</span>}
                      <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: fr })}</span>
                      {item.status === 'new' && <Badge className="bg-primary/15 text-primary text-[10px]">{t('admin.feedback.statusNew')}</Badge>}
                      {item.status === 'done' && <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">{t('admin.feedback.statusDone')}</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.status !== 'done' && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-emerald-600" title={t('admin.feedback.markDone')} onClick={() => handleDone(item)}>
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" title={t('admin.feedback.delete')} onClick={() => handleDelete(item)}>
                      <Trash2 className="h-4 w-4" />
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
