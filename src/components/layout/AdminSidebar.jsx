import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, Inbox, RotateCcw, FolderTree,
  Users, Palette, Mail, CalendarRange, ArrowLeft,
  SlidersHorizontal, FilePlus2, UserPlus, Clock, PenLine, ClipboardList,
  ShieldCheck, Settings,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const sidebarSections = [
  {
    label: 'Catalog',
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
      { to: '/admin/module-access', label: 'Module Access', icon: ShieldCheck },
      { to: '/admin/email-templates', label: 'Communications', icon: Mail },
      { to: '/admin/design', label: 'Design', icon: Palette },
    ],
  },
  {
    label: 'Onboarding',
    links: [
      { to: '/admin/onboarding', label: 'Recipients', icon: UserPlus, exact: true },
      { to: '/admin/onboarding/compose', label: 'Compose', icon: PenLine },
      { to: '/admin/onboarding/history', label: 'History', icon: Clock },
      { to: '/admin/it-requests', label: 'IT Requests', icon: ClipboardList },
      { to: '/admin/it-form-builder', label: 'Form Builder', icon: Settings },
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
    <aside className="hidden lg:flex w-64 flex-col border-r bg-card min-h-[calc(100vh-3.5rem)]">
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
              {section.links.map(({ to, label, icon: Icon, exact }) => (
                <Link key={to} to={to} className="group">
                  <Button
                    variant={isActive(to, exact) ? 'secondary' : 'ghost'}
                    className={cn('w-full justify-start gap-3')}
                    size="sm"
                  >
                    <Icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-6" />
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
            <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:scale-110 group-hover:-translate-x-0.5" />
            Back to Hub
          </Button>
        </Link>
      </div>
    </aside>
  )
}
