import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, AlertTriangle, XCircle, Loader2, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

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

const STATUS_LABEL: Record<Status, string> = {
  pending: 'Checking…',
  ok: 'Operational',
  degraded: 'Degraded',
  down: 'Down',
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
        return { status: 'degraded', message: 'unknown check' }
    }
  } catch (err: any) {
    return { status: 'down', message: err?.message || 'network error', latencyMs: Math.round(performance.now() - t0) }
  }
}

export function StatusPage() {
  const [checks, setChecks] = useState<Check[]>(initial)
  const [lastRun, setLastRun] = useState<Date | null>(null)

  const runAll = async () => {
    setChecks((cs) => cs.map((c: any) => ({ ...c, status: 'pending' as Status })))
    const results = await Promise.all(initial.map((c: any) => runCheck(c.key).then((r) => ({ ...c, ...r }))))
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

  const heroStyle = STATUS_STYLES[overall]
  const HeroIcon = heroStyle.icon

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to VO Hub
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
              {overall === 'ok' && 'All systems operational'}
              {overall === 'degraded' && 'Some services degraded'}
              {overall === 'down' && 'Major outage'}
              {overall === 'pending' && 'Checking status…'}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {lastRun
                ? `Last checked ${lastRun.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                : 'Running checks…'}
              {' '}— auto-refresh every 60 s.
            </p>
          </div>
        </div>

        {/* Individual checks */}
        <div className="space-y-2">
          {checks.map((c: any) => {
            const style = STATUS_STYLES[c.status]
            const Icon = style.icon
            return (
              <div key={c.key} className="rounded-xl border border-border/50 bg-card/40 p-4 flex items-center gap-3">
                <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', style.bg)}>
                  <Icon className={cn('h-4 w-4', style.color, c.status === 'pending' && 'animate-spin')} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{c.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.description}</p>
                  {c.message && <p className="text-[11px] text-rose-500 truncate mt-0.5">{c.message}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className={cn('text-xs font-medium', style.color)}>{STATUS_LABEL[c.status]}</p>
                  {c.latencyMs != null && (
                    <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">{c.latencyMs} ms</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-[10px] text-muted-foreground/60 text-center mt-6">
          Public status page · VO Hub · No login required
        </p>
      </div>
    </div>
  )
}
