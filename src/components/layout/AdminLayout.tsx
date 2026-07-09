import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import { AdminSidebar } from './AdminSidebar'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { GlobalSearch } from '@/components/common/GlobalSearch'

export function AdminLayout() {
  const location = useLocation()

  return (
    <div className="admin-shell relative flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
      <GlobalSearch />
      <AdminSidebar />
      <main className="admin-main flex-1 overflow-y-auto px-4 pb-12 sm:px-8 lg:px-10">
        <div className="mx-auto w-full max-w-6xl">
          <motion.div
            key={location.pathname}
            initial={{ y: 4 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <ErrorBoundary key={location.pathname}>
              <Suspense fallback={<PageLoading />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
