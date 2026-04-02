import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useHasModuleAccess } from '@/hooks/use-has-module-access'
import { useAppSettings } from '@/hooks/use-settings'
import { useMyEquipment } from '@/hooks/use-user-equipment'
import { useMyLoanRequests } from '@/hooks/use-loan-requests'
import { Package, ArrowRight, Mail, QrCode, Inbox, UserPlus, UserMinus, Monitor } from 'lucide-react'
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

function HubCard({ to, icon: Icon, title, description, color = 'primary', badge, buttonLabel }) {
  const colorMap = {
    primary: { iconBg: 'bg-gradient-to-br from-primary/20 to-primary/5', iconColor: 'text-primary', hoverBorder: 'hover:border-primary/30', btnClass: 'border-primary/30 text-primary hover:bg-primary/10' },
    blue: { iconBg: 'bg-gradient-to-br from-blue-500/20 to-blue-500/5', iconColor: 'text-blue-500', hoverBorder: 'hover:border-blue-500/30', btnClass: 'border-blue-500/30 text-blue-500 hover:bg-blue-500/10' },
    cyan: { iconBg: 'bg-gradient-to-br from-cyan-500/20 to-cyan-500/5', iconColor: 'text-cyan-500', hoverBorder: 'hover:border-cyan-500/30', btnClass: 'border-cyan-500/30 text-cyan-500 hover:bg-cyan-500/10' },
    violet: { iconBg: 'bg-gradient-to-br from-violet-500/20 to-violet-500/5', iconColor: 'text-violet-500', hoverBorder: 'hover:border-violet-500/30', btnClass: 'border-violet-500/30 text-violet-500 hover:bg-violet-500/10' },
    amber: { iconBg: 'bg-gradient-to-br from-amber-500/20 to-amber-500/5', iconColor: 'text-amber-500', hoverBorder: 'hover:border-amber-500/30', btnClass: 'border-amber-500/30 text-amber-500 hover:bg-amber-500/10' },
    green: { iconBg: 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/5', iconColor: 'text-emerald-500', hoverBorder: 'hover:border-emerald-500/30', btnClass: 'border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10' },
    rose: { iconBg: 'bg-gradient-to-br from-rose-500/20 to-rose-500/5', iconColor: 'text-rose-500', hoverBorder: 'hover:border-rose-500/30', btnClass: 'border-rose-500/30 text-rose-500 hover:bg-rose-500/10' },
  }
  const c = colorMap[color] || colorMap.primary

  return (
    <Link to={to} className="block h-full">
      <Card variant="elevated" className={`h-full group ${c.hoverBorder} hover:shadow-elevated transition-all duration-300 cursor-pointer overflow-hidden`}>
        <CardContent className="p-7 sm:p-8 flex items-start gap-5 h-full">
          <motion.div
            whileHover={{ scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className={`h-11 w-11 rounded-xl ${c.iconBg} flex items-center justify-center shrink-0`}
          >
            <Icon className={`h-5 w-5 ${c.iconColor}`} />
          </motion.div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-[15px] font-display font-bold">{title}</h2>
              {badge && (
                <Badge variant="secondary" className="text-[10px] font-semibold">{badge}</Badge>
              )}
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed mb-3">{description}</p>
            <Button variant="outline" size="sm" className={cn('gap-1.5 h-8 text-xs group-hover:gap-2.5 transition-all', c.btnClass)}>
              {buttonLabel}
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export function HubPage() {
  const { user, profile, isAdmin } = useAuth()
  const { hasAccess: hasMailbox } = useHasModuleAccess('functional_mailbox')
  const { data: settings } = useAppSettings()

  // Live counters
  const { data: myEquipment = [] } = useMyEquipment()
  const { data: myRequests = [] } = useMyLoanRequests(user?.id)

  const activeEquipment = myEquipment.filter((e) => e.status === 'active').length
  const pendingRequests = myRequests.filter((r) => r.status === 'pending').length

  const firstName = profile?.first_name || ''
  const greeting = getGreeting()

  const cards = []

  // Catalog — always visible
  cards.push(
    <HubCard
      key="catalog"
      to="/catalog"
      icon={Package}
      title={settings?.hub_catalog_title || 'Equipment Catalog'}
      description="Browse and request IT equipment."
      color="primary"
      buttonLabel="Open Catalog"
    />
  )

  // QR Scan — admin only
  if (isAdmin) {
    cards.push(
      <HubCard
        key="scan"
        to="/scan"
        icon={QrCode}
        title="Scan QR"
        description="Take or return equipment via QR code."
        color="blue"
        buttonLabel="Start Scanning"
      />
    )
  }

  // My Equipment — everyone
  cards.push(
    <HubCard
      key="my-equipments"
      to="/my-equipments"
      icon={Monitor}
      title="My Equipment"
      description="Your assigned equipment."
      color="green"
      buttonLabel="View Equipment"
      badge={activeEquipment > 0 ? `${activeEquipment} item${activeEquipment !== 1 ? 's' : ''}` : null}
    />
  )

  // My Requests — non-admin
  if (!isAdmin) {
    cards.push(
      <HubCard
        key="my-requests"
        to="/my-requests"
        icon={Inbox}
        title="My Requests"
        description="Track your submitted requests."
        color="amber"
        buttonLabel="View Requests"
        badge={pendingRequests > 0 ? `${pendingRequests} pending` : null}
      />
    )
  }

  // Onboarding
  cards.push(
    <HubCard
      key="onboarding-request"
      to="/onboarding-request"
      icon={UserPlus}
      title="Onboarding"
      description="IT setup for a new team member."
      color="cyan"
      buttonLabel="New Request"
    />
  )

  // Offboarding
  cards.push(
    <HubCard
      key="offboarding-request"
      to="/offboarding-request"
      icon={UserMinus}
      title="Offboarding"
      description="Access revocation for a departing employee."
      color="rose"
      buttonLabel="New Request"
    />
  )

  // Functional Mailbox — visible to everyone
  cards.push(
    <HubCard
      key="mailbox"
      to="/functional-mailbox"
      icon={Mail}
      title="Mailbox Request"
      description="Request a functional mailbox."
      color="violet"
      buttonLabel="New Request"
    />
  )

  return (
    <div className="max-w-5xl mx-auto py-10 px-6 pb-24">
      {/* Header */}
      <motion.div
        className="mb-10"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className="text-muted-foreground text-sm">
          {greeting}{firstName ? `, ${firstName}` : ''}
        </p>
        <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight mt-1">
          What do you need today?
        </h1>
      </motion.div>

      {/* Cards — 2 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map((card, i) => (
          <DynamicsItem key={card.key} index={i}>
            {card}
          </DynamicsItem>
        ))}
      </div>
    </div>
  )
}
