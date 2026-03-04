import { Outlet, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import { AdminSidebar } from './AdminSidebar'

export function AdminLayout() {
  const location = useLocation()

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      <AdminSidebar />
      <main className="admin-main flex-1 overflow-y-auto px-6 pb-6 lg:px-10">
        {/* Simplified transition — no AnimatePresence mode="wait" to avoid blank flashes.
            Content fades in immediately without waiting for exit animation. */}
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  )
}
