import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useHasModuleAccess } from '@/hooks/use-has-module-access'
import { useAppSettings } from '@/hooks/use-settings'
import { useMyLoanRequests } from '@/hooks/use-loan-requests'
import { useMyItRequests } from '@/hooks/use-it-requests'
import { useMyMailboxRequests } from '@/hooks/use-mailbox-requests'
import {
  Package, ArrowRight, Mail, QrCode, Inbox, UserPlus, UserMinus,
  Loader2, CheckCircle, Sparkles, Clock,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DynamicsItem } from '@/components/ui/motion'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function getDayLabel() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}

function StatCard({ icon: Icon, label, value, color, to  }: any) {
  const card = (
    <Card variant="elevated" className={cn('h-full transition-all', to && 'hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer')}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', color.bg)}>
          <Icon className={cn('h-5 w-5', color.fg)} />
        </div>
        <div className="min-w-0">
          <p className={cn('text-2xl font-display font-bold leading-none', color.fg)}>{value}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
  return to ? <Link to={to} className="block h-full">{card}</Link> : card
}

function HubCard({ to, icon: Icon, title, description, color = 'primary', badge, buttonLabel  }: any) {
  const colorMap = {
    primary: { iconBg: 'bg-gradient-to-br from-primary/30 to-primary/5', iconColor: 'text-primary', hoverBorder: 'hover:border-primary/40', btnClass: 'border-primary/30 text-primary hover:bg-primary/10' },
    blue: { iconBg: 'bg-gradient-to-br from-blue-500/30 to-blue-500/5', iconColor: 'text-blue-500', hoverBorder: 'hover:border-blue-500/40', btnClass: 'border-blue-500/30 text-blue-500 hover:bg-blue-500/10' },
    cyan: { iconBg: 'bg-gradient-to-br from-cyan-500/30 to-cyan-500/5', iconColor: 'text-cyan-500', hoverBorder: 'hover:border-cyan-500/40', btnClass: 'border-cyan-500/30 text-cyan-500 hover:bg-cyan-500/10' },
    violet: { iconBg: 'bg-gradient-to-br from-violet-500/30 to-violet-500/5', iconColor: 'text-violet-500', hoverBorder: 'hover:border-violet-500/40', btnClass: 'border-violet-500/30 text-violet-500 hover:bg-violet-500/10' },
    amber: { iconBg: 'bg-gradient-to-br from-amber-500/30 to-amber-500/5', iconColor: 'text-amber-500', hoverBorder: 'hover:border-amber-500/40', btnClass: 'border-amber-500/30 text-amber-500 hover:bg-amber-500/10' },
    rose: { iconBg: 'bg-gradient-to-br from-rose-500/30 to-rose-500/5', iconColor: 'text-rose-500', hoverBorder: 'hover:border-rose-500/40', btnClass: 'border-rose-500/30 text-rose-500 hover:bg-rose-500/10' },
  }
  const c = colorMap[color] || colorMap.primary

  return (
    <Link to={to} className="block h-full group">
      <Card variant="elevated" className={cn('h-full transition-all duration-300 cursor-pointer overflow-hidden hover:-translate-y-0.5 hover:shadow-elevated', c.hoverBorder)}>
        <CardContent className="p-6 flex flex-col h-full gap-4">
          <div className="flex items-start justify-between gap-3">
            <motion.div
              whileHover={{ scale: 1.1, rotate: -3 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              className={cn('h-12 w-12 rounded-2xl flex items-center justify-center shrink-0', c.iconBg)}
            >
              <Icon className={cn('h-6 w-6', c.iconColor)} />
            </motion.div>
            {badge && (
              <Badge variant="secondary" className="text-[10px] font-semibold">{badge}</Badge>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-base font-display font-bold leading-tight">{title}</h2>
            <p className="text-muted-foreground text-xs leading-relaxed mt-1">{description}</p>
          </div>
          <Button variant="outline" size="sm" className={cn('gap-1.5 h-8 text-xs w-fit group-hover:gap-2.5 transition-all', c.btnClass)}>
            {buttonLabel}
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </CardContent>
      </Card>
    </Link>
  )
}

export function HubPage() {
  const { user, profile, isAdmin } = useAuth()
  const { hasAccess: hasMailbox } = useHasModuleAccess('functional_mailbox')
  const { data: settings } = useAppSettings()

  const { data: myLoanRequests = [] } = useMyLoanRequests(user?.id)
  const { data: myItRequests = [] } = useMyItRequests(user?.id)
  const { data: myMailboxRequests = [] } = useMyMailboxRequests(user?.id)

  const allRequests = useMemo(() => {
    const list = [
      ...myLoanRequests.map((r: any) => ({ ...r, _type: 'equipment' })),
      ...myItRequests.map((r: any) => ({ ...r, _type: r.type || 'onboarding' })),
      ...myMailboxRequests.map((r: any) => ({ ...r, _type: 'mailbox' })),
    ]
    list.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return list
  }, [myLoanRequests, myItRequests, myMailboxRequests])

  const pendingRequests = allRequests.filter((r: any) => r.status === 'pending').length
  const inProgressRequests = allRequests.filter((r: any) => r.status === 'in_progress').length
  const readyRequests = allRequests.filter((r: any) => r.status === 'ready').length

  const firstName = profile?.first_name || ''
  const greeting = getGreeting()
  const day = getDayLabel()

  const cards = []
  cards.push(
    <HubCard key="catalog" to="/catalog" icon={Package}
      title={settings?.hub_catalog_title || 'Equipment Catalog'}
      description="Browse and request IT equipment for events or projects."
      color="primary" buttonLabel="Open Catalog" />
  )
  cards.push(
    <HubCard key="my-equipment" to="/my-equipment" icon={Package}
      title="My equipment"
      description="The devices currently in your hands — due dates, returns, problems."
      color="emerald" buttonLabel="View my devices" />
  )
  if (isAdmin) {
    cards.push(
      <HubCard key="scan" to="/scan" icon={QrCode}
        title="Scan QR"
        description="Take or return equipment via QR code."
        color="blue" buttonLabel="Start Scanning" />
    )
  }
  // 'My Requests' lives in the stats dashboard at the top — no card here.
  cards.push(
    <HubCard key="onboarding-request" to="/onboarding-request" icon={UserPlus}
      title="Onboarding"
      description="IT setup for a new team member."
      color="cyan" buttonLabel="New Request" />
  )
  cards.push(
    <HubCard key="offboarding-request" to="/offboarding-request" icon={UserMinus}
      title="Offboarding"
      description="Access revocation for a departing employee."
      color="rose" buttonLabel="New Request" />
  )
  // Mailbox card always visible — module access is checked on the form itself
  cards.push(
    <HubCard key="mailbox" to="/functional-mailbox" icon={Mail}
      title="Mailbox Request"
      description="Request a functional mailbox."
      color="violet" buttonLabel="New Request" />
  )

  return (
    <div className="max-w-5xl mx-auto py-10 px-6 pb-24">
      {/* Hero header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Sparkles className="h-3.5 w-3.5" />
          <span>{day}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight leading-tight">
          {greeting}{firstName ? <>, <span className="bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent">{firstName}</span></> : ''}
        </h1>
        <p className="text-muted-foreground text-sm mt-2">What do you need today?</p>
      </motion.div>

      {/* Stats dashboard — always shown so My Requests stays one click away */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
          <StatCard icon={Inbox} label="All requests" value={allRequests.length}
            color={{ bg: 'bg-foreground/5', fg: 'text-foreground' }} to="/my-requests" />
          <StatCard icon={Clock} label="Pending" value={pendingRequests}
            color={{ bg: 'bg-amber-500/15', fg: 'text-amber-600' }} to="/my-requests" />
          <StatCard icon={Loader2} label="In Progress" value={inProgressRequests}
            color={{ bg: 'bg-blue-500/15', fg: 'text-blue-600' }} to="/my-requests" />
        <StatCard icon={CheckCircle} label="Ready" value={readyRequests}
          color={{ bg: 'bg-emerald-500/15', fg: 'text-emerald-600' }} to="/my-requests" />
      </motion.div>

      {/* Quick actions */}
      <div className="space-y-3 mb-8">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick actions</h2>
          <div className="flex-1 h-px bg-border/40" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card: any, i: any) => (
            <DynamicsItem key={card.key} index={i}>
              {card}
            </DynamicsItem>
          ))}
        </div>
      </div>
    </div>
  )
}
