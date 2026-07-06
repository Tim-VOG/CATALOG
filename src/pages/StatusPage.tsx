import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, AlertTriangle, XCircle, Loader2, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import i18n from '@/lib/i18n'

type Status = 'pending' | 'ok' | 'degraded' | 'down'

interface Check {
  key: string
  label: string
  description: string
  status: Status
  message?: string
  latencyMs?: number
}

const STATUS_STYLES: Record<Status, { color: string; bg: string; border: string; icon: typeof CheckCircle2 }> = {
  pending:  { color: 'text-muted-foreground', bg: 'bg-muted/30', border: 'border-border/50', icon: Loader2 },
  ok:       { color: 'text-emerald-500',      bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: CheckCircle2 },
  degraded: { color: 'text-amber-500',        bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   icon: AlertTriangle },
  down:     { color: 'text-rose-500',         bg: 'bg-rose-500/10',    border: 'border-rose-500/30',    icon: XCircle },
}

const STATUS_LABEL_KEY: Record<Status, string> = {
  pending: 'statusPending',
  ok: 'statusOk',
  degraded: 'statusDegraded',
  down: 'statusDown',
}

const CHECK_LABEL_KEYS: Record<string, { label: string; description: string }> = {
  db:      { label: 'checkDbLabel',      description: 'checkDbDesc' },
  auth:    { label: 'checkAuthLabel',    description: 'checkAuthDesc' },
  storage: { label: 'checkStorageLabel', description: 'checkStorageDesc' },
  edge:    { label: 'checkEdgeLabel',    description: 'checkEdgeDesc' },
}

const initial: Check[] = [
  { key: 'db',        label: 'Database',         description: 'Supabase Postgres reachable from the client', status: 'pending' },
  { key: 'auth',      label: 'Authentication',   description: 'Microsoft SSO + Supabase Auth',               status: 'pending' },
  { key: 'storage',   label: 'File storage',     description: 'Logos, attachments, exports',                 status: 'pending' },
  { key: 'edge',      label: 'Edge functions',   description: 'Transactional emails + daily cron',           status: 'pending' },
]

async function runCheck(key: string): Promise<{ status: Status; message?: string; latencyMs?: number }> {
  const t0 = performance.now()
  try {
    switch (key) {
      case 'db': {
        // categories is small, public-readable taxonomy — quick ping.
        const { error } = await supabase.from('categories').select('id', { count: 'exact', head: true })
        if (error) return { status: 'down', message: error.message, latencyMs: Math.round(performance.now() - t0) }
        return { status: 'ok', latencyMs: Math.round(performance.now() - t0) }
      }
      case 'auth': {
        const { error } = await supabase.auth.getSession()
        if (error) return { status: 'degraded', message: error.message, latencyMs: Math.round(performance.now() - t0) }
        return { status: 'ok', latencyMs: Math.round(performance.now() - t0) }
      }
      case 'storage': {
        const { error } = await supabase.storage.listBuckets()
        if (error) return { status: 'degraded', message: error.message, latencyMs: Math.round(performance.now() - t0) }
        return { status: 'ok', latencyMs: Math.round(performance.now() - t0) }
      }
      case 'edge': {
        // We can't invoke send-email without auth, but reaching the
        // functions origin (CORS preflight) proves the runtime is up.
        const url = (import.meta.env.VITE_SUPABASE_URL as string)?.replace(/\/$/, '') + '/functions/v1/send-email'
        const res = await fetch(url, { method: 'OPTIONS' })
        if (res.status >= 500) return { status: 'down', message: `HTTP ${res.status}`, latencyMs: Math.round(performance.now() - t0) }
        return { status: 'ok', latencyMs: Math.round(performance.now() - t0) }
      }
      default:
        return { status: 'degraded', message: i18n.t('user.statusPage.unknownCheckError', { defaultValue: 'unknown check' }) }
    }
  } catch (err: any) {
    return { status: 'down', message: err?.message || i18n.t('user.statusPage.networkError', { defaultValue: 'network error' }), latencyMs: Math.round(performance.now() - t0) }
  }
}

export function StatusPage() {
  const { t } = useTranslation()
  const [checks, setChecks] = useState<Check[]>(initial)
  const [lastRun, setLastRun] = useState<Date | null>(null)

  const runAll = async () => {
    setChecks((cs: any) => cs.map((c: any) => ({ ...c, status: 'pending' as Status })))
    const results = await Promise.all(initial.map((c: any) => runCheck(c.key).then((r: any) => ({ ...c, ...r }))))
    setChecks(results)
    setLastRun(new Date())
  }

  useEffect(() => {
    runAll()
    const id = setInterval(runAll, 60_000) // refresh every minute
    return () => clearInterval(id)
  }, [])

  const allPending = checks.every((c: any) => c.status === 'pending')
  const overall: Status = allPending ? 'pending'
    : checks.some((c: any) => c.status === 'down') ? 'down'
    : checks.some((c: any) => c.status === 'degraded' || c.status === 'pending') ? 'degraded'
    : 'ok'

  const heroStyle = (STATUS_STYLES as Record<string, any>)[overall]
  const HeroIcon = heroStyle.icon

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('user.statusPage.backToHub')}
        </Link>

        {/* Hero status banner */}
        <div className={cn(
          'rounded-3xl border p-6 mb-5 flex items-center gap-4',
          heroStyle.bg,
          heroStyle.border,
        )}>
          <div className={cn(
            'h-12 w-12 rounded-2xl flex items-center justify-center bg-background',
            heroStyle.color,
          )}>
            <HeroIcon className={cn('h-6 w-6', overall === 'pending' && 'animate-spin')} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-display font-bold tracking-tight">
              {overall === 'ok' && t('user.statusPage.statusTitleOk')}
              {overall === 'degraded' && t('user.statusPage.statusTitleDegraded')}
              {overall === 'down' && t('user.statusPage.statusTitleDown')}
              {overall === 'pending' && t('user.statusPage.statusTitleChecking')}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {lastRun
                ? t('user.statusPage.lastChecked', { time: lastRun.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) })
                : t('user.statusPage.runningChecks')}
              {' '}{t('user.statusPage.autoRefresh')}
            </p>
          </div>
        </div>

        {/* Individual checks */}
        <div className="space-y-2">
          {checks.map((c: any) => {
            const style = (STATUS_STYLES as Record<string, any>)[c.status]
            const Icon = style.icon
            const meta = CHECK_LABEL_KEYS[c.key]
            return (
              <div key={c.key} className="rounded-xl border border-border/50 bg-card/40 p-4 flex items-center gap-3">
                <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', style.bg)}>
                  <Icon className={cn('h-4 w-4', style.color, c.status === 'pending' && 'animate-spin')} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{meta ? t(`user.statusPage.${meta.label}`) : c.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{meta ? t(`user.statusPage.${meta.description}`) : c.description}</p>
                  {c.message && <p className="text-[11px] text-rose-500 truncate mt-0.5">{c.message}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className={cn('text-xs font-medium', style.color)}>{t(`user.statusPage.${STATUS_LABEL_KEY[c.status as Status]}`)}</p>
                  {c.latencyMs != null && (
                    <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">{t('user.statusPage.latencyMs', { ms: c.latencyMs })}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-[10px] text-muted-foreground/60 text-center mt-6">
          {t('user.statusPage.footer')}
        </p>
      </div>
    </div>
  )
}
