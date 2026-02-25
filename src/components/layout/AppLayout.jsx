import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { MobileNav } from './MobileNav'
import { Toast } from './Toast'
import { useTheme } from '@/hooks/use-theme'

export function AppLayout() {
  useTheme()

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MobileNav />
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <Outlet />
      </main>
      <Toast />
    </div>
  )
}
