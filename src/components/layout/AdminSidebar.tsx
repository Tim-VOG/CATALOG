import { useState, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, Inbox,
  Users, Palette, Mail, ArrowLeft,
  UserPlus, UserMinus, Monitor, BarChart3,
  QrCode, ScrollText, CalendarRange,
  ChevronRight, CreditCard, KeyRound,
} from 'lucide-react'
import { useLoanRequests } from '@/hooks/use-loan-requests'
import { useItRequests } from '@/hooks/use-it-requests'
import { useMailboxRequests } from '@/hooks/use-mailbox-requests'
import { useOnboardingEmails } from '@/hooks/use-onboarding'
import { cn } from '@/lib/utils'

export function AdminSidebar() {
  const location = useLocation()

  const { data: loanReqs = [] } = useLoanRequests()
  const { data: itReqs = [] } = useItRequests()
  const { data: mailboxReqs = [] } = useMailboxRequests()
  const { data: onboardingEmails = [] } = useOnboardingEmails()

  const pendingCounts = useMemo(() => {
    const sentRequestIds = new Set(
      onboardingEmails.filter((e) => e.it_request_id && e.status === 'sent').map((e) => e.it_request_id)
    )
    const onboardingPending = itReqs.filter((r) => r.type === 'onboarding' && r.status === 'pending').length
    const onboardingReadyToWelcome = itReqs.filter(
      (r) => r.type === 'onboarding' && r.status === 'ready' && !sentRequestIds.has(r.id)
    ).length
    return {
      equipment: loanReqs.filter((r) => r.status === 'pending').length,
      onboarding: onboardingPending + onboardingReadyToWelcome,
      offboarding: itReqs.filter((r) => r.type === 'offboarding' && r.status === 'pending').length,
      mailbox: mailboxReqs.filter((r) => r.status === 'pending').length,
    }
  }, [loanReqs, itReqs, mailboxReqs, onboardingEmails])

  const sidebarSections = [
    {
      label: 'Overview',
      defaultOpen: true,
      links: [
        { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
        { to: '/admin/planning', label: 'Planning', icon: CalendarRange },
        { to: '/admin/stats', label: 'Statistics', icon: BarChart3 },
      ],
    },
    {
      label: 'Requests',
      defaultOpen: true,
      links: [
        { to: '/admin/requests', label: 'Equipment', icon: Inbox, badge: pendingCounts.equipment },
        { to: '/admin/onboarding/requests', label: 'Onboarding', icon: UserPlus, badge: pendingCounts.onboarding },
        { to: '/admin/offboarding-requests', label: 'Offboarding', icon: UserMinus, badge: pendingCounts.offboarding },
        { to: '/admin/mailbox-requests', label: 'Mailbox', icon: Mail, badge: pendingCounts.mailbox },
      ],
    },
    {
      label: 'Inventory',
      defaultOpen: false,
      links: [
        { to: '/admin/local-it', label: 'Local IT', icon: Monitor },
        { to: '/admin/it-inventory', label: 'IT Inventory', icon: ScrollText },
        { to: '/admin/shared-mailboxes', label: 'Shared Mailboxes', icon: Mail },
        { to: '/admin/products', label: 'Products', icon: Package },
        { to: '/admin/qr-codes', label: 'QR Codes', icon: QrCode },
        { to: '/admin/device-credentials', label: 'Device Credentials', icon: KeyRound },
        { to: '/admin/scan-logs', label: 'Scan Logs', icon: ScrollText },
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
        { to: '/admin/email-templates', label: 'Communications', icon: Mail },
        { to: '/admin/design', label: 'Design & Branding', icon: Palette },
      ],
    },
  ]

  const isActive = (to, exact) => {
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
          {sidebarSections.map((section) => (
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
  const hasActiveLink = section.links.some(l => isActive(l.to, l.exact))
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
          {section.links.map(({ to, label, icon: Icon, exact, badge }) => {
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
