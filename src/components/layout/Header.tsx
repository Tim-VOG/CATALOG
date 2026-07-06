import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Package, Settings, Menu, Home, Sun, Moon, Search, X, QrCode, User, ShoppingCart, HelpCircle, Sparkles } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useTranslation } from 'react-i18next'

import { useUIStore } from '@/stores/ui-store'
import { useCart } from '@/hooks/use-cart'
import { useAppSettings } from '@/hooks/use-settings'
import { useThemeMode, useToggleTheme } from '@/hooks/use-theme'
import { useProductSearch } from '@/hooks/use-product-search'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { BlurImage } from '@/components/common/BlurImage'
import { UserMenu } from './UserMenu'
import { cn } from '@/lib/utils'

function HeaderSearch() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<any>(null)
  const mobileInputRef = useRef<any>(null)
  const dropdownRef = useRef<any>(null)
  const navigate = useNavigate()

  const { results, hasResults } = useProductSearch(query)
  const showDropdown = isOpen && query.length >= 2

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: any) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(-1)
  }, [results])

  const handleSelect = useCallback((product: any) => {
    // The standalone product detail page is gone — drop the user on the
    // catalog with the product name pre-filled in the search so they can
    // act on it (heart, add to cart, etc.) without losing context.
    setIsOpen(false)
    setMobileOpen(false)
    navigate(`/catalog?q=${encodeURIComponent(product.name || '')}`)
    setTimeout(() => setQuery(''), 0)
  }, [navigate])

  const handleKeyDown = useCallback((e: any) => {
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
        setSelectedIndex((prev: any) => (prev < results.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev: any) => (prev > 0 ? prev - 1 : results.length - 1))
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
    setMobileOpen((prev: any) => !prev)
    if (!mobileOpen) {
      setTimeout(() => mobileInputRef.current?.focus(), 100)
    } else {
      setQuery('')
      setIsOpen(false)
    }
  }

  const SearchResults = ({ className  }: any) => (
    <div className={cn(
      'absolute top-full left-0 right-0 mt-2 rounded-xl border bg-popover shadow-card overflow-hidden z-50',
      className
    )}>
      {hasResults ? (
        <div className="py-1.5">
          {results.map((product: any, i: any) => (
            <button
              key={product.id}
              type="button"
              className={cn(
                'flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors',
                i === selectedIndex
                  ? 'bg-primary/10 text-foreground'
                  : 'hover:bg-muted/50 text-foreground'
              )}
              onClick={() => handleSelect(product)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <div className="h-9 w-9 rounded-lg overflow-hidden bg-muted shrink-0">
                {product.image_url ? (
                  <BlurImage
                    src={product.image_url}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
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
          {t('comp.header.noProductsFound', { query })}
        </div>
      )}
    </div>
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
            onChange={(e: any) => {
              setQuery(e.target.value)
              setIsOpen(true)
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={t('comp.header.searchPlaceholderDesktop')}
            data-search-input
            className={cn(
              'w-full h-9 pl-10 pr-4 text-sm rounded-full',
              'bg-muted/40 border border-border/50',
              'placeholder:text-muted-foreground/60',
              'transition-all duration-200',
              'focus:outline-none focus:bg-muted/60 focus:border-primary/30 focus:ring-2 focus:ring-primary/10',
            )}
          />
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
        className="md:hidden h-8 w-8 sm:h-9 sm:w-9"
        onClick={handleMobileToggle}
        aria-label={t('comp.header.search')}
      >
        {mobileOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
      </Button>

      {/* Mobile search overlay */}
      {mobileOpen && (
        <div className="absolute top-full left-0 right-0 bg-card border-b border-border p-3 shadow-lg md:hidden z-50">
          <div className="relative" ref={!dropdownRef.current ? dropdownRef : undefined}>
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              ref={mobileInputRef}
              type="text"
              value={query}
              onChange={(e: any) => {
                setQuery(e.target.value)
                setIsOpen(true)
              }}
              onKeyDown={handleKeyDown}
              placeholder={t('comp.header.searchPlaceholderMobile')}
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
        </div>
      )}
    </>
  )
}

function CartButton() {
  const { t } = useTranslation()
  const { data: cartItems = [] } = useCart()
  const itemCount = cartItems.reduce((sum: any, i: any) => sum + i.quantity, 0)
  return (
    <Link to="/cart">
      <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-9 sm:w-9" aria-label={itemCount > 0 ? t('comp.header.cartWithItems', { count: itemCount }) : t('comp.header.cart')}>
        <ShoppingCart className="h-4 w-4" />
        {itemCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {itemCount > 9 ? '9+' : itemCount}
          </span>
        )}
      </Button>
    </Link>
  )
}

export function Header({ onOpenTour  }: any) {
  const { t } = useTranslation()
  const { isAdmin, isStaff } = useAuth()
  const location = useLocation()
  const toggleMobileNav = useUIStore((s: any) => s.toggleMobileNav)
  const { data: settings } = useAppSettings()
  const themeMode = useThemeMode()
  const toggleTheme = useToggleTheme()

  const appName = settings?.app_name || 'VO Hub'
  const logoUrl = themeMode === 'dark'
    ? (settings?.logo_url_dark || settings?.logo_url)
    : (settings?.logo_url_light || settings?.logo_url)
  const tagline = settings?.header_tagline || ''

  return (
    <header className="sticky top-0 z-40 border-b border-primary/10 bg-card/80 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-card/60 shadow-[0_1px_3px_0_rgb(var(--color-primary)/0.08)] after:absolute after:bottom-0 after:inset-x-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-primary/20 after:to-transparent">
      <div className="flex h-16 items-center px-2 sm:px-4">
        {/* ── Left zone: hamburger + logo ─────── */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 sm:h-9 sm:w-9" onClick={toggleMobileNav} aria-label={t('comp.header.openMenu')}>
            <Menu className="h-5 w-5" />
          </Button>

          <Link to="/" className="flex items-center gap-2.5 text-primary">
            {logoUrl ? (
              // In dark mode, force the (monochrome) logo to pure white so it's
              // always legible on the dark header — brightness-0 → black, then
              // invert → white, regardless of the uploaded file's colour.
              <img
                src={logoUrl}
                alt={appName}
                className={cn('h-7 w-auto object-contain', themeMode === 'dark' && 'brightness-0 invert')}
              />
            ) : (
              <Package className="h-6 w-6" />
            )}
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="font-display text-lg font-bold">{appName}</span>
              {tagline && <span className="text-[10px] text-muted-foreground font-normal tracking-wide">{tagline}</span>}
            </div>
          </Link>
        </div>

        {/* ── Center zone: nav + search ──────────────────── */}
        <div className="flex-1 flex items-center justify-center gap-1 mx-2 sm:mx-4">
          <nav className="hidden lg:flex items-center gap-1">
            {[
              { to: '/', label: t('comp.header.navHub'), icon: Home, exact: true },
              { to: '/catalog', label: t('comp.header.navCatalog'), icon: Package },
              ...(isAdmin ? [{ to: '/scan', label: t('comp.header.navScan'), icon: QrCode }] : []),
            ].map(({ to, label, icon: Icon, exact }: any) => (
              <Link key={to} to={to}>
                <Button
                  variant={(exact ? location.pathname === to : location.pathname.startsWith(to)) ? 'secondary' : 'ghost'}
                  size="sm"
                  className="gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              </Link>
            ))}
            {isStaff && (
              <>
                <div className="mx-2 h-6 w-px bg-border" />
                <Link to="/admin">
                  <Button variant={location.pathname.startsWith('/admin') ? 'secondary' : 'ghost'} size="sm" className="gap-2">
                    <Settings className="h-4 w-4" />
                    {isAdmin ? t('comp.header.navAdmin') : t('comp.header.navStaff')}
                  </Button>
                </Link>
              </>
            )}
          </nav>

          <HeaderSearch />
        </div>

        {/* ── Right zone: actions ──────────────────── */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          <CartButton />
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/whats-new" aria-label={t('comp.header.whatsNew')}>
                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 max-[374px]:hidden">
                  <Sparkles className="h-4 w-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>{t('comp.header.whatsNew')}</TooltipContent>
          </Tooltip>
          {onOpenTour && (
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={onOpenTour} aria-label={t('comp.header.howItWorks')}>
              <HelpCircle className="h-4 w-4" />
            </Button>
          )}

          {/* Theme toggle — hidden on very small screens */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9 max-[374px]:hidden"
                onClick={toggleTheme}
              >
                {themeMode === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
                <span className="sr-only">
                  {themeMode === 'dark' ? t('comp.header.switchToLightMode') : t('comp.header.switchToDarkMode')}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {themeMode === 'dark' ? t('comp.header.lightMode') : t('comp.header.darkMode')}
            </TooltipContent>
          </Tooltip>

          <UserMenu />
        </div>
      </div>
    </header>
  )
}
