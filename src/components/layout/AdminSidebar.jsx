import { useState, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, Inbox,
  Users, Palette, Mail, ArrowLeft,
  UserPlus, UserMinus, Monitor, BarChart3,
  Settings, QrCode, ScrollText,
  ChevronDown, CreditCard,
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
        { to: '/admin/products', label: 'Products', icon: Package },
        { to: '/admin/qr-codes', label: 'QR Codes', icon: QrCode },
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
    <aside className="hidden lg:block py-3 pl-3 shrink-0 self-start">
      <div className="w-60 rounded-2xl bg-card/70 backdrop-blur-md border border-border/40 shadow-sm flex flex-col max-h-[calc(100vh-5.5rem)] overflow-hidden">
        <div className="px-4 py-3.5 border-b border-border/30 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <LayoutDashboard className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-sm tracking-tight">Admin Panel</h2>
            <p className="text-[10px] text-muted-foreground -mt-0.5">Manage your workspace</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-2 pt-2 space-y-1">
          {sidebarSections.map((section) => (
            <SidebarSection key={section.label} section={section} isActive={isActive} />
          ))}
        </nav>

        <div className="px-3 py-2.5 border-t border-border/20">
          <Link to="/" className="flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Hub
          </Link>
        </div>
      </div>
    </aside>
  )
}

function SidebarSection({ section, isActive }) {
  const hasActiveLink = section.links.some(l => isActive(l.to, l.exact))
  const [open, setOpen] = useState(section.defaultOpen || hasActiveLink)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      >
        {section.label}
        <ChevronDown className={cn('h-3 w-3 transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="space-y-0.5 pb-1.5">
          {section.links.map(({ to, label, icon: Icon, exact, badge }) => {
            const active = isActive(to, exact)
            return (
              <Link key={to} to={to}>
                <div
                  className={cn(
                    'group relative flex items-center gap-2.5 px-3 py-2 mx-1 rounded-lg text-[13px] transition-all duration-150',
                    active
                      ? 'bg-primary/12 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-primary rounded-r-full" aria-hidden />
                  )}
                  <Icon className={cn('h-[15px] w-[15px] shrink-0 transition-colors', active ? 'text-primary' : 'group-hover:text-foreground')} />
                  <span className="flex-1 truncate">{label}</span>
                  {badge > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground px-1.5">
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
