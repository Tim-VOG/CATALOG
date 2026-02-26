import { Outlet } from 'react-router-dom'
import { AdminSidebar } from './AdminSidebar'

export function AdminLayout() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <AdminSidebar />
      <main className="flex-1 px-4 py-6 sm:p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
