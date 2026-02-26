import { Link, useLocation } from 'react-router-dom'
import { Package, ShoppingCart, ClipboardList, Settings, X, LayoutDashboard, Inbox, RotateCcw, FolderTree, Sun, Moon } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useCartStore } from '@/stores/cart-store'
import { useUIStore } from '@/stores/ui-store'
import { useAppSettings } from '@/hooks/use-settings'
import { useThemeMode, useToggleTheme } from '@/hooks/use-theme'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const userLinks = [
  { to: '/catalog', label: 'Catalog', icon: Package },
  { to: '/cart', label: 'Cart', icon: ShoppingCart },
  { to: '/requests', label: 'My Requests', icon: ClipboardList },
]

const adminLinks = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree },
  { to: '/admin/requests', label: 'Requests', icon: Inbox },
  { to: '/admin/returns', label: 'Returns', icon: RotateCcw },
]

export function MobileNav() {
  const { isAdmin } = useAuth()
  const location = useLocation()
  const cartCount = useCartStore((s) => s.items.length)
  const mobileNavOpen = useUIStore((s) => s.mobileNavOpen)
  const toggleMobileNav = useUIStore((s) => s.toggleMobileNav)
  const { data: settings } = useAppSettings()
  const themeMode = useThemeMode()
  const toggleTheme = useToggleTheme()

  const appName = settings?.app_name || 'VO Gear Hub'
  const logoUrl = settings?.logo_url
  const tagline = settings?.header_tagline || 'Book. Borrow. Return.'

  if (!mobileNavOpen) return null

  const isActive = (to, exact) => {
    if (exact) return location.pathname === to
    return location.pathname.startsWith(to)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={toggleMobileNav} />
      <div className="fixed inset-y-0 left-0 w-72 bg-card border-r z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2 text-primary">
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="h-6 w-auto object-contain" />
            ) : (
              <Package className="h-5 w-5" />
            )}
            <div className="flex flex-col leading-tight">
              <span className="font-display font-bold text-lg">{appName}</span>
              <span className="text-[10px] text-muted-foreground font-normal tracking-wide">{tagline}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleMobileNav}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {userLinks.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} onClick={toggleMobileNav}>
              <Button
                variant={isActive(to) ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-3"
                size="sm"
              >
                <Icon className="h-4 w-4" />
                {label}
                {to === '/cart' && cartCount > 0 && (
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {cartCount}
                  </span>
                )}
              </Button>
            </Link>
          ))}

          {isAdmin && (
            <>
              <div className="my-2 border-t" />
              <p className="px-3 py-1 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                Admin
              </p>
              {adminLinks.map(({ to, label, icon: Icon, exact }) => (
                <Link key={to} to={to} onClick={toggleMobileNav}>
                  <Button
                    variant={isActive(to, exact) ? 'secondary' : 'ghost'}
                    className="w-full justify-start gap-3"
                    size="sm"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Button>
                </Link>
              ))}
            </>
          )}
        </nav>

        {/* Theme toggle at bottom */}
        <div className="p-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3"
            onClick={toggleTheme}
          >
            {themeMode === 'dark' ? (
              <>
                <Sun className="h-4 w-4" />
                Switch to Light Mode
              </>
            ) : (
              <>
                <Moon className="h-4 w-4" />
                Switch to Dark Mode
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  )
}
