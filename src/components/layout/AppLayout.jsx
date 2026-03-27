import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'motion/react'
import { Toaster } from 'sonner'
import { Header } from './Header'
import { MobileNav } from './MobileNav'
import { BottomTabBar } from './BottomTabBar'
import { NavigationProgress } from '@/components/common/NavigationProgress'
import { PageTransition } from '@/components/ui/motion'
import { TooltipProvider } from '@/components/ui/tooltip'
import { LiveRegionProvider } from '@/components/common/LiveRegion'
import { useTheme, useThemeMode } from '@/hooks/use-theme'

export function AppLayout() {
  useTheme()
  const location = useLocation()
  const themeMode = useThemeMode()
  const prevPath = useRef(location.pathname)

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
      <div className="min-h-screen bg-background">
        <NavigationProgress />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:rounded-md focus:ring-2 focus:ring-ring"
        >
          Skip to content
        </a>
        <Header />
        <MobileNav />
        <BottomTabBar />
        <main id="main-content" className="px-6 py-6 pb-20 md:pb-6 lg:px-10">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname} direction={direction.current}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </main>
        {/* Footer */}
        <footer className="hidden md:block border-t border-border/20 px-6 py-4 text-center">
          <p className="text-[11px] text-muted-foreground/50">
            VO Gear Hub &middot; Powered by VO Group
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
