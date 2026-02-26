import { Link, useLocation } from 'react-router-dom'
import { Package, ShoppingCart, Settings, Menu, ClipboardList, Sun, Moon } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useCartStore } from '@/stores/cart-store'
import { useUIStore } from '@/stores/ui-store'
import { useAppSettings } from '@/hooks/use-settings'
import { useThemeMode, useToggleTheme } from '@/hooks/use-theme'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { UserMenu } from './UserMenu'
import { NotificationBell } from './NotificationBell'

export function Header() {
  const { isAdmin } = useAuth()
  const location = useLocation()
  const cartCount = useCartStore((s) => s.items.length)
  const toggleMobileNav = useUIStore((s) => s.toggleMobileNav)
  const { data: settings } = useAppSettings()
  const themeMode = useThemeMode()
  const toggleTheme = useToggleTheme()

  const appName = settings?.app_name || 'VO Gear Hub'
  const logoUrl = settings?.logo_url
  const tagline = settings?.header_tagline || 'Book. Borrow. Return.'

  const navLinks = [
    { to: '/catalog', label: 'Catalog', icon: Package },
    { to: '/requests', label: 'My Requests', icon: ClipboardList },
  ]

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="flex h-14 items-center px-4 gap-4">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleMobileNav}>
          <Menu className="h-5 w-5" />
        </Button>

        <Link to="/" className="flex items-center gap-2 text-primary">
          {logoUrl ? (
            <img src={logoUrl} alt={appName} className="h-7 w-auto object-contain" />
          ) : (
            <Package className="h-6 w-6" />
          )}
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="font-display text-lg font-bold">{appName}</span>
            <span className="text-[10px] text-muted-foreground font-normal tracking-wide">{tagline}</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-6">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to}>
              <Button
                variant={location.pathname.startsWith(to) ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-2"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            </Link>
          ))}

          {isAdmin && (
            <>
              <div className="mx-2 h-6 w-px bg-border" />
              <Link to="/admin">
                <Button
                  variant={location.pathname.startsWith('/admin') ? 'secondary' : 'ghost'}
                  size="sm"
                  className="gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Admin
                </Button>
              </Link>
              <NotificationBell />
            </>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          {!isAdmin && <NotificationBell />}

          {/* Theme toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={toggleTheme}
              >
                {themeMode === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
                <span className="sr-only">
                  {themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {themeMode === 'dark' ? 'Light mode' : 'Dark mode'}
            </TooltipContent>
          </Tooltip>

          {/* Cart */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/cart">
                <Button
                  variant={location.pathname === '/cart' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="relative h-9 w-9"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {cartCount}
                    </span>
                  )}
                  <span className="sr-only">Cart</span>
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              {cartCount > 0 ? `Cart (${cartCount})` : 'Cart'}
            </TooltipContent>
          </Tooltip>
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
