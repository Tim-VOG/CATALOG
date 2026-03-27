import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, Inbox, RotateCcw, FolderTree,
  Users, Palette, Mail, CalendarRange, ArrowLeft,
  SlidersHorizontal, FilePlus2, UserPlus, PenLine, ClipboardList,
  Settings, UserMinus, QrCode, ScrollText, FlaskConical, Monitor,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const sidebarSections = [
  {
    label: 'Catalog',
    defaultOpen: true,
    links: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { to: '/admin/products', label: 'Products', icon: Package },
      { to: '/admin/product-options', label: 'Product Options', icon: SlidersHorizontal },
      { to: '/admin/categories', label: 'Categories', icon: FolderTree },
      { to: '/admin/requests', label: 'Requests', icon: Inbox },
      { to: '/admin/new-request', label: 'New Request', icon: FilePlus2 },
      { to: '/admin/planning', label: 'Planning', icon: CalendarRange },
      { to: '/admin/returns', label: 'Returns', icon: RotateCcw },
      { to: '/admin/users', label: 'Users', icon: Users },
      { to: '/admin/email-templates', label: 'Communications', icon: Mail },
      { to: '/admin/design', label: 'Design', icon: Palette },
    ],
  },
  {
    label: 'QR Inventory',
    defaultOpen: false,
    links: [
      { to: '/admin/qr-codes', label: 'QR Codes', icon: QrCode },
      { to: '/admin/scan-logs', label: 'Scan Logs', icon: ScrollText },
      { to: '/admin/qr-test', label: 'Test Lab', icon: FlaskConical },
    ],
  },
  {
    label: 'Onboarding',
    defaultOpen: false,
    links: [
      { to: '/admin/onboarding', label: 'Recipients', icon: UserPlus, exact: true },
      { to: '/admin/it-requests', label: 'All Requests', icon: ClipboardList },
      { to: '/admin/it-form-builder', label: 'Form Builder', icon: Settings },
    ],
  },
  {
    label: 'Functional Mailbox',
    defaultOpen: false,
    links: [
      { to: '/admin/mailbox-requests', label: 'Requests', icon: Mail, exact: true },
      { to: '/admin/mailbox-form-builder', label: 'Form Builder', icon: Settings },
    ],
  },
  {
    label: 'Offboarding',
    defaultOpen: false,
    links: [
      { to: '/admin/offboarding', label: 'Processes', icon: UserMinus, exact: true },
      { to: '/admin/offboarding-form-builder', label: 'Form Builder', icon: Settings },
    ],
  },
  {
    label: 'IT Tools',
    defaultOpen: false,
    links: [
      { to: '/admin/it-tools', label: 'Overview', icon: Monitor },
    ],
  },
]

function SidebarSection({ section, isActive }) {
  // Auto-open if any link in the section is active
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
        <div className="space-y-0.5 pb-1">
          {section.links.map(({ to, label, icon: Icon, exact }) => {
            const active = isActive(to, exact)
            return (
              <Link key={to} to={to}>
                <div
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-[7px] mx-1 rounded-lg text-[13px] transition-all duration-150',
                    active
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  )}
                >
                  <Icon className={cn('h-[15px] w-[15px] shrink-0', active && 'text-primary')} />
                  {label}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function AdminSidebar() {
  const location = useLocation()

  const isActive = (to, exact) => {
    if (exact) return location.pathname === to
    return location.pathname.startsWith(to)
  }

  return (
    <aside className="hidden lg:block py-3 pl-3 shrink-0 self-start">
      <div className="w-56 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/30 flex flex-col max-h-[calc(100vh-5.5rem)] overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border/20">
          <h2 className="font-display font-semibold text-sm tracking-tight">
            Admin Panel
          </h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">Manage your workspace</p>
        </div>

        {/* All Requests quick link */}
        <div className="px-2 pt-2">
          <Link to="/admin/all-requests">
            <div
              className={cn(
                'flex items-center gap-2.5 px-3 py-[7px] mx-1 rounded-lg text-[13px] transition-all duration-150',
                isActive('/admin/all-requests')
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              )}
            >
              <Inbox className="h-[15px] w-[15px] shrink-0" />
              All Requests
            </div>
          </Link>
        </div>

        {/* Scrollable nav */}
        <nav className="flex-1 overflow-y-auto px-2 pb-2 pt-1 space-y-1">
          {sidebarSections.map((section) => (
            <SidebarSection key={section.label} section={section} isActive={isActive} />
          ))}
        </nav>

        {/* Back link */}
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
