import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { format, isThisWeek } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/lib/auth'
import { useItRequests } from '@/hooks/use-it-requests'
import { useMailboxRequests } from '@/hooks/use-mailbox-requests'
import { useOnboardingEmails } from '@/hooks/use-onboarding'
import { PageLoading } from '@/components/common/LoadingSpinner'
import {
  UserPlus, UserMinus, Mail, ChevronRight, CalendarRange, Send, Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const fadeUp = (d = 0) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay: d },
})

function useGreeting() {
  const { t } = useTranslation()
  const h = new Date().getHours()
  if (h < 5) return t('admin.managerDashboard.greetingNight')
  if (h < 12) return t('admin.managerDashboard.greetingMorning')
  if (h < 18) return t('admin.managerDashboard.greetingAfternoon')
  return t('admin.managerDashboard.greetingEvening')
}

export function ManagerDashboardPage() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const greeting = useGreeting()
  const { data: itReqs = [], isLoading } = useItRequests()
  const { data: mailboxReqs = [] } = useMailboxRequests()
  const { data: onboardingEmails = [] } = useOnboardingEmails()

  const stats = useMemo(() => {
    const onboarding = itReqs.filter((r: any) => r.type === 'onboarding')
    const offboarding = itReqs.filter((r: any) => r.type === 'offboarding')
    const sentIds = new Set(onboardingEmails.filter((e: any) => e.status === 'sent').map((e: any) => e.it_request_id))

    const arrivalsThisWeek = onboarding.filter((r: any) => {
      const d = r.data?.first_day || r.data?.start_date
      return d && isThisWeek(new Date(d), { weekStartsOn: 1 })
    })
    const departuresThisWeek = offboarding.filter((r: any) => {
      const d = r.data?.leaving_date
      return d && isThisWeek(new Date(d), { weekStartsOn: 1 })
    })

    return {
      pendingOnboarding: onboarding.filter((r: any) => r.status === 'pending').length,
      pendingOffboarding: offboarding.filter((r: any) => r.status === 'pending').length,
      pendingMailbox: mailboxReqs.filter((r: any) => r.status === 'pending').length,
      welcomePending: onboarding.filter((r: any) => r.status === 'ready' && !sentIds.has(r.id)).length,
      arrivalsThisWeek,
      departuresThisWeek,
    }
  }, [itReqs, mailboxReqs, onboardingEmails])

  if (isLoading) return <PageLoading />

  const firstName = profile?.first_name || t('admin.managerDashboard.fallbackName')
  const totalPending = stats.pendingOnboarding + stats.pendingOffboarding + stats.pendingMailbox
  const businessUnit = profile?.business_unit
  const isManager = profile?.role === 'manager'

  return (
    <div className="pb-12">
      <motion.div {...fadeUp(0)} className="pt-10 pb-8">
        <p className="text-xs text-muted-foreground/80 mb-2">{format(new Date(), 'EEEE d MMMM', { locale: fr })}</p>
        <h1 className="text-3xl font-display font-semibold tracking-tight">{greeting}, {firstName}.</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {totalPending === 0 ? t('admin.managerDashboard.nothingPending') : t('admin.managerDashboard.requestsWaiting', { count: totalPending })}
        </p>
        {isManager && businessUnit && (
          <div className="inline-flex items-center gap-2 mt-4 rounded-full border border-border/50 bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3" />
            <span>{t('admin.managerDashboard.businessUnitShowing')} <span className="font-medium text-foreground">{businessUnit}</span></span>
          </div>
        )}
        {isManager && !businessUnit && (
          <div className="inline-flex items-center gap-2 mt-4 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs text-amber-600">
            <Building2 className="h-3 w-3" />
            <span>{t('admin.managerDashboard.noBusinessUnit')}</span>
          </div>
        )}
      </motion.div>

      <motion.div {...fadeUp(0.05)} className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label={t('admin.managerDashboard.navOnboarding')} value={stats.pendingOnboarding} to="/admin/onboarding/requests" accent="cyan" />
        <StatCard label={t('admin.managerDashboard.navOffboarding')} value={stats.pendingOffboarding} to="/admin/offboarding-requests" accent="rose" />
        <StatCard label={t('admin.managerDashboard.navMailbox')} value={stats.pendingMailbox} to="/admin/mailbox-requests" accent="violet" />
        <StatCard label={t('admin.managerDashboard.welcomeEmailsToSend')} value={stats.welcomePending} to="/admin/onboarding/requests" accent="amber" icon={Send} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div {...fadeUp(0.1)}>
          <WeekList title={t('admin.managerDashboard.arrivalsTitle')} icon={UserPlus} color="text-cyan-500" emptyText={t('admin.managerDashboard.noArrivalsThisWeek')}
            items={stats.arrivalsThisWeek.map((r: any) => ({
              id: r.id,
              name: [r.data?.first_name, r.data?.last_name].filter(Boolean).join(' ') || t('admin.managerDashboard.newHire'),
              date: r.data?.first_day || r.data?.start_date,
              sub: r.data?.company || r.data?.business_unit || '',
              submitter: r.requester_name || r.requester_email || '',
              to: '/admin/onboarding/requests',
            }))} />
        </motion.div>
        <motion.div {...fadeUp(0.15)}>
          <WeekList title={t('admin.managerDashboard.departuresTitle')} icon={UserMinus} color="text-rose-500" emptyText={t('admin.managerDashboard.noDeparturesThisWeek')}
            items={stats.departuresThisWeek.map((r: any) => ({
              id: r.id,
              name: [r.data?.first_name, r.data?.last_name].filter(Boolean).join(' ') || t('admin.managerDashboard.employee'),
              date: r.data?.leaving_date,
              sub: r.data?.business_unit || '',
              submitter: r.requester_name || r.requester_email || '',
              to: '/admin/offboarding-requests',
            }))} />
        </motion.div>
      </div>

      <motion.div {...fadeUp(0.2)} className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-5">
        <QuickLink to="/admin/onboarding/requests" icon={UserPlus} label={t('admin.managerDashboard.navOnboarding')} />
        <QuickLink to="/admin/offboarding-requests" icon={UserMinus} label={t('admin.managerDashboard.navOffboarding')} />
        <QuickLink to="/admin/mailbox-requests" icon={Mail} label={t('admin.managerDashboard.navMailbox')} />
        <QuickLink to="/admin/planning" icon={CalendarRange} label={t('admin.managerDashboard.navPlanning')} />
      </motion.div>
    </div>
  )
}

function StatCard({ label, value, to, accent, icon: Icon }: any) {
  const accentColor: Record<string, string> = {
    cyan: 'text-cyan-500', rose: 'text-rose-500', violet: 'text-violet-500', amber: 'text-amber-500',
  }
  return (
    <Link to={to} className="block">
      <div className="rounded-2xl border border-border/50 bg-card px-5 py-5 hover:border-border transition-colors">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{label}</p>
          {Icon && <Icon className={cn('h-3.5 w-3.5', accentColor[accent])} />}
        </div>
        <p className={cn('mt-2 text-3xl font-display font-semibold tabular-nums', value > 0 ? accentColor[accent] : '')}>{value}</p>
      </div>
    </Link>
  )
}

function WeekList({ title, icon: Icon, color, items, emptyText }: any) {
  const { t } = useTranslation()
  return (
    <div className="rounded-2xl border border-border/50 bg-card">
      <div className="flex items-center gap-2 px-5 pt-5 pb-3">
        <Icon className={cn('h-4 w-4', color)} />
        <h2 className="text-sm font-medium">{title}</h2>
      </div>
      <div className="px-5 pb-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{emptyText}</p>
        ) : (
          items.map((it: any) => (
            <Link key={it.id} to={it.to} className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0 hover:bg-muted/20 -mx-2 px-2 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{it.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {it.sub && <span>{it.sub}</span>}
                  {it.sub && it.submitter && <span className="mx-1.5">·</span>}
                  {it.submitter && <span>{t('admin.managerDashboard.bySubmitter', { name: it.submitter })}</span>}
                </p>
              </div>
              {it.date && <p className="text-xs text-muted-foreground shrink-0">{format(new Date(it.date), 'EEE d MMM', { locale: fr })}</p>}
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

function QuickLink({ to, icon: Icon, label }: any) {
  return (
    <Link to={to} className="rounded-2xl border border-border/50 bg-card p-4 hover:bg-card/70 hover:border-border transition-all">
      <Icon className="h-5 w-5 text-foreground/80 mb-2" />
      <p className="text-sm font-medium">{label}</p>
    </Link>
  )
}
