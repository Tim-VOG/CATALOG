import { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, Inbox, Users, Palette, Mail, ArrowLeft,
  UserPlus, UserMinus, Monitor, BarChart3, QrCode, ScrollText, CalendarRange,
  ChevronRight, CreditCard, KeyRound, ShieldCheck, CalendarClock, PackageSearch,
  Activity, Wrench, Building2, AlarmClock, MessageSquare, Megaphone, MailCheck,
  CalendarDays, CalendarOff, PackageCheck, Clock, Search, PanelLeftClose,
  PanelLeftOpen, Inbox as InboxIcon,
} from 'lucide-react'
import { useLoanRequests } from '@/hooks/use-loan-requests'
import { useItRequests } from '@/hooks/use-it-requests'
import { useMailboxRequests } from '@/hooks/use-mailbox-requests'
import { useOnboardingEmails } from '@/hooks/use-onboarding'
import { useFeedback } from '@/hooks/use-feedback'
import { useAuth } from '@/lib/auth'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

const COLLAPSE_KEY = 'vo-admin-sidebar-collapsed'
const OPEN_KEY = 'vo-admin-sidebar-open'
// Remember the sidebar scroll position across navigations so it never
// jumps back to the top when you open a page from a lower group.
let savedNavScroll = 0

export function AdminSidebar() {
  const location = useLocation()
  const { isAdmin } = useAuth()
  const { t } = useTranslation()

  const { data: loanReqs = [] } = useLoanRequests()
  const { data: itReqs = [] } = useItRequests()
  const { data: mailboxReqs = [] } = useMailboxRequests()
  const { data: onboardingEmails = [] } = useOnboardingEmails()
  const { data: feedbackItems = [] } = useFeedback()
  const newFeedback = feedbackItems.filter((f: any) => f.status === 'new').length

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

  // ── Information architecture ──────────────────────────────────────────
  // Grouped by the job to be done, not by database table. `managerOk` links
  // are visible to HR managers; everything else is admin-only.
  const allSections = [
    {
      id: 'overview', label: t('admin.sidebar.sections.overview'),
      links: [
        { to: '/admin', label: t('admin.sidebar.links.dashboard'), icon: LayoutDashboard, exact: true, managerOk: true },
        { to: '/admin/planning', label: t('admin.sidebar.links.planning'), icon: CalendarRange, managerOk: true },
      ],
    },
    {
      id: 'requests', label: t('admin.sidebar.sections.requests'),
      links: [
        { to: '/admin/requests', label: t('admin.sidebar.links.equipment'), icon: Inbox, badge: pendingCounts.equipment },
        { to: '/admin/extensions', label: t('admin.sidebar.links.extensions'), icon: CalendarClock },
        { to: '/admin/overdue', label: t('admin.sidebar.links.overdue'), icon: AlarmClock },
        { to: '/admin/issues', label: t('admin.sidebar.links.issues'), icon: Wrench },
      ],
    },
    {
      id: 'people', label: t('admin.sidebar.sections.people'),
      links: [
        { to: '/admin/onboarding/requests', label: t('admin.sidebar.links.onboarding'), icon: UserPlus, badge: pendingCounts.onboarding, managerOk: true },
        { to: '/admin/offboarding-requests', label: t('admin.sidebar.links.offboarding'), icon: UserMinus, badge: pendingCounts.offboarding, managerOk: true },
        { to: '/admin/calendar', label: t('admin.sidebar.links.calendar'), icon: CalendarDays, managerOk: true },
        { to: '/admin/users', label: t('admin.sidebar.links.allUsers'), icon: Users },
      ],
    },
    {
      id: 'mailboxes', label: t('admin.sidebar.sections.mailboxes'),
      links: [
        { to: '/admin/mailbox-requests', label: t('admin.sidebar.links.mailbox'), icon: Mail, badge: pendingCounts.mailbox, managerOk: true },
        { to: '/admin/mailbox-announcement', label: t('admin.sidebar.links.mailboxAnnouncement'), icon: Megaphone, managerOk: true },
        { to: '/admin/shared-mailboxes', label: t('admin.sidebar.links.sharedMailboxes'), icon: InboxIcon },
      ],
    },
    {
      id: 'inventory', label: t('admin.sidebar.sections.inventory'),
      links: [
        { to: '/admin/fleet', label: t('admin.sidebar.links.fleet'), icon: PackageCheck },
        { to: '/admin/products', label: t('admin.sidebar.links.products'), icon: Package },
        { to: '/admin/it-inventory', label: t('admin.sidebar.links.itInventory'), icon: ScrollText },
        { to: '/admin/local-it', label: t('admin.sidebar.links.localIt'), icon: Monitor },
        { to: '/admin/reservations', label: t('admin.sidebar.links.reservations'), icon: CalendarClock },
        { to: '/admin/device-credentials', label: t('admin.sidebar.links.deviceCredentials'), icon: KeyRound },
      ],
    },
    {
      id: 'tracking', label: t('admin.sidebar.sections.tracking'),
      links: [
        { to: '/admin/qr-codes', label: t('admin.sidebar.links.qrCodes'), icon: QrCode },
        { to: '/admin/scan-logs', label: t('admin.sidebar.links.scanLogs'), icon: ScrollText },
        { to: '/admin/device-history', label: t('admin.sidebar.links.deviceHistory'), icon: Clock },
        { to: '/admin/lost-items', label: t('admin.sidebar.links.lostItems'), icon: PackageSearch },
      ],
    },
    {
      id: 'insights', label: t('admin.sidebar.sections.insights'),
      links: [
        { to: '/admin/stats', label: t('admin.sidebar.links.statistics'), icon: BarChart3 },
        { to: '/admin/utilization', label: t('admin.sidebar.links.utilization'), icon: Activity },
        { to: '/admin/feedback', label: t('admin.feedback.title'), icon: MessageSquare, badge: newFeedback, managerOk: true },
      ],
    },
    {
      id: 'system', label: t('admin.sidebar.sections.system'),
      links: [
        { to: '/admin/business-units', label: t('admin.sidebar.links.businessUnits'), icon: Building2 },
        { to: '/admin/email-templates', label: t('admin.sidebar.links.communications'), icon: Mail },
        { to: '/admin/email-log', label: t('admin.sidebar.links.emailLog'), icon: MailCheck, managerOk: true },
        { to: '/admin/holidays', label: t('admin.sidebar.links.holidays'), icon: CalendarOff },
        { to: '/admin/design', label: t('admin.sidebar.links.designBranding'), icon: Palette },
        { to: '/admin/subscription-plans', label: t('admin.sidebar.links.subscriptionPlans'), icon: CreditCard },
        { to: '/admin/audit', label: t('admin.sidebar.links.auditLog'), icon: ShieldCheck },
        { to: '/admin/system-health', label: t('admin.sidebar.links.systemHealth'), icon: Activity },
      ],
    },
  ]

  const sections = allSections
    .map((s: any) => ({ ...s, links: isAdmin ? s.links : s.links.filter((l: any) => l.managerOk) }))
    .filter((s: any) => s.links.length > 0)

  const isActive = (to: any, exact: any) =>
    exact ? location.pathname === to : location.pathname.startsWith(to)

  // ── Persisted UI state (collapse + open groups) ──
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === '1' } catch { return false }
  })
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(OPEN_KEY)
      if (raw) return JSON.parse(raw)
    } catch { /* ignore */ }
    return { overview: true, requests: true, people: true, mailboxes: false, inventory: false, tracking: false, insights: false, system: false }
  })
  const [query, setQuery] = useState('')

  useEffect(() => { try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0') } catch { /* */ } }, [collapsed])
  useEffect(() => { try { localStorage.setItem(OPEN_KEY, JSON.stringify(openGroups)) } catch { /* */ } }, [openGroups])

  // Keep the sidebar's scroll where the user left it on every navigation.
  const navRef = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const el = navRef.current
    if (el && el.scrollTop !== savedNavScroll) el.scrollTop = savedNavScroll
  }, [location.pathname])

  const toggleGroup = (id: string) => setOpenGroups((p) => ({ ...p, [id]: !p[id] }))

  // Search flattens across all groups.
  const q = query.trim().toLowerCase()
  const searchResults = q
    ? sections.flatMap((s: any) => s.links).filter((l: any) => l.label.toLowerCase().includes(q))
    : null

  return (
    <aside className="hidden lg:block py-4 pl-4 shrink-0 self-start">
      <div className={cn('flex flex-col max-h-[calc(100vh-5.5rem)] transition-[width] duration-200 ease-out', collapsed ? 'w-[64px]' : 'w-60')}>
        {/* Brand + collapse */}
        <div className={cn('flex items-center gap-2.5 pb-4', collapsed ? 'px-1.5 justify-center' : 'px-3')}>
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-[11px] font-bold text-primary-foreground shrink-0">VO</div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <h2 className="font-display font-semibold text-sm tracking-tight leading-none">VO Hub</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">{t('admin.admin')}</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className={cn('h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors', collapsed && 'hidden')}
            title={t('admin.sidebar.collapse')}
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        {collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="mx-auto mb-2 h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title={t('admin.sidebar.expand')}
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}

        {/* Search */}
        {!collapsed && (
          <div className="relative px-3 pb-3">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('admin.sidebar.search')}
              className="w-full h-8 rounded-lg bg-muted/40 border border-transparent pl-8 pr-2 text-xs outline-none focus:border-primary/30 focus:bg-background transition-colors placeholder:text-muted-foreground/70"
            />
          </div>
        )}

        {/* Nav */}
        <nav
          ref={navRef}
          onScroll={(e) => { savedNavScroll = (e.currentTarget as HTMLElement).scrollTop }}
          className={cn('flex-1 overflow-y-auto overflow-x-hidden pr-1', collapsed ? 'space-y-1 px-1' : 'space-y-4')}
        >
          {searchResults ? (
            <div className="space-y-px">
              {searchResults.length === 0 && (
                <p className="px-3 py-4 text-xs text-muted-foreground">{t('admin.sidebar.noResults')}</p>
              )}
              {searchResults.map((l: any) => (
                <SidebarLink key={l.to} link={l} active={isActive(l.to, l.exact)} collapsed={false} />
              ))}
            </div>
          ) : (
            sections.map((section: any) => (
              <SidebarGroup
                key={section.id}
                section={section}
                open={collapsed ? true : (openGroups[section.id] ?? false)}
                collapsed={collapsed}
                onToggle={() => toggleGroup(section.id)}
                isActive={isActive}
              />
            ))
          )}
        </nav>

        {/* Footer */}
        <div className="pt-3 mt-3 border-t border-border/40">
          <Link
            to="/"
            className={cn('group flex items-center gap-2 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/30', collapsed ? 'px-0 justify-center' : 'px-3')}
            title={collapsed ? t('admin.backToHub') : undefined}
          >
            <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform shrink-0" />
            {!collapsed && t('admin.backToHub')}
          </Link>
        </div>
      </div>
    </aside>
  )
}

function SidebarGroup({ section, open, collapsed, onToggle, isActive }: any) {
  return (
    <div>
      {!collapsed ? (
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center justify-between w-full px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          {section.label}
          <ChevronRight className={cn('h-3 w-3 transition-transform duration-200', open && 'rotate-90')} />
        </button>
      ) : (
        <div className="mx-2 my-1.5 h-px bg-border/50" />
      )}
      {open && (
        <div className="space-y-px">
          {section.links.map((link: any) => (
            <SidebarLink key={link.to} link={link} active={isActive(link.to, link.exact)} collapsed={collapsed} />
          ))}
        </div>
      )}
    </div>
  )
}

function SidebarLink({ link, active, collapsed }: any) {
  const { to, label, icon: Icon, badge } = link
  return (
    <Link to={to} className="block group/link relative">
      <div
        className={cn(
          'relative flex items-center rounded-lg text-sm transition-colors duration-150',
          collapsed ? 'justify-center h-9 w-9 mx-auto' : 'gap-2.5 px-3 py-1.5',
          active
            ? 'bg-primary/10 text-foreground font-medium'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
        )}
        title={collapsed ? label : undefined}
      >
        {/* Active accent bar */}
        {active && !collapsed && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-primary" />}
        <Icon className={cn('h-4 w-4 shrink-0', active && 'text-primary')} />
        {!collapsed && <span className="flex-1 truncate">{label}</span>}
        {!collapsed && badge > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-primary/15 text-[10px] font-semibold text-primary px-1.5">{badge}</span>
        )}
        {collapsed && badge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
        )}
        {/* Tooltip when collapsed */}
        {collapsed && (
          <span className="pointer-events-none absolute left-full ml-2 z-50 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background opacity-0 shadow-lg transition-opacity duration-100 group-hover/link:opacity-100">
            {label}
          </span>
        )}
      </div>
    </Link>
  )
}
