import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
  Package, Home, X, LayoutDashboard, Inbox,
  RotateCcw, Sun, Moon, QrCode, UserPlus, Mail,
  ClipboardList, UserMinus, ScrollText, FlaskConical,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useHasModuleAccess } from '@/hooks/use-has-module-access'
import { useUIStore } from '@/stores/ui-store'
import { useAppSettings } from '@/hooks/use-settings'
import { useThemeMode, useToggleTheme } from '@/hooks/use-theme'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const mainLinks = [
  { to: '/', label: 'Hub', icon: Home, exact: true },
  { to: '/catalog', label: 'Catalog', icon: Package },
  { to: '/scan', label: 'Scan', icon: QrCode },
]

const adminLinks = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/requests', label: 'Requests', icon: Inbox },
  { to: '/admin/returns', label: 'Returns', icon: RotateCcw },
  { to: '/admin/qr-codes', label: 'QR Codes', icon: QrCode },
  { to: '/admin/scan-logs', label: 'Scan Logs', icon: ScrollText },
  { to: '/admin/qr-test', label: 'Test Lab', icon: FlaskConical },
]

const linkVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: (i) => ({
    opacity: 1, x: 0,
    transition: { delay: 0.05 + i * 0.04, duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
}

export function MobileNav() {
  const { isAdmin, profile } = useAuth()
  const { hasAccess: hasOnboarding } = useHasModuleAccess('onboarding')
  const { hasAccess: hasItForm } = useHasModuleAccess('it_form')
  const { hasAccess: hasMailbox } = useHasModuleAccess('functional_mailbox')
  const { hasAccess: hasOffboarding } = useHasModuleAccess('offboarding')
  const location = useLocation()
  const mobileNavOpen = useUIStore((s) => s.mobileNavOpen)
  const toggleMobileNav = useUIStore((s) => s.toggleMobileNav)
  const { data: settings } = useAppSettings()
  const themeMode = useThemeMode()
  const toggleTheme = useToggleTheme()

  const appName = settings?.app_name || 'VO Gear Hub'
  const logoUrl = settings?.logo_url
  const tagline = settings?.header_tagline || 'Book. Borrow. Return.'
  const userName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : ''

  const isActive = (to, exact) => exact ? location.pathname === to : location.pathname.startsWith(to)

  // Module links
  const moduleLinks = []
  if (hasOnboarding && isAdmin) moduleLinks.push({ to: '/admin/onboarding', label: 'Onboarding', icon: UserPlus })
  if (hasItForm) moduleLinks.push({ to: '/it-request', label: 'IT Request', icon: ClipboardList })
  if (hasMailbox) moduleLinks.push({ to: '/functional-mailbox', label: 'Mailbox Request', icon: Mail })
  if (hasOffboarding && isAdmin) moduleLinks.push({ to: '/admin/offboarding', label: 'Offboarding', icon: UserMinus })

  let linkIndex = 0

  const renderSection = (title, links) => (
    <>
      <div className="my-2 mx-2">
        <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
      </div>
      <p className="px-3 py-1 text-xs font-semibold uppercase text-muted-foreground tracking-wider">{title}</p>
      {links.map(({ to, label, icon: Icon, exact }) => {
        const i = linkIndex++
        return (
          <motion.div key={to} custom={i} initial="hidden" animate="visible" variants={linkVariants}>
            <Link to={to} onClick={toggleMobileNav}>
              <Button variant={isActive(to, exact) ? 'secondary' : 'ghost'} className="w-full justify-start gap-3" size="sm">
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            </Link>
          </motion.div>
        )
      })}
    </>
  )

  return (
    <AnimatePresence>
      {mobileNavOpen && (
        <>
          <motion.div
            key="mobile-nav-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={toggleMobileNav}
          />

          <motion.div
            key="mobile-nav-drawer"
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 left-0 w-[min(18rem,85vw)] glass-panel bg-card/95 border-r z-50 flex flex-col shadow-float"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/30">
              <div className="flex items-center gap-2 text-primary">
                {logoUrl ? <img src={logoUrl} alt={appName} className="h-6 w-auto object-contain" /> : <Package className="h-5 w-5" />}
                <div className="flex flex-col leading-tight">
                  <span className="font-display font-bold text-lg">{appName}</span>
                  <span className="text-[10px] text-muted-foreground font-normal tracking-wide">{tagline}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={toggleMobileNav} aria-label="Close menu">
                <X className="h-5 w-5" />
              </Button>
            </div>

            {userName && (
              <div className="px-4 py-3 border-b border-border/20 bg-mesh-gradient">
                <p className="text-xs text-muted-foreground">Welcome back,</p>
                <p className="text-sm font-semibold truncate">{userName}</p>
              </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
              {mainLinks.map(({ to, label, icon: Icon, exact }) => {
                const i = linkIndex++
                return (
                  <motion.div key={to} custom={i} initial="hidden" animate="visible" variants={linkVariants}>
                    <Link to={to} onClick={toggleMobileNav}>
                      <Button variant={isActive(to, exact) ? 'secondary' : 'ghost'} className="w-full justify-start gap-3" size="sm">
                        <Icon className="h-4 w-4" />
                        {label}
                      </Button>
                    </Link>
                  </motion.div>
                )
              })}

              {moduleLinks.length > 0 && renderSection('Services', moduleLinks)}
              {isAdmin && renderSection('Admin', adminLinks)}
            </nav>

            {/* Theme toggle */}
            <div className="p-3 border-t border-border/30">
              <Button variant="ghost" size="sm" className="w-full justify-start gap-3" onClick={toggleTheme}>
                {themeMode === 'dark' ? <><Sun className="h-4 w-4" /> Light Mode</> : <><Moon className="h-4 w-4" /> Dark Mode</>}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
