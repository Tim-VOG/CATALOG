import { Outlet, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import { AdminSidebar } from './AdminSidebar'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'

export function AdminLayout() {
  const location = useLocation()

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      <AdminSidebar />
      <main className="admin-main flex-1 overflow-y-auto px-6 pb-8 lg:px-8">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </motion.div>
      </main>
    </div>
  )
}
