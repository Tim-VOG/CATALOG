import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getSystemHealth, exportConfig } from '@/lib/api/system-health'
import { useUIStore } from '@/stores/ui-store'
import { useAuth } from '@/lib/auth'
import { sendEmail } from '@/lib/api/send-email'
import { wrapEmailHtml, getEmailBranding } from '@/lib/email-html'
import {
  Activity, Database, Zap, Mail, AlertTriangle, CheckCircle, Bell, Download, RefreshCw, Loader2, Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { cn } from '@/lib/utils'

const EMAIL_DAY_CAP = 1000 // admin cap (mirrors the send-email edge function)

const fmtAgo = (d: any, t: any) => {
  if (!d) return t('admin.systemHealth.never')
  const mins = Math.round((Date.now() - new Date(d).getTime()) / 60000)
  if (mins < 1) return t('admin.systemHealth.justNow')
  if (mins < 60) return t('admin.systemHealth.minsAgo', { count: mins })
  const hours = Math.round(mins / 60)
  if (hours < 24) return t('admin.systemHealth.hoursAgo', { count: hours })
  return t('admin.systemHealth.daysAgo', { count: Math.round(hours / 24) })
}

export function AdminSystemHealthPage() {
  const { t } = useTranslation()
  const showToast = useUIStore((s: any) => s.showToast)
  const { profile, user } = useAuth()
  const { data: health, isLoading, refetch, isFetching } = useQuery({ queryKey: ['system-health'], queryFn: getSystemHealth, refetchInterval: 60000 })
  const [exporting, setExporting] = useState(false)
  const [testTo, setTestTo] = useState<string>(() => (profile as any)?.email || user?.email || '')
  const [testing, setTesting] = useState(false)

  const handleSendTest = async () => {
    const to = testTo.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) { showToast(t('admin.systemHealth.testInvalid'), 'error'); return }
    setTesting(true)
    try {
      const branding = await getEmailBranding()
      const when = new Date().toLocaleString('fr-FR')
      const body = wrapEmailHtml(
        `<p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#0a2540;">${t('admin.systemHealth.testEmailHeading')} &#9989;</p>` +
        `<p style="margin:0 0 12px;">${t('admin.systemHealth.testEmailBody')}</p>` +
        `<p style="margin:0;color:#8898aa;font-size:13px;">${when}</p>`,
        { ...branding, raw: true },
      )
      const res = await sendEmail({ to, subject: t('admin.systemHealth.testEmailSubject'), body, isHtml: true }, { templateKey: 'test' })
      if (res.success) showToast(t('admin.systemHealth.testSent', { email: to }))
      else showToast(res.error || t('admin.systemHealth.testFailed'), 'error')
    } catch (err: any) {
      showToast(err.message || t('admin.systemHealth.testFailed'), 'error')
    } finally {
      setTesting(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const cfg = await exportConfig()
      const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `vo-hub-config-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(a.href)
      showToast(t('admin.systemHealth.exportDone'))
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setExporting(false)
    }
  }

  if (isLoading) return <PageLoading />

  const emailPct = Math.min(100, Math.round(((health?.emailDay || 0) / EMAIL_DAY_CAP) * 100))
  const cards = [
    {
      key: 'db', label: t('admin.systemHealth.database'), icon: Database,
      ok: health?.dbOk, value: health?.dbOk ? t('admin.systemHealth.reachable') : t('admin.systemHealth.unreachable'),
    },
    {
      key: 'reminders', label: t('admin.systemHealth.lastReminder'), icon: Bell,
      ok: !!health?.lastReminderAt, value: fmtAgo(health?.lastReminderAt, t),
    },
    {
      key: 'failures', label: t('admin.systemHealth.emailFailures24h'), icon: AlertTriangle,
      ok: (health?.emailFailed24h || 0) === 0, value: String(health?.emailFailed24h || 0),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <AdminPageHeader title={t('admin.systemHealth.title')} description={t('admin.systemHealth.description')} />
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs shrink-0 mt-1" onClick={() => refetch()}>
          <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} /> {t('admin.systemHealth.refresh')}
        </Button>
      </div>

      {/* Test email — send a real email to check delivery works */}
      <Card variant="elevated" className="border-primary/20">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Send className="h-4 w-4 text-primary" /> {t('admin.systemHealth.testTitle')}</h3>
              <p className="text-xs text-muted-foreground mt-1">{t('admin.systemHealth.testDesc')}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Input
                type="email"
                value={testTo}
                onChange={(e: any) => setTestTo(e.target.value)}
                placeholder="you@vo-group.be"
                className="w-56"
              />
              <Button onClick={handleSendTest} disabled={testing || !testTo.trim()} className="gap-2 shrink-0">
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {t('admin.systemHealth.testSend')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status cards */}
      <div className="grid sm:grid-cols-3 gap-3">
        {cards.map((c) => (
          <Card key={c.key} variant="elevated" className={cn(!c.ok && 'border-amber-500/30')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', c.ok ? 'bg-emerald-500/10' : 'bg-amber-500/10')}>
                  <c.icon className={cn('h-4 w-4', c.ok ? 'text-emerald-600' : 'text-amber-600')} />
                </div>
                {c.ok ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
              </div>
              <div className="text-lg font-bold">{c.value}</div>
              <div className="text-xs text-muted-foreground">{c.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Email quota */}
      <Card variant="elevated">
        <CardContent className="p-5 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> {t('admin.systemHealth.emailQuota')}</h3>
            <span className="text-xs text-muted-foreground">{health?.emailDay || 0} / {EMAIL_DAY_CAP} {t('admin.systemHealth.perDay')}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className={cn('h-full rounded-full', emailPct > 80 ? 'bg-red-500' : emailPct > 50 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${emailPct}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">{t('admin.systemHealth.emailHourNote', { count: health?.emailHour || 0 })}</p>
        </CardContent>
      </Card>

      {/* Edge functions */}
      <Card variant="elevated">
        <CardContent className="p-5 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> {t('admin.systemHealth.edgeFunctions')}</h3>
          {(!health?.functions || health.functions.length === 0) ? (
            <p className="text-sm text-muted-foreground">{t('admin.systemHealth.noFunctionData')}</p>
          ) : (
            <div className="space-y-1.5">
              {health.functions.sort((a: any, b: any) => (b.last > a.last ? 1 : -1)).map((f: any) => (
                <div key={f.name} className="flex items-center gap-3 text-sm py-1.5 border-b border-border/40 last:border-0">
                  <Activity className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="font-mono text-xs flex-1">{f.name}</span>
                  <Badge variant="outline" className="text-[10px]">{t('admin.systemHealth.calls24h', { count: f.count24h })}</Badge>
                  <span className="text-xs text-muted-foreground w-24 text-right">{fmtAgo(f.last, t)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* F3 — Config export */}
      <Card variant="elevated" className="border-primary/20">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Download className="h-4 w-4 text-primary" /> {t('admin.systemHealth.exportTitle')}</h3>
            <p className="text-xs text-muted-foreground mt-1">{t('admin.systemHealth.exportDesc')}</p>
          </div>
          <Button onClick={handleExport} disabled={exporting} className="gap-2 shrink-0">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {t('admin.systemHealth.exportButton')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
