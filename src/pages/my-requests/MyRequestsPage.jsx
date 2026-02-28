import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useHasModuleAccess } from '@/hooks/use-has-module-access'
import { useMyLoanRequests } from '@/hooks/use-loan-requests'
import { useMyItRequests } from '@/hooks/use-it-requests'
import { useMyMailboxRequests } from '@/hooks/use-mailbox-requests'
import { motion, AnimatePresence } from 'motion/react'
import {
  Package, ClipboardList, Mail, Calendar, MapPin, ChevronRight,
  Clock, CheckCircle2, XCircle, AlertTriangle, Inbox, ArrowRight,
  User, Building2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { cn } from '@/lib/utils'

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

// ── Status styling ──
const STATUS_MAP = {
  pending: { color: 'bg-amber-500/15 text-amber-600 border-amber-500/30', icon: Clock },
  approved: { color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30', icon: CheckCircle2 },
  rejected: { color: 'bg-destructive/15 text-destructive border-destructive/30', icon: XCircle },
  completed: { color: 'bg-primary/15 text-primary border-primary/30', icon: CheckCircle2 },
  cancelled: { color: 'bg-gray-500/15 text-gray-500 border-gray-500/30', icon: XCircle },
  picked_up: { color: 'bg-blue-500/15 text-blue-600 border-blue-500/30', icon: Package },
  returned: { color: 'bg-cyan-500/15 text-cyan-600 border-cyan-500/30', icon: CheckCircle2 },
  closed: { color: 'bg-gray-500/15 text-gray-600 border-gray-500/30', icon: CheckCircle2 },
}

function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] || { color: '', icon: Clock }
  const Icon = cfg.icon
  return (
    <Badge variant="outline" className={cn('text-[10px] gap-1', cfg.color)}>
      <Icon className="h-2.5 w-2.5" />
      {status}
    </Badge>
  )
}

// ═══════════════════════════════════
//  Section Component
// ═══════════════════════════════════
function RequestSection({ icon: Icon, title, color, count, children, actionTo, actionLabel }) {
  const [collapsed, setCollapsed] = useState(false)

  const colorMap = {
    primary: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20' },
    violet: { bg: 'bg-violet-500/10', text: 'text-violet-500', border: 'border-violet-500/20' },
  }
  const c = colorMap[color] || colorMap.primary

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', c.bg)}>
          <Icon className={cn('h-4 w-4', c.text)} />
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <h3 className="font-display font-bold text-sm">{title}</h3>
          <Badge variant="secondary" className="text-[10px] h-5 min-w-5 justify-center">{count}</Badge>
          <ChevronRight className={cn(
            'h-3.5 w-3.5 text-muted-foreground transition-transform',
            !collapsed && 'rotate-90'
          )} />
        </button>
        {actionTo && (
          <Link to={actionTo} className="ml-auto">
            <Button variant="outline" size="sm" className={cn('gap-1.5 text-xs', c.text, c.border)}>
              {actionLabel || 'New'}
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        )}
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ═══════════════════════════════════
//  Catalog Request Card
// ═══════════════════════════════════
function CatalogRequestCard({ req }) {
  return (
    <Link to={`/requests/${req.id}`}>
      <Card className="hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Package className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm truncate">{req.project_name}</span>
                <StatusBadge status={req.status} />
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {fmtDate(req.pickup_date)} &rarr; {fmtDate(req.return_date)}
                </span>
                {req.location_name && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {req.location_name}
                  </span>
                )}
                <span>{req.item_count} item{req.item_count !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

// ═══════════════════════════════════
//  IT Request Card
// ═══════════════════════════════════
function ItRequestCard({ req }) {
  return (
    <Card className="hover:-translate-y-0.5 hover:shadow-md hover:border-amber-500/30 transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <ClipboardList className="h-4 w-4 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">
                {req.first_name} {req.last_name}
              </span>
              {req.business_unit && (
                <Badge variant="secondary" className="text-[10px]">{req.business_unit}</Badge>
              )}
              <StatusBadge status={req.status || 'pending'} />
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
              {req.generated_email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {req.generated_email}
                </span>
              )}
              {req.start_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Start: {fmtDate(req.start_date)}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ═══════════════════════════════════
//  Mailbox Request Card
// ═══════════════════════════════════
function MailboxRequestCard({ req }) {
  return (
    <Card className="hover:-translate-y-0.5 hover:shadow-md hover:border-violet-500/30 transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
            <Mail className="h-4 w-4 text-violet-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{req.project_name}</span>
              {req.agency && (
                <Badge variant="secondary" className="text-[10px]">{req.agency}</Badge>
              )}
              <StatusBadge status={req.status} />
              {req.confirmation_email_sent && (
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1">
                  <Mail className="h-2.5 w-2.5" /> Confirmed
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
              {req.email_to_create && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {req.email_to_create}
                </span>
              )}
              {req.creation_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> {fmtDate(req.creation_date)}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ═══════════════════════════════════
//  Empty section
// ═══════════════════════════════════
function EmptySection({ message }) {
  return (
    <div className="text-center py-6 text-xs text-muted-foreground/60">
      {message}
    </div>
  )
}

// ═══════════════════════════════════
//  Main Page
// ═══════════════════════════════════
export function MyRequestsPage() {
  const { user } = useAuth()

  // Module access checks
  const { hasAccess: hasCatalog } = useHasModuleAccess('catalog')
  const { hasAccess: hasItForm } = useHasModuleAccess('it_form')
  const { hasAccess: hasMailbox } = useHasModuleAccess('functional_mailbox')

  // Fetch requests
  const loanQuery = useMyLoanRequests(user?.id)
  const itQuery = useMyItRequests(user?.id)
  const mailboxQuery = useMyMailboxRequests(user?.id)

  const loanRequests = loanQuery.data || []
  const itRequests = itQuery.data || []
  const mailboxRequests = mailboxQuery.data || []

  const isLoading = loanQuery.isLoading || (hasItForm && itQuery.isLoading) || (hasMailbox && mailboxQuery.isLoading)

  const totalCount = loanRequests.length + itRequests.length + mailboxRequests.length

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32 mt-2" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        ))}
      </div>
    )
  }

  if (totalCount === 0) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4">
        <EmptyState
          icon={Inbox}
          title="No requests yet"
          description="You haven't submitted any requests. Browse the available hubs to get started."
        >
          <Link to="/">
            <Button className="gap-2">
              <ArrowRight className="h-4 w-4" />
              Go to Hub
            </Button>
          </Link>
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-3xl font-display font-bold tracking-tight text-gradient-primary">
          My Requests
        </h1>
        <p className="text-muted-foreground mt-1">
          {totalCount} request{totalCount !== 1 ? 's' : ''} across all hubs
        </p>
        <motion.div
          className="mt-3 h-0.5 w-16 rounded-full bg-primary/60"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ originX: 0 }}
        />
      </motion.div>

      {/* Catalog / Equipment Loans */}
      {hasCatalog && loanRequests.length > 0 && (
        <RequestSection
          icon={Package}
          title="Equipment Catalog"
          color="primary"
          count={loanRequests.length}
          actionTo="/catalog"
          actionLabel="Browse"
        >
          <div className="space-y-2">
            {loanRequests.map((req) => (
              <CatalogRequestCard key={req.id} req={req} />
            ))}
          </div>
        </RequestSection>
      )}

      {/* IT Onboarding */}
      {hasItForm && itRequests.length > 0 && (
        <RequestSection
          icon={ClipboardList}
          title="IT Onboarding Requests"
          color="amber"
          count={itRequests.length}
          actionTo="/it-request"
          actionLabel="New"
        >
          <div className="space-y-2">
            {itRequests.map((req) => (
              <ItRequestCard key={req.id} req={req} />
            ))}
          </div>
        </RequestSection>
      )}

      {/* Functional Mailbox */}
      {hasMailbox && mailboxRequests.length > 0 && (
        <RequestSection
          icon={Mail}
          title="Functional Mailbox Requests"
          color="violet"
          count={mailboxRequests.length}
          actionTo="/functional-mailbox"
          actionLabel="New"
        >
          <div className="space-y-2">
            {mailboxRequests.map((req) => (
              <MailboxRequestCard key={req.id} req={req} />
            ))}
          </div>
        </RequestSection>
      )}
    </div>
  )
}
