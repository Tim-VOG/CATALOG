import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useMailboxRequests } from '@/hooks/use-mailbox-requests'
import { useAppSettings } from '@/hooks/use-settings'
import {
  Search, Mail, ArrowLeft, Megaphone, Users, ChevronRight, Building2, Calendar,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AccessGrantedEmailEditor, extractAccessEmails } from '@/components/admin/AccessGrantedEmailEditor'

const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR') : null

export function AdminMailboxAnnouncementPage() {
  const { t } = useTranslation()
  const { data: requests = [], isLoading } = useMailboxRequests()
  const { data: settings } = useAppSettings()
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<any>(null)

  const selected = useMemo(
    () => requests.find((r: any) => r.id === selectedId) || null,
    [requests, selectedId]
  )

  // Only requests that actually have a mailbox to announce are useful here.
  const announceable = useMemo(
    () => requests.filter((r: any) => r.email_to_create),
    [requests]
  )

  const filtered = useMemo(() => {
    if (!search.trim()) return announceable
    const q = search.toLowerCase()
    return announceable.filter(
      (r: any) =>
        r.project_name?.toLowerCase().includes(q) ||
        r.email_to_create?.toLowerCase().includes(q) ||
        r.agency?.toLowerCase().includes(q) ||
        r.who_needs_access?.toLowerCase().includes(q)
    )
  }, [announceable, search])

  if (isLoading) return <PageLoading />

  // ── Detail: compose the announcement for one mailbox ──
  if (selected) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)} className="gap-1.5 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('admin.mailboxAnnouncement.backToList')}
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-display font-bold truncate">{selected.project_name}</h2>
            <p className="text-xs text-muted-foreground truncate">{selected.email_to_create}</p>
          </div>
        </div>

        <AccessGrantedEmailEditor
          req={selected}
          settings={settings}
          onClose={() => setSelectedId(null)}
          onSent={() => setSelectedId(null)}
        />
      </div>
    )
  }

  // ── List: pick a mailbox to announce ──
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t('admin.mailboxAnnouncement.title')}
        description={t('admin.mailboxAnnouncement.description')}
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('admin.mailboxAnnouncement.searchPlaceholder')}
          className="pl-9"
          value={search}
          onChange={(e: any) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Megaphone className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">{t('admin.mailboxAnnouncement.noMailboxes')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((req: any) => {
            const count = extractAccessEmails(req.who_needs_access).length
            return (
              <Card
                key={req.id}
                variant="elevated"
                className="hover:shadow-card-hover transition-all cursor-pointer group"
                onClick={() => setSelectedId(req.id)}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Mail className="h-5 w-5 text-emerald-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{req.project_name}</span>
                        {req.agency && <Badge variant="secondary" className="text-[10px] gap-1"><Building2 className="h-2.5 w-2.5" />{req.agency}</Badge>}
                        <Badge
                          variant="outline"
                          className={count > 0
                            ? 'text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                            : 'text-[10px] gap-1 bg-muted text-muted-foreground'}
                        >
                          <Users className="h-2.5 w-2.5" />
                          {t('admin.mailboxAnnouncement.peopleCount', { count })}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {req.email_to_create}</span>
                        {req.creation_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {fmtDate(req.creation_date)}</span>}
                      </div>
                    </div>

                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
