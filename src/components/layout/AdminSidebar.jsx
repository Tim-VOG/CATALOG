import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, Inbox, RotateCcw, FolderTree,
  Users, Palette, Mail, CalendarRange, ArrowLeft,
  SlidersHorizontal, FilePlus2, UserPlus, Clock, PenLine, ClipboardList,
  Settings, UserMinus, QrCode, ScrollText, FlaskConical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ── Contextual hover animations per icon ──
const ANIM = {
  dashboard:    'group-hover:scale-110',
  products:     'group-hover:scale-110 group-hover:-translate-y-0.5',
  options:      'group-hover:translate-x-0.5 group-hover:scale-105',
  categories:   'group-hover:scale-110 group-hover:rotate-3',
  requests:     'group-hover:scale-110 group-hover:translate-y-0.5',
  newRequest:   'group-hover:scale-115 group-hover:rotate-12',
  planning:     'group-hover:scale-110 group-hover:-rotate-3',
  returns:      'group-hover:rotate-[-360deg] duration-500',
  users:        'group-hover:scale-110',
  comms:        'sidebar-icon-wiggle',
  design:       'group-hover:rotate-[-20deg] group-hover:scale-110',
  recipients:   'group-hover:scale-115 group-hover:-translate-y-0.5',
  compose:      'group-hover:translate-x-0.5 group-hover:rotate-[-8deg]',
  history:      'group-hover:rotate-[360deg] duration-500',
  itRequests:   'group-hover:scale-110 group-hover:rotate-[-3deg]',
  formBuild:    'group-hover:rotate-180 duration-300',
  offboarding:  'group-hover:scale-110 group-hover:translate-y-0.5',
  mailbox:      'sidebar-icon-wiggle',
  qrCodes:      'group-hover:scale-110 group-hover:rotate-12',
  scanLogs:     'group-hover:scale-110 group-hover:-translate-y-0.5',
  qrTest:       'group-hover:scale-110 group-hover:rotate-[-8deg]',
}

const sidebarSections = [
  {
    label: 'Catalog',
    links: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true, anim: ANIM.dashboard },
      { to: '/admin/products', label: 'Products', icon: Package, anim: ANIM.products },
      { to: '/admin/product-options', label: 'Product Options', icon: SlidersHorizontal, anim: ANIM.options },
      { to: '/admin/categories', label: 'Categories', icon: FolderTree, anim: ANIM.categories },
      { to: '/admin/requests', label: 'Requests', icon: Inbox, anim: ANIM.requests },
      { to: '/admin/new-request', label: 'New Request', icon: FilePlus2, anim: ANIM.newRequest },
      { to: '/admin/planning', label: 'Planning', icon: CalendarRange, anim: ANIM.planning },
      { to: '/admin/returns', label: 'Returns', icon: RotateCcw, anim: ANIM.returns },
      { to: '/admin/users', label: 'Users', icon: Users, anim: ANIM.users },
      { to: '/admin/email-templates', label: 'Communications', icon: Mail, anim: ANIM.comms },
      { to: '/admin/design', label: 'Design', icon: Palette, anim: ANIM.design },
    ],
  },
  {
    label: 'QR Inventory',
    links: [
      { to: '/admin/qr-codes', label: 'QR Codes', icon: QrCode, anim: ANIM.qrCodes },
      { to: '/admin/scan-logs', label: 'Scan Logs', icon: ScrollText, anim: ANIM.scanLogs },
      { to: '/admin/qr-test', label: 'Test Lab', icon: FlaskConical, anim: ANIM.qrTest },
    ],
  },
  {
    label: 'Onboarding',
    links: [
      { to: '/admin/onboarding', label: 'Recipients', icon: UserPlus, exact: true, anim: ANIM.recipients },
      { to: '/admin/onboarding/compose', label: 'Compose', icon: PenLine, anim: ANIM.compose },
      { to: '/admin/onboarding/history', label: 'History', icon: Clock, anim: ANIM.history },
      { to: '/admin/it-requests', label: 'IT Requests', icon: ClipboardList, anim: ANIM.itRequests },
      { to: '/admin/it-form-builder', label: 'Form Builder', icon: Settings, anim: ANIM.formBuild },
    ],
  },
  {
    label: 'Functional Mailbox',
    links: [
      { to: '/admin/mailbox-requests', label: 'Requests', icon: Mail, exact: true, anim: ANIM.mailbox },
      { to: '/admin/mailbox-form-builder', label: 'Form Builder', icon: Settings, anim: ANIM.formBuild },
    ],
  },
  {
    label: 'Offboarding',
    links: [
      { to: '/admin/offboarding', label: 'Processes', icon: UserMinus, exact: true, anim: ANIM.offboarding },
      { to: '/admin/offboarding-form-builder', label: 'Form Builder', icon: Settings, anim: ANIM.formBuild },
    ],
  },
]

export function AdminSidebar() {
  const location = useLocation()

  const isActive = (to, exact) => {
    if (exact) return location.pathname === to
    return location.pathname.startsWith(to)
  }

  return (
    <aside className="hidden lg:block py-3 pl-3 shrink-0 self-start">
      <div className="w-56 rounded-2xl bg-card/90 backdrop-blur-sm border border-border/40 shadow-card flex flex-col max-h-[calc(100vh-5.5rem)] overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3">
          <h2 className="font-display font-semibold text-[10px] text-muted-foreground uppercase tracking-widest">
            Admin
          </h2>
        </div>

        {/* Scrollable nav */}
        <nav className="flex-1 overflow-y-auto px-2 pb-2 space-y-4">
          {/* All Requests overview link */}
          <div>
            <Link to="/admin/all-requests" className="group">
              <Button
                variant={isActive('/admin/all-requests') ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-2.5 h-8 text-xs"
                size="sm"
              >
                <CalendarRange className={cn('h-3.5 w-3.5 transition-transform duration-200', ANIM.planning)} />
                All Requests
              </Button>
            </Link>
          </div>

          {sidebarSections.map((section, idx) => (
            <div key={section.label}>
              {idx > 0 && <div className="border-t border-border/30 mb-2" />}
              <h3 className="px-2.5 mb-1 text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                {section.label}
              </h3>
              <div className="space-y-0.5">
                {section.links.map(({ to, label, icon: Icon, exact, anim }) => (
                  <Link key={to} to={to} className="group">
                    <Button
                      variant={isActive(to, exact) ? 'secondary' : 'ghost'}
                      className="w-full justify-start gap-2.5 h-8 text-xs"
                      size="sm"
                    >
                      <Icon className={cn('h-3.5 w-3.5 transition-transform duration-200', anim)} />
                      {label}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Back link */}
        <div className="px-2 py-2 border-t border-border/30">
          <Link to="/" className="group">
            <Button variant="ghost" className="w-full justify-start gap-2.5 h-8 text-xs" size="sm">
              <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-1" />
              Back to Hub
            </Button>
          </Link>
        </div>
      </div>
    </aside>
  )
}
