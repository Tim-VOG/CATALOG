import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'motion/react'
import { AdminSidebar } from './AdminSidebar'
import { PageTransition } from '@/components/ui/motion'

export function AdminLayout() {
  const location = useLocation()

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      <AdminSidebar />
      <main className="admin-main flex-1 overflow-y-auto px-6 pb-6 lg:px-10">
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </main>
    </div>
  )
}
