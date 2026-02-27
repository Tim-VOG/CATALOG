import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, Inbox, RotateCcw, FolderTree,
  Users, Palette, Mail, CalendarRange, ArrowLeft,
  SlidersHorizontal, FilePlus2, UserPlus, Clock, PenLine, ClipboardList,
  ShieldCheck, Settings,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ── Contextual hover animations per icon ──
const ANIM = {
  dashboard:  'group-hover:scale-110',
  products:   'group-hover:scale-110 group-hover:-translate-y-0.5',
  options:    'group-hover:translate-x-0.5 group-hover:scale-105',
  categories: 'group-hover:scale-110 group-hover:rotate-3',
  requests:   'group-hover:scale-110 group-hover:translate-y-0.5',
  newRequest: 'group-hover:scale-115 group-hover:rotate-12',
  planning:   'group-hover:scale-110 group-hover:-rotate-3',
  returns:    'group-hover:rotate-[-360deg] duration-500',
  users:      'group-hover:scale-110',
  access:     'group-hover:scale-115',
  comms:      'sidebar-icon-wiggle',
  design:     'group-hover:rotate-[-20deg] group-hover:scale-110',
  recipients: 'group-hover:scale-115 group-hover:-translate-y-0.5',
  compose:    'group-hover:translate-x-0.5 group-hover:rotate-[-8deg]',
  history:    'group-hover:rotate-[360deg] duration-500',
  itRequests: 'group-hover:scale-110 group-hover:rotate-[-3deg]',
  formBuild:  'group-hover:rotate-180 duration-300',
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
      { to: '/admin/module-access', label: 'Module Access', icon: ShieldCheck, anim: ANIM.access },
      { to: '/admin/email-templates', label: 'Communications', icon: Mail, anim: ANIM.comms },
      { to: '/admin/design', label: 'Design', icon: Palette, anim: ANIM.design },
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
]

export function AdminSidebar() {
  const location = useLocation()

  const isActive = (to, exact) => {
    if (exact) return location.pathname === to
    return location.pathname.startsWith(to)
  }

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r bg-card shrink-0">
      <div className="p-4 border-b">
        <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          Administration
        </h2>
      </div>

      <nav className="flex-1 p-2 space-y-5 overflow-y-auto">
        {sidebarSections.map((section, idx) => (
          <div key={section.label}>
            {idx > 0 && <div className="border-t border-border/50 mb-3" />}
            <h3 className="px-3 mb-1.5 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">
              {section.label}
            </h3>
            <div className="space-y-0.5">
              {section.links.map(({ to, label, icon: Icon, exact, anim }) => (
                <Link key={to} to={to} className="group">
                  <Button
                    variant={isActive(to, exact) ? 'secondary' : 'ghost'}
                    className={cn('w-full justify-start gap-3')}
                    size="sm"
                  >
                    <Icon className={cn('h-4 w-4 transition-transform duration-200', anim)} />
                    {label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-2 border-t">
        <Link to="/" className="group">
          <Button variant="ghost" className="w-full justify-start gap-3" size="sm">
            <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
            Back to Hub
          </Button>
        </Link>
      </div>
    </aside>
  )
}
