import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, useScroll, useMotionValueEvent } from 'motion/react'
import { Package, ShoppingCart, Settings, Menu, Home, Sun, Moon, Search, X } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useCartStore } from '@/stores/cart-store'
import { useUIStore } from '@/stores/ui-store'
import { useAppSettings } from '@/hooks/use-settings'
import { useThemeMode, useToggleTheme } from '@/hooks/use-theme'
import { useProductSearch } from '@/hooks/use-product-search'
import { Button } from '@/components/ui/button'
import { ScalePop } from '@/components/ui/motion'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { DeviceIconInline } from '@/components/common/DeviceIcon'
import { UserMenu } from './UserMenu'
import { NotificationBell } from './NotificationBell'
import { cn } from '@/lib/utils'

function HeaderSearch() {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef(null)
  const mobileInputRef = useRef(null)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  const { results, hasResults } = useProductSearch(query)
  const showDropdown = isOpen && query.length >= 2

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setSelectedIndex(-1)
  }, [results])

  // Cmd+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSelect = useCallback((product) => {
    setQuery('')
    setIsOpen(false)
    setMobileOpen(false)
    navigate(`/catalog/${product.id}`)
  }, [navigate])

  const handleKeyDown = useCallback((e) => {
    if (!showDropdown || !hasResults) {
      if (e.key === 'Escape') {
        setIsOpen(false)
        setMobileOpen(false)
        inputRef.current?.blur()
        mobileInputRef.current?.blur()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelect(results[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setMobileOpen(false)
        inputRef.current?.blur()
        mobileInputRef.current?.blur()
        break
    }
  }, [showDropdown, hasResults, results, selectedIndex, handleSelect])

  const handleMobileToggle = () => {
    setMobileOpen((prev) => !prev)
    if (!mobileOpen) {
      setTimeout(() => mobileInputRef.current?.focus(), 100)
    } else {
      setQuery('')
      setIsOpen(false)
    }
  }

  const SearchResults = ({ className }) => (
    <motion.div
      initial={{ opacity: 0, y: -4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={cn(
        'absolute top-full left-0 right-0 mt-2 rounded-xl border bg-popover/95 backdrop-blur-xl shadow-float overflow-hidden z-50',
        className
      )}
    >
      {hasResults ? (
        <div className="py-1.5">
          {results.map((product, i) => (
            <button
              key={product.id}
              type="button"
              className={cn(
                'flex items-center gap-3 w-full px-4 py-2.5 text-left transition-all duration-150',
                i === selectedIndex
                  ? 'bg-primary/10 text-foreground'
                  : 'hover:bg-muted/50 text-foreground'
              )}
              onClick={() => handleSelect(product)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <DeviceIconInline
                name={product.name}
                category={product.category_name}
                subType={product.sub_type}
                className="shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{product.name}</div>
                <div className="text-xs text-muted-foreground truncate">{product.category_name}</div>
              </div>
              {product.stock_quantity != null && (
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {product.stock_quantity} in stock
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
          No products found for &ldquo;{query}&rdquo;
        </div>
      )}
    </motion.div>
  )

  return (
    <>
      {/* Desktop search — centered */}
      <div className="hidden md:block relative flex-1 max-w-md mx-4" ref={dropdownRef}>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setIsOpen(true)
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search products..."
            className={cn(
              'w-full h-9 pl-10 pr-16 text-sm rounded-full',
              'bg-muted/40 border border-border/50',
              'placeholder:text-muted-foreground/60',
              'transition-all duration-200',
              'focus:outline-none focus:bg-muted/60 focus:border-primary/30 focus:ring-2 focus:ring-primary/10',
            )}
          />
          {/* Cmd+K hint */}
          {!query && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pointer-events-none">
              <kbd className="text-[10px] text-muted-foreground/50 font-mono bg-muted/60 rounded px-1.5 py-0.5 border border-border/30">⌘K</kbd>
            </div>
          )}
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); inputRef.current?.focus() }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {showDropdown && <SearchResults />}
      </div>

      {/* Mobile search toggle button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden h-9 w-9"
        onClick={handleMobileToggle}
        aria-label="Search"
      >
        {mobileOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
      </Button>

      {/* Mobile search overlay */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="absolute top-full left-0 right-0 glass-panel p-3 shadow-lg md:hidden z-50"
        >
          <div className="relative" ref={!dropdownRef.current ? dropdownRef : undefined}>
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              ref={mobileInputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setIsOpen(true)
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search products..."
              className={cn(
                'w-full h-10 pl-10 pr-4 text-sm rounded-full',
                'bg-muted/40 border border-border/50',
                'placeholder:text-muted-foreground/60',
                'focus:outline-none focus:bg-muted/60 focus:border-primary/30 focus:ring-2 focus:ring-primary/10',
              )}
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); mobileInputRef.current?.focus() }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {showDropdown && <SearchResults className="mt-2" />}
          </div>
        </motion.div>
      )}
    </>
  )
}

export function Header() {
  const { isAdmin } = useAuth()
  const location = useLocation()
  const cartCount = useCartStore((s) => s.items.length)
  const toggleMobileNav = useUIStore((s) => s.toggleMobileNav)
  const { data: settings } = useAppSettings()
  const themeMode = useThemeMode()
  const toggleTheme = useToggleTheme()

  // Scroll-aware header shrink
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)
  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 20)
  })

  const appName = settings?.app_name || 'VO Gear Hub'
  const logoUrl = themeMode === 'dark'
    ? (settings?.logo_url_dark || settings?.logo_url)
    : (settings?.logo_url_light || settings?.logo_url)
  const tagline = settings?.header_tagline || 'Book. Borrow. Return.'

  const navLinks = [
    { to: '/', label: 'Hub', icon: Home, exact: true },
    { to: '/catalog', label: 'Catalog', icon: Package },
  ]

  return (
    <motion.header
      className={cn(
        'sticky top-0 z-40 border-b border-primary/10',
        'bg-card/80 backdrop-blur-xl backdrop-saturate-150',
        'supports-[backdrop-filter]:bg-card/60',
        'shadow-[0_1px_3px_0_rgb(var(--color-primary)/0.08)]',
        'after:absolute after:bottom-0 after:inset-x-0 after:h-px',
        'after:bg-gradient-to-r after:from-transparent after:via-primary/20 after:to-transparent',
        'transition-[box-shadow] duration-300',
        scrolled && 'shadow-elevated',
      )}
      animate={{ height: scrolled ? 56 : 64 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div className="flex h-full items-center px-4 gap-3">
        {/* ── Left zone: hamburger + logo + nav ─────── */}
        <div className="flex items-center gap-3 shrink-0">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleMobileNav} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>

          <Link to="/" className="flex items-center gap-2.5 text-primary group">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={appName}
                className="h-7 w-auto object-contain"
              />
            ) : (
              <Package className="h-6 w-6" />
            )}
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="font-display text-lg font-bold">{appName}</span>
              <motion.span
                className="text-[10px] text-muted-foreground font-normal tracking-wide"
                animate={{ opacity: scrolled ? 0 : 1, height: scrolled ? 0 : 'auto' }}
                transition={{ duration: 0.2 }}
              >
                {tagline}
              </motion.span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 ml-4 relative">
            {navLinks.map(({ to, label, icon: Icon, exact }) => {
              const active = exact ? location.pathname === to : location.pathname.startsWith(to)
              return (
                <Link key={to} to={to} className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'gap-2 relative z-10 transition-colors duration-200',
                      active && 'text-primary',
                    )}
                  >
                    <motion.span whileHover={{ scale: 1.15, rotate: -5 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
                      <Icon className="h-4 w-4" />
                    </motion.span>
                    {label}
                  </Button>
                  {active && (
                    <motion.div
                      layoutId="header-nav-indicator"
                      className="absolute inset-0 rounded-md bg-secondary"
                      style={{ zIndex: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </Link>
              )
            })}

            {isAdmin && (
              <>
                <div className="mx-2 h-6 w-px bg-gradient-to-b from-transparent via-border/60 to-transparent" />
                <Link to="/admin" className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'gap-2 relative z-10 transition-colors duration-200',
                      location.pathname.startsWith('/admin') && 'text-primary',
                    )}
                  >
                    <Settings className="h-4 w-4" />
                    Admin
                  </Button>
                  {location.pathname.startsWith('/admin') && (
                    <motion.div
                      layoutId="header-nav-indicator"
                      className="absolute inset-0 rounded-md bg-secondary"
                      style={{ zIndex: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* ── Center zone: search ──────────────────── */}
        <HeaderSearch />

        {/* ── Right zone: actions ──────────────────── */}
        <div className="flex items-center gap-1 shrink-0">
          <NotificationBell />

          {/* Theme toggle with spin animation */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={toggleTheme}
              >
                <motion.div
                  key={themeMode}
                  initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  {themeMode === 'dark' ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </motion.div>
                <span className="sr-only">
                  {themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {themeMode === 'dark' ? 'Light mode' : 'Dark mode'}
            </TooltipContent>
          </Tooltip>

          {/* Cart — hidden on mobile */}
          <div className="max-md:hidden">
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
                      <ScalePop motionKey={cartCount}>
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-glow-primary">
                          {cartCount}
                        </span>
                      </ScalePop>
                    )}
                    <span className="sr-only">Cart</span>
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                {cartCount > 0 ? `Cart (${cartCount})` : 'Cart'}
              </TooltipContent>
            </Tooltip>
          </div>
          <UserMenu />
        </div>
      </div>
    </motion.header>
  )
}
