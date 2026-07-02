import { useState, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, Inbox,
  Users, Palette, Mail, ArrowLeft,
  UserPlus, UserMinus, Monitor, BarChart3,
  QrCode, ScrollText, CalendarRange,
  ChevronRight, CreditCard, KeyRound, ShieldCheck,
  CalendarClock, PackageSearch, Activity, Wrench, Building2,
} from 'lucide-react'
import { useLoanRequests } from '@/hooks/use-loan-requests'
import { useItRequests } from '@/hooks/use-it-requests'
import { useMailboxRequests } from '@/hooks/use-mailbox-requests'
import { useOnboardingEmails } from '@/hooks/use-onboarding'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

export function AdminSidebar() {
  const location = useLocation()
  const { isAdmin } = useAuth()

  const { data: loanReqs = [] } = useLoanRequests()
  const { data: itReqs = [] } = useItRequests()
  const { data: mailboxReqs = [] } = useMailboxRequests()
  const { data: onboardingEmails = [] } = useOnboardingEmails()

  const pendingCounts = useMemo(() => {
    const sentRequestIds = new Set(
      onboardingEmails.filter((e: any) => e.it_request_id && e.status === 'sent').map((e: any) => e.it_request_id)
    )
    const onboardingPending = itReqs.filter((r: any) => r.type === 'onboarding' && r.status === 'pending').length
    const onboardingReadyToWelcome = itReqs.filter(
      (r) => r.type === 'onboarding' && r.status === 'ready' && !sentRequestIds.has(r.id)
    ).length
    return {
      equipment: loanReqs.filter((r: any) => r.status === 'pending').length,
      onboarding: onboardingPending + onboardingReadyToWelcome,
      offboarding: itReqs.filter((r: any) => r.type === 'offboarding' && r.status === 'pending').length,
      mailbox: mailboxReqs.filter((r: any) => r.status === 'pending').length,
    }
  }, [loanReqs, itReqs, mailboxReqs, onboardingEmails])

  // `managerOk: true` links are visible to HR managers. Everything
  // else is admin-only and hidden when isAdmin is false.
  const allSections = [
    {
      label: 'Overview',
      defaultOpen: true,
      links: [
        { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true, managerOk: true },
        { to: '/admin/planning', label: 'Planning', icon: CalendarRange, managerOk: true },
        { to: '/admin/stats', label: 'Statistics', icon: BarChart3 },
        { to: '/admin/utilization', label: 'Utilization', icon: Activity },
      ],
    },
    {
      // All the "someone submitted a request" flows in one place.
      label: 'Requests',
      defaultOpen: true,
      links: [
        { to: '/admin/requests', label: 'Equipment', icon: Inbox, badge: pendingCounts.equipment },
        { to: '/admin/extensions', label: 'Extensions', icon: CalendarClock },
        { to: '/admin/onboarding/requests', label: 'Onboarding', icon: UserPlus, badge: pendingCounts.onboarding, managerOk: true },
        { to: '/admin/offboarding-requests', label: 'Offboarding', icon: UserMinus, badge: pendingCounts.offboarding, managerOk: true },
        { to: '/admin/mailbox-requests', label: 'Mailbox', icon: Mail, badge: pendingCounts.mailbox, managerOk: true },
        { to: '/admin/issues', label: 'Issues', icon: Wrench },
      ],
    },
    {
      // The physical stock / catalog side: what we own and lend.
      label: 'Inventory',
      defaultOpen: false,
      links: [
        { to: '/admin/products', label: 'Products', icon: Package },
        { to: '/admin/it-inventory', label: 'IT Inventory', icon: ScrollText },
        { to: '/admin/local-it', label: 'Local IT', icon: Monitor },
        { to: '/admin/shared-mailboxes', label: 'Shared Mailboxes', icon: Mail },
        { to: '/admin/reservations', label: 'Reservations', icon: CalendarClock },
        { to: '/admin/device-credentials', label: 'Device Credentials', icon: KeyRound },
      ],
    },
    {
      // Everything QR / scanning / tracking of gear in the field.
      label: 'QR & Tracking',
      defaultOpen: false,
      links: [
        { to: '/admin/qr-codes', label: 'QR Codes', icon: QrCode },
        { to: '/admin/scan-logs', label: 'Scan Logs', icon: ScrollText },
        { to: '/admin/lost-items', label: 'Lost Items', icon: PackageSearch },
      ],
    },
    {
      label: 'Users',
      defaultOpen: false,
      links: [
        { to: '/admin/users', label: 'All Users', icon: Users },
      ],
    },
    {
      label: 'Settings',
      defaultOpen: false,
      links: [
        { to: '/admin/subscription-plans', label: 'Subscription Plans', icon: CreditCard },
        { to: '/admin/business-units', label: 'Business Units', icon: Building2 },
        { to: '/admin/email-templates', label: 'Communications', icon: Mail },
        { to: '/admin/design', label: 'Design & Branding', icon: Palette },
        { to: '/admin/audit', label: 'Audit Log', icon: ShieldCheck },
      ],
    },
  ]

  // Managers only see the people-ops links; admins see everything.
  const sidebarSections = allSections
    .map((section: any) => ({
      ...section,
      links: isAdmin ? section.links : section.links.filter((l: any) => l.managerOk),
    }))
    .filter((section: any) => section.links.length > 0)

  const isActive = (to: any, exact: any) => {
    if (exact) return location.pathname === to
    return location.pathname.startsWith(to)
  }

  return (
    <aside className="hidden lg:block py-4 pl-4 shrink-0 self-start">
      <div className="w-60 flex flex-col max-h-[calc(100vh-5.5rem)]">
        {/* Brand */}
        <div className="px-3 pb-5">
          <h2 className="font-display font-semibold text-base tracking-tight">VO Hub</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Admin</p>
        </div>

        <nav className="flex-1 overflow-y-auto space-y-5 pr-2">
          {sidebarSections.map((section: any) => (
            <SidebarSection key={section.label} section={section} isActive={isActive} />
          ))}
        </nav>

        <div className="pt-4 mt-4 border-t border-border/40">
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Back to Hub
          </Link>
        </div>
      </div>
    </aside>
  )
}

function SidebarSection({ section, isActive  }: any) {
  const hasActiveLink = section.links.some((l: any) => isActive(l.to, l.exact))
  const [open, setOpen] = useState(section.defaultOpen || hasActiveLink)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-3 mb-1 text-xs font-medium text-muted-foreground/70 hover:text-muted-foreground transition-colors"
      >
        {section.label}
        <ChevronRight className={cn('h-3 w-3 transition-transform duration-200', open && 'rotate-90')} />
      </button>
      {open && (
        <div className="space-y-px">
          {section.links.map(({ to, label, icon: Icon, exact, badge }: any) => {
            const active = isActive(to, exact)
            return (
              <Link key={to} to={to}>
                <div
                  className={cn(
                    'group flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors duration-150',
                    active
                      ? 'bg-muted/60 text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  )}
                >
                  <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-foreground' : '')} />
                  <span className="flex-1 truncate">{label}</span>
                  {badge > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-foreground/8 text-[10px] font-medium text-foreground px-1.5">
                      {badge}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
