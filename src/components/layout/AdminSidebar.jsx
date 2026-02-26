import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Package, Inbox, RotateCcw, FolderTree, Users, Palette, Mail, CalendarRange, ArrowLeft, SlidersHorizontal, FilePlus2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const sidebarLinks = [
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

      <nav className="flex-1 p-2 space-y-1">
        {sidebarLinks.map(({ to, label, icon: Icon, exact }) => (
          <Link key={to} to={to}>
            <Button
              variant={isActive(to, exact) ? 'secondary' : 'ghost'}
              className={cn('w-full justify-start gap-3')}
              size="sm"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          </Link>
        ))}
      </nav>

      <div className="p-2 border-t">
        <Link to="/catalog">
          <Button variant="ghost" className="w-full justify-start gap-3" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back to catalog
          </Button>
        </Link>
      </div>
    </aside>
  )
}
