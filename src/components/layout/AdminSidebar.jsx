import { useState, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, Inbox,
  Users, Palette, Mail, ArrowLeft,
  UserPlus, UserMinus, Monitor, BarChart3,
  QrCode, ScrollText, CalendarRange,
  ChevronRight, CreditCard, KeyRound, Cpu,
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
    <aside className="hidden lg:block py-3 pl-3 shrink-0 self-start">
      <div className="relative w-64 rounded-3xl bg-card/40 backdrop-blur-xl border border-border/40 flex flex-col max-h-[calc(100vh-5.5rem)] overflow-hidden">
        {/* Top accent strip */}
        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

        {/* Brand */}
        <div className="px-4 py-4 border-b border-border/30 flex items-center gap-3">
          <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-primary/30 to-cyan-400/20 border border-primary/30 flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.25)]">
            <Cpu className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display font-semibold text-sm tracking-tight">VO Hub</h2>
            <p className="text-[9px] font-mono uppercase tracking-[0.18em] text-muted-foreground/70 -mt-0.5">
              [ADMIN // CTRL]
            </p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-2 pt-3 space-y-2">
          {sidebarSections.map((section) => (
            <SidebarSection key={section.label} section={section} isActive={isActive} />
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-border/20 bg-gradient-to-b from-transparent to-card/30">
          <Link
            to="/"
            className="flex items-center gap-2 text-[12px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="h-3 w-3 group-hover:-translate-x-0.5 transition-transform" />
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
        className="flex items-center justify-between w-full px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-[0.22em] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <span className="text-muted-foreground/30">[</span>
          {section.label}
          <span className="text-muted-foreground/30">]</span>
        </span>
        <ChevronRight className={cn('h-3 w-3 transition-transform duration-200', open && 'rotate-90')} />
      </button>
      {open && (
        <div className="space-y-0.5 pb-1">
          {section.links.map(({ to, label, icon: Icon, exact, badge }) => {
            const active = isActive(to, exact)
            return (
              <Link key={to} to={to}>
                <div
                  className={cn(
                    'group relative flex items-center gap-2.5 px-3 py-2 mx-1 rounded-xl text-[13px] transition-all duration-200',
                    active
                      ? 'bg-gradient-to-r from-primary/15 to-primary/0 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  )}
                >
                  {active && (
                    <>
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-primary rounded-r-full shadow-[0_0_8px_rgba(99,102,241,0.7)]" aria-hidden />
                      <span className="absolute -inset-px rounded-xl bg-primary/5 pointer-events-none" aria-hidden />
                    </>
                  )}
                  <Icon className={cn('h-4 w-4 shrink-0 transition-colors', active ? 'text-primary' : 'group-hover:text-foreground')} />
                  <span className="flex-1 truncate relative">{label}</span>
                  {badge > 0 && (
                    <span className="relative flex h-5 min-w-5 items-center justify-center rounded-md bg-rose-500/15 border border-rose-500/40 text-[10px] font-mono font-bold text-rose-300 px-1.5 shadow-[0_0_8px_rgba(244,63,94,0.3)]">
                      {String(badge).padStart(2, '0')}
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
