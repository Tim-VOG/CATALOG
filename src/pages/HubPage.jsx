import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useHasModuleAccess } from '@/hooks/use-has-module-access'
import { Package, UserPlus, ArrowRight, Mail, ClipboardList, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { motion } from 'motion/react'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12 } },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

function HubCard({ to, icon: Icon, title, description, color = 'primary', badge, buttonLabel, variant = 'default' }) {
  const colorMap = {
    primary: { iconBg: 'bg-primary/10', iconColor: 'text-primary', hoverBorder: 'hover:border-primary/30', btnClass: '' },
    cyan: { iconBg: 'bg-cyan-500/10', iconColor: 'text-cyan-500', hoverBorder: 'hover:border-cyan-500/30', btnClass: 'border-cyan-500/30 text-cyan-500 hover:bg-cyan-500/10' },
    violet: { iconBg: 'bg-violet-500/10', iconColor: 'text-violet-500', hoverBorder: 'hover:border-violet-500/30', btnClass: 'border-violet-500/30 text-violet-500 hover:bg-violet-500/10' },
    amber: { iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500', hoverBorder: 'hover:border-amber-500/30', btnClass: 'border-amber-500/30 text-amber-500 hover:bg-amber-500/10' },
  }
  const c = colorMap[color] || colorMap.primary

  if (!to) {
    return (
      <motion.div variants={item}>
        <Card variant="elevated" className="h-full opacity-55 overflow-hidden">
          <CardContent className="p-7 flex flex-col items-center text-center h-full">
            <div className={`h-14 w-14 rounded-2xl ${c.iconBg} flex items-center justify-center mb-4`}>
              <Icon className={`h-7 w-7 ${c.iconColor}`} />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-lg font-display font-bold">{title}</h2>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4 flex-1">{description}</p>
            <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
              <Clock className="h-2.5 w-2.5" /> Coming soon
            </Badge>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div variants={item}>
      <Link to={to} className="block h-full">
        <Card variant="elevated" className={`h-full group ${c.hoverBorder} hover:shadow-card-hover transition-all duration-300 cursor-pointer overflow-hidden`}>
          <CardContent className="p-7 flex flex-col items-center text-center h-full">
            <div className={`h-14 w-14 rounded-2xl ${c.iconBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
              <Icon className={`h-7 w-7 ${c.iconColor}`} />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-lg font-display font-bold">{title}</h2>
              {badge && <Badge variant="secondary" className="text-[10px]">{badge}</Badge>}
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed mb-5 flex-1">{description}</p>
            <Button variant={variant === 'outline' ? 'outline' : 'default'} className={`gap-2 group-hover:gap-3 transition-all ${variant === 'outline' ? c.btnClass : ''}`}>
              {buttonLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )
}

export function HubPage() {
  const { isAdmin } = useAuth()
  const { hasAccess: hasOnboarding } = useHasModuleAccess('onboarding')
  const { hasAccess: hasItForm } = useHasModuleAccess('it_form')
  const { hasAccess: hasMailbox } = useHasModuleAccess('functional_mailbox')

  // Build visible cards dynamically
  const cards = []

  // Catalog — always visible (accessible to all)
  cards.push(
    <HubCard
      key="catalog"
      to="/catalog"
      icon={Package}
      title="Equipment Catalog"
      description="Browse and reserve equipment for your projects. View availability and submit loan requests."
      color="primary"
      buttonLabel="Open Catalog"
    />
  )

  // Onboarding Hub — admin only
  if (hasOnboarding && isAdmin) {
    cards.push(
      <HubCard
        key="onboarding"
        to="/admin/onboarding"
        icon={UserPlus}
        title="Onboarding Hub"
        description="Compose and send welcome emails to new team members. Manage recipients and track delivery."
        color="cyan"
        badge="Admin"
        buttonLabel="Open Onboarding"
        variant="outline"
      />
    )
  }

  // Functional Mailbox — coming soon, show if access granted
  if (hasMailbox) {
    cards.push(
      <HubCard
        key="mailbox"
        icon={Mail}
        title="Functional Mailbox"
        description="Request a new functional mailbox for your team or project. Approval workflow included."
        color="violet"
      />
    )
  }

  // IT Onboarding Request — show if access granted
  if (hasItForm) {
    cards.push(
      <HubCard
        key="it-request"
        to="/it-request"
        icon={ClipboardList}
        title="IT Onboarding Request"
        description="Submit an IT onboarding request for new hires. Provide equipment and access requirements."
        color="amber"
        buttonLabel="New Request"
        variant="outline"
      />
    )
  }

  // Determine grid columns based on card count
  const gridCols = cards.length <= 2 ? 'sm:grid-cols-2' : cards.length <= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-2'

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      <motion.div
        className="text-center mb-10"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-display font-bold tracking-tight text-gradient-primary">
          VO Gear Hub
        </h1>
        <p className="text-muted-foreground mt-3 text-lg">
          Welcome — choose your destination
        </p>
        <motion.div
          className="mt-4 h-0.5 w-16 rounded-full bg-primary/60 mx-auto"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        />
      </motion.div>

      <motion.div
        className={`grid grid-cols-1 ${gridCols} gap-5`}
        variants={container}
        initial="hidden"
        animate="show"
      >
        {cards}
      </motion.div>
    </div>
  )
}
