import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useHasModuleAccess } from '@/hooks/use-has-module-access'
import { useAppSettings } from '@/hooks/use-settings'
import { Package, ArrowRight, Mail, QrCode, Clock, Inbox, UserPlus, UserMinus, ClipboardList } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollReveal, DynamicsItem } from '@/components/ui/motion'
import { motion } from 'motion/react'

function HubCard({ to, icon: Icon, title, description, color = 'primary', badge, buttonLabel, variant = 'default' }) {
  const colorMap = {
    primary: { iconBg: 'bg-gradient-to-br from-primary/20 to-primary/5', iconColor: 'text-primary', hoverBorder: 'hover:border-primary/30', btnClass: '' },
    cyan: { iconBg: 'bg-gradient-to-br from-cyan-500/20 to-cyan-500/5', iconColor: 'text-cyan-500', hoverBorder: 'hover:border-cyan-500/30', btnClass: 'border-cyan-500/30 text-cyan-500 hover:bg-cyan-500/10' },
    violet: { iconBg: 'bg-gradient-to-br from-violet-500/20 to-violet-500/5', iconColor: 'text-violet-500', hoverBorder: 'hover:border-violet-500/30', btnClass: 'border-violet-500/30 text-violet-500 hover:bg-violet-500/10' },
    amber: { iconBg: 'bg-gradient-to-br from-amber-500/20 to-amber-500/5', iconColor: 'text-amber-500', hoverBorder: 'hover:border-amber-500/30', btnClass: 'border-amber-500/30 text-amber-500 hover:bg-amber-500/10' },
  }
  const c = colorMap[color] || colorMap.primary

  if (!to) {
    return (
      <Card variant="elevated" className="h-full opacity-55 overflow-hidden">
        <CardContent className="p-7 flex flex-col items-center text-center h-full">
          <div className={`h-14 w-14 rounded-2xl ${c.iconBg} flex items-center justify-center mb-4`}>
            <Icon className={`h-7 w-7 ${c.iconColor}`} />
          </div>
          <h2 className="text-lg font-display font-bold mb-2">{title}</h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-4 flex-1">{description}</p>
          <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
            <Clock className="h-2.5 w-2.5" /> Coming soon
          </Badge>
        </CardContent>
      </Card>
    )
  }

  return (
    <Link to={to} className="block h-full">
      <Card variant="elevated" className={`h-full group ${c.hoverBorder} hover:shadow-elevated transition-all duration-300 cursor-pointer overflow-hidden`}>
        <CardContent className="p-7 flex flex-col items-center text-center h-full">
          <motion.div
            whileHover={{ scale: 1.1, rotate: [0, -3, 3, 0] }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className={`h-14 w-14 rounded-2xl ${c.iconBg} flex items-center justify-center mb-4`}
          >
            <Icon className={`h-7 w-7 ${c.iconColor}`} />
          </motion.div>
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-lg font-display font-bold">{title}</h2>
            {badge && <Badge variant="secondary" className="text-[10px]">{badge}</Badge>}
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed mb-5 flex-1">{description}</p>
          <Button variant={variant === 'outline' ? 'outline' : 'default'} className={`gap-2 group-hover:gap-3 transition-all ${variant === 'outline' ? c.btnClass : ''}`}>
            {buttonLabel}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </CardContent>
      </Card>
    </Link>
  )
}

export function HubPage() {
  const { isAdmin } = useAuth()
  const { hasAccess: hasMailbox } = useHasModuleAccess('functional_mailbox')
  const { data: settings } = useAppSettings()

  const hubTitle = settings?.hub_main_title || 'VO Gear Hub'
  const hubTagline = settings?.hub_tagline || 'Welcome — choose your destination'

  const cards = []

  // Equipment section — always visible
  cards.push(
    <HubCard
      key="catalog"
      to="/catalog"
      icon={Package}
      title={settings?.hub_catalog_title || 'Equipment Catalog'}
      description="Browse available IT equipment and check stock levels."
      color="primary"
      buttonLabel="Open Catalog"
    />
  )

  cards.push(
    <HubCard
      key="scan"
      to="/scan"
      icon={QrCode}
      title="QR Scan"
      description="Take or return equipment by scanning its QR code."
      color="cyan"
      buttonLabel="Start Scanning"
      variant="outline"
    />
  )

  // Equipment Request — always visible
  cards.push(
    <HubCard
      key="equipment-request"
      to="/equipment-request"
      icon={ClipboardList}
      title="Request Equipment"
      description="Submit a request for IT equipment for your project or team."
      color="primary"
      buttonLabel="New Request"
      variant="outline"
    />
  )

  // My Requests — visible to non-admin users only
  if (!isAdmin) {
    cards.push(
      <HubCard
        key="my-requests"
        to="/my-requests"
        icon={Inbox}
        title="My Requests"
        description="View all your submitted requests and track their status."
        color="primary"
        buttonLabel="View Requests"
        variant="outline"
      />
    )
  }

  // Onboarding Request — always visible
  cards.push(
    <HubCard
      key="onboarding-request"
      to="/onboarding-request"
      icon={UserPlus}
      title="Onboarding Request"
      description="Request IT setup and equipment for a new team member."
      color="cyan"
      buttonLabel="New Request"
      variant="outline"
    />
  )

  // Offboarding Request — always visible
  cards.push(
    <HubCard
      key="offboarding-request"
      to="/offboarding-request"
      icon={UserMinus}
      title="Offboarding Request"
      description="Request access revocation and equipment collection for a departing employee."
      color="amber"
      buttonLabel="New Request"
      variant="outline"
    />
  )

  // Functional Mailbox — show if access granted
  if (hasMailbox) {
    cards.push(
      <HubCard
        key="mailbox"
        to="/functional-mailbox"
        icon={Mail}
        title="Mailbox Request"
        description="Request a new functional mailbox for your team or project."
        color="violet"
        buttonLabel="New Request"
        variant="outline"
      />
    )
  }

  const gridCols = cards.length <= 2 ? 'sm:grid-cols-2' : cards.length <= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-3'

  return (
    <div className="max-w-6xl mx-auto py-12 px-6 relative">
      <div className="absolute inset-0 bg-mesh-gradient opacity-30 pointer-events-none rounded-3xl" />

      <ScrollReveal direction="down" className="text-center mb-10 relative">
        <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight text-gradient-primary">
          {hubTitle}
        </h1>
        <p className="text-muted-foreground mt-3 text-lg">
          {hubTagline}
        </p>
        <motion.div
          className="mt-5 h-1 w-20 rounded-full bg-gradient-to-r from-primary to-accent mx-auto"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        />
      </ScrollReveal>

      <div className={`grid grid-cols-1 ${gridCols} gap-5 relative`}>
        {cards.map((card, i) => (
          <DynamicsItem key={card.key} index={i}>
            {card}
          </DynamicsItem>
        ))}
      </div>
    </div>
  )
}
