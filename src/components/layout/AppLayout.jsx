import { Outlet, useLocation } from 'react-router-dom'
import { Header } from './Header'
import { MobileNav } from './MobileNav'
import { Toast } from './Toast'
import { PageTransition } from '@/components/ui/motion'
import { useTheme } from '@/hooks/use-theme'

export function AppLayout() {
  useTheme()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MobileNav />
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <PageTransition key={location.pathname}>
          <Outlet />
        </PageTransition>
      </main>
      <Toast />
    </div>
  )
}
