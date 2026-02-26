import { Outlet, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Header } from './Header'
import { MobileNav } from './MobileNav'
import { PageTransition } from '@/components/ui/motion'
import { TooltipProvider } from '@/components/ui/tooltip'
import { LiveRegionProvider } from '@/components/common/LiveRegion'
import { useTheme, useThemeMode } from '@/hooks/use-theme'

export function AppLayout() {
  useTheme()
  const location = useLocation()
  const themeMode = useThemeMode()

  return (
    <LiveRegionProvider>
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen bg-background">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:rounded-md focus:ring-2 focus:ring-ring"
        >
          Skip to content
        </a>
        <Header />
        <MobileNav />
        <main id="main-content" className="container mx-auto px-4 py-6 max-w-7xl">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </main>
        <Toaster
          theme={themeMode}
          position="bottom-right"
          richColors
        />
      </div>
    </TooltipProvider>
    </LiveRegionProvider>
  )
}
