import { useEffect, useRef, useState, useCallback, Suspense } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'motion/react'
import { Toaster } from 'sonner'
import { Header } from './Header'
import { MobileNav } from './MobileNav'
import { BottomTabBar } from './BottomTabBar'
import { NavigationProgress } from '@/components/common/NavigationProgress'
import { WelcomeWizard } from '@/components/common/WelcomeWizard'
import { PageTransition } from '@/components/ui/motion'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { LiveRegionProvider } from '@/components/common/LiveRegion'
import { useTheme, useThemeMode, useSyncThemeFromProfile } from '@/hooks/use-theme'
import { useRealtimeSync } from '@/hooks/use-realtime-sync'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/lib/auth'

export function AppLayout() {
  useTheme()
  useSyncThemeFromProfile()
  useRealtimeSync()

  // Adopt the user's saved language ONCE on login (localStorage already
  // covers the same device; this carries it across devices). Guarded by a
  // ref so it never fights a manual switch from the language picker — before,
  // this effect re-ran on every profile/i18n change and reverted the click,
  // and it also silently ignored 'nl'.
  const { profile } = useAuth()
  const { i18n } = useTranslation()
  const langAdopted = useRef(false)
  useEffect(() => {
    if (langAdopted.current) return
    const lang = (profile as any)?.language
    if (lang && ['fr', 'en', 'nl'].includes(lang)) {
      langAdopted.current = true
      if (i18n.language !== lang) i18n.changeLanguage(lang)
    }
  }, [profile, i18n])
  const location = useLocation()
  const themeMode = useThemeMode()
  const prevPath = useRef(location.pathname)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const navigate = useNavigate()

  // Keyboard shortcuts: Cmd/Ctrl+K = focus search, Cmd/Ctrl+N = catalog
  useEffect(() => {
    const handler = (e: any) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        ;(document.querySelector('[data-search-input]') as HTMLElement | null)?.focus()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        navigate('/catalog')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate])

  // Detect navigation direction (forward vs back)
  const direction = useRef('forward')

  useEffect(() => {
    // Heuristic: if new path is shorter or equal, it's likely "back"
    const isBack = location.pathname.split('/').length < prevPath.current.split('/').length
    direction.current = isBack ? 'back' : 'forward'
    prevPath.current = location.pathname
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  return (
    <LiveRegionProvider>
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen bg-background overflow-x-hidden">
        <NavigationProgress />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:rounded-md focus:ring-2 focus:ring-ring"
        >
          Skip to content
        </a>
        <Header onOpenTour={() => setShowOnboarding(true)} />
        <WelcomeWizard forceOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
        <MobileNav />
        <BottomTabBar />
        <main id="main-content" className="px-3 py-4 pb-20 sm:px-6 sm:py-6 md:pb-6 lg:px-10">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname} direction={direction.current}>
              <Suspense fallback={<PageLoading />}>
                <Outlet />
              </Suspense>
            </PageTransition>
          </AnimatePresence>
        </main>
        {/* Footer */}
        <footer className="hidden md:block border-t border-border/20 px-6 py-4 text-center">
          <p className="text-[11px] text-muted-foreground/50">
            VO Hub
          </p>
        </footer>

        <Toaster
          theme={themeMode}
          position="bottom-right"
          richColors
          offset={16}
          gap={8}
          toastOptions={{
            className: 'font-body',
          }}
          className="max-md:!bottom-20"
        />
      </div>
    </TooltipProvider>
    </LiveRegionProvider>
  )
}
