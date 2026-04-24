import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, Inbox,
  Users, Palette, Mail, ArrowLeft,
  UserPlus, UserMinus, ClipboardList,
  Settings, QrCode, ScrollText,
  ChevronDown, CreditCard,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const sidebarSections = [
  {
    label: 'Overview',
    defaultOpen: true,
    links: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: 'Requests',
    defaultOpen: true,
    links: [
      { to: '/admin/requests', label: 'Equipment', icon: Inbox },
      { to: '/admin/onboarding-requests', label: 'Onboarding', icon: UserPlus },
      { to: '/admin/offboarding-requests', label: 'Offboarding', icon: UserMinus },
      { to: '/admin/mailbox-requests', label: 'Mailbox', icon: Mail },
      { to: '/admin/it-requests', label: 'IT Requests', icon: ClipboardList },
    ],
  },
  {
    label: 'Inventory',
    defaultOpen: false,
    links: [
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
        <div className="px-4 py-3 border-b border-border/20">
          <h2 className="font-display font-semibold text-sm tracking-tight">Admin Panel</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">Manage your workspace</p>
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
