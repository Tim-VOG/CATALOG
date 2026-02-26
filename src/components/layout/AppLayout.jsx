import { Outlet, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Header } from './Header'
import { MobileNav } from './MobileNav'
import { PageTransition } from '@/components/ui/motion'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useTheme, useThemeMode } from '@/hooks/use-theme'

export function AppLayout() {
  useTheme()
  const location = useLocation()
  const themeMode = useThemeMode()

  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen bg-background">
        <Header />
        <MobileNav />
        <main className="container mx-auto px-4 py-6 max-w-7xl">
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
  )
}
