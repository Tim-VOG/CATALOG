import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { RequireAdmin, RequireStaff, AdminOnly } from '@/components/auth/RequireAdmin'
import { AppLayout } from '@/components/layout/AppLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { RequireModuleAccess } from '@/components/auth/RequireModuleAccess'

// ── Eager (shipped in the initial bundle) ──────────────────
// Public + light user-facing routes so the first paint after login
// doesn't wait on a network chunk.
import { HubPage } from '@/pages/HubPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { AuthCallbackPage } from '@/pages/auth/AuthCallbackPage'
import { CatalogPage } from '@/pages/catalog/CatalogPage'
import { RequestsPage } from '@/pages/requests/RequestsPage'
import { RequestDetailPage } from '@/pages/requests/RequestDetailPage'
import { ProfilePage } from '@/pages/profile/ProfilePage'
import { MyRequestsPage } from '@/pages/my-requests/MyRequestsPage'
import { MyEquipmentPage } from '@/pages/my-equipment/MyEquipmentPage'
import { CartPage } from '@/pages/cart/CartPage'
import { ScanPage } from '@/pages/scan/ScanPage'
import { TrackingPage } from '@/pages/track/TrackingPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { StatusPage } from '@/pages/StatusPage'

// ── Lazy: heavy form pages ─────────────────────────────────
// Big form pages — only fetched when the user opens the matching link.
const ItRequestFormPage = lazy(() => import('@/pages/it-request/ItRequestFormPage').then((m) => ({ default: m.ItRequestFormPage })))
const FunctionalMailboxFormPage = lazy(() => import('@/pages/functional-mailbox/FunctionalMailboxFormPage').then((m) => ({ default: m.FunctionalMailboxFormPage })))
const OnboardingRequestPage = lazy(() => import('@/pages/onboarding-request/OnboardingRequestPage').then((m) => ({ default: m.OnboardingRequestPage })))
const OffboardingRequestPage = lazy(() => import('@/pages/offboarding-request/OffboardingRequestPage').then((m) => ({ default: m.OffboardingRequestPage })))
const EquipmentRequestPage = lazy(() => import('@/pages/equipment-request/EquipmentRequestPage').then((m) => ({ default: m.EquipmentRequestPage })))

// ── Lazy: admin pages ──────────────────────────────────────
// Never shipped to non-admins (RequireAdmin gate), always lazy so the
// user bundle stays slim. Static imports per file so Vite can code-split.
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })))
const AdminProductsPage = lazy(() => import('@/pages/admin/AdminProductsPage').then((m) => ({ default: m.AdminProductsPage })))
const AdminCategoriesPage = lazy(() => import('@/pages/admin/AdminCategoriesPage').then((m) => ({ default: m.AdminCategoriesPage })))
const AdminRequestsPage = lazy(() => import('@/pages/admin/AdminRequestsPage').then((m) => ({ default: m.AdminRequestsPage })))
const AdminRequestDetailPage = lazy(() => import('@/pages/admin/AdminRequestDetailPage').then((m) => ({ default: m.AdminRequestDetailPage })))
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })))
const AdminUserDetailPage = lazy(() => import('@/pages/admin/AdminUserDetailPage').then((m) => ({ default: m.AdminUserDetailPage })))
const AdminPlanningPage = lazy(() => import('@/pages/admin/AdminPlanningPage').then((m) => ({ default: m.AdminPlanningPage })))
const AdminSharedMailboxesPage = lazy(() => import('@/pages/admin/AdminSharedMailboxesPage').then((m) => ({ default: m.AdminSharedMailboxesPage })))
const AdminDeviceCredentialsPage = lazy(() => import('@/pages/admin/AdminDeviceCredentialsPage').then((m) => ({ default: m.AdminDeviceCredentialsPage })))
const AdminDesignPage = lazy(() => import('@/pages/admin/AdminDesignPage').then((m) => ({ default: m.AdminDesignPage })))
const AdminEmailTemplatesPage = lazy(() => import('@/pages/admin/AdminEmailTemplatesPage').then((m) => ({ default: m.AdminEmailTemplatesPage })))
const AdminSubscriptionPlansPage = lazy(() => import('@/pages/admin/AdminSubscriptionPlansPage').then((m) => ({ default: m.AdminSubscriptionPlansPage })))
const OnboardingRequestsPage = lazy(() => import('@/pages/admin/onboarding/OnboardingRequestsPage').then((m) => ({ default: m.OnboardingRequestsPage })))
const AdminItInventoryPage = lazy(() => import('@/pages/admin/AdminItInventoryPage').then((m) => ({ default: m.AdminItInventoryPage })))
const AdminOffboardingRequestsPage = lazy(() => import('@/pages/admin/AdminOffboardingRequestsPage').then((m) => ({ default: m.AdminOffboardingRequestsPage })))
const AdminItFormBuilderPage = lazy(() => import('@/pages/admin/AdminItFormBuilderPage').then((m) => ({ default: m.AdminItFormBuilderPage })))
const OffboardingPage = lazy(() => import('@/pages/admin/offboarding/OffboardingPage').then((m) => ({ default: m.OffboardingPage })))
const AdminOffboardingFormBuilderPage = lazy(() => import('@/pages/admin/AdminOffboardingFormBuilderPage').then((m) => ({ default: m.AdminOffboardingFormBuilderPage })))
const AdminMailboxRequestsPage = lazy(() => import('@/pages/admin/AdminMailboxRequestsPage').then((m) => ({ default: m.AdminMailboxRequestsPage })))
const AdminMailboxFormBuilderPage = lazy(() => import('@/pages/admin/AdminMailboxFormBuilderPage').then((m) => ({ default: m.AdminMailboxFormBuilderPage })))
const AdminAllRequestsPage = lazy(() => import('@/pages/admin/AdminAllRequestsPage').then((m) => ({ default: m.AdminAllRequestsPage })))
const AdminQRCodesPage = lazy(() => import('@/pages/admin/AdminQRCodesPage').then((m) => ({ default: m.AdminQRCodesPage })))
const AdminLocalITPage = lazy(() => import('@/pages/admin/AdminLocalITPage').then((m) => ({ default: m.AdminLocalITPage })))
const AdminStatsPage = lazy(() => import('@/pages/admin/AdminStatsPage').then((m) => ({ default: m.AdminStatsPage })))
const AdminScanLogsPage = lazy(() => import('@/pages/admin/AdminScanLogsPage').then((m) => ({ default: m.AdminScanLogsPage })))
const AdminAuditLogPage = lazy(() => import('@/pages/admin/AdminAuditLogPage').then((m) => ({ default: m.AdminAuditLogPage })))
const AdminReservationsPage = lazy(() => import('@/pages/admin/AdminReservationsPage').then((m) => ({ default: m.AdminReservationsPage })))
const AdminLostItemsPage = lazy(() => import('@/pages/admin/AdminLostItemsPage').then((m) => ({ default: m.AdminLostItemsPage })))
const AdminUtilizationPage = lazy(() => import('@/pages/admin/AdminUtilizationPage').then((m) => ({ default: m.AdminUtilizationPage })))

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/track/:token" element={<TrackingPage />} />
        <Route path="/status" element={<StatusPage />} />

        {/* Protected routes */}
        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<HubPage />} />
          <Route path="catalog" element={<CatalogPage />} />
          <Route path="catalog/:productId" element={<Navigate to="/catalog" replace />} />
          <Route path="catalog/:productId/reserve" element={<Navigate to="/catalog" replace />} />
          <Route path="requests" element={<RequestsPage />} />
          <Route path="requests/:requestId" element={<RequestDetailPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="it-request" element={<RequireModuleAccess moduleKey="it_form"><ItRequestFormPage /></RequireModuleAccess>} />
          <Route path="functional-mailbox" element={<FunctionalMailboxFormPage />} />
          <Route path="my-requests" element={<MyRequestsPage />} />
          <Route path="my-equipment" element={<MyEquipmentPage />} />
          <Route path="scan" element={<RequireAdmin><ScanPage /></RequireAdmin>} />
          <Route path="onboarding-request" element={<OnboardingRequestPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="equipment-request" element={<EquipmentRequestPage />} />
          <Route path="offboarding-request" element={<OffboardingRequestPage />} />

          {/* Admin + manager (staff) area. Managers see people-ops
              pages; AdminOnly bounces them off the sensitive ones. */}
          <Route
            path="admin"
            element={
              <RequireStaff>
                <AdminLayout />
              </RequireStaff>
            }
          >
            {/* Shared by admin + manager */}
            <Route index element={<AdminDashboardPage />} />
            <Route path="planning" element={<AdminPlanningPage />} />
            <Route path="all-requests" element={<AdminAllRequestsPage />} />
            <Route path="onboarding" element={<Navigate to="/admin/onboarding/requests" replace />} />
            <Route path="onboarding/requests" element={<OnboardingRequestsPage />} />
            <Route path="onboarding/compose" element={<Navigate to="/admin/onboarding/requests" replace />} />
            <Route path="onboarding/compose/:emailId" element={<Navigate to="/admin/onboarding/requests" replace />} />
            <Route path="onboarding/history" element={<Navigate to="/admin/onboarding/requests" replace />} />
            <Route path="onboarding/recipients" element={<Navigate to="/admin/onboarding/requests" replace />} />
            <Route path="onboarding/variables" element={<Navigate to="/admin/onboarding/requests" replace />} />
            <Route path="it-requests" element={<Navigate to="/admin/onboarding/requests" replace />} />
            <Route path="onboarding-requests" element={<Navigate to="/admin/onboarding/requests" replace />} />
            <Route path="welcome" element={<Navigate to="/admin/onboarding/requests" replace />} />
            <Route path="offboarding-requests" element={<AdminOffboardingRequestsPage />} />
            <Route path="offboarding" element={<OffboardingPage />} />
            <Route path="mailbox-requests" element={<AdminMailboxRequestsPage />} />

            {/* Admin only — wrapped so managers bounce back to /admin */}
            <Route path="stats" element={<AdminOnly><AdminStatsPage /></AdminOnly>} />
            <Route path="products" element={<AdminOnly><AdminProductsPage /></AdminOnly>} />
            <Route path="subscription-plans" element={<AdminOnly><AdminSubscriptionPlansPage /></AdminOnly>} />
            <Route path="product-options" element={<Navigate to="/admin/products" replace />} />
            <Route path="categories" element={<AdminOnly><AdminCategoriesPage /></AdminOnly>} />
            <Route path="requests" element={<AdminOnly><AdminRequestsPage /></AdminOnly>} />
            <Route path="requests/:requestId" element={<AdminOnly><AdminRequestDetailPage /></AdminOnly>} />
            <Route path="new-request" element={<Navigate to="/admin/requests" replace />} />
            <Route path="returns" element={<Navigate to="/admin/requests" replace />} />
            <Route path="users" element={<AdminOnly><AdminUsersPage /></AdminOnly>} />
            <Route path="users/:userId" element={<AdminOnly><AdminUserDetailPage /></AdminOnly>} />
            <Route path="design" element={<AdminOnly><AdminDesignPage /></AdminOnly>} />
            <Route path="email-templates" element={<AdminOnly><AdminEmailTemplatesPage /></AdminOnly>} />
            <Route path="shared-mailboxes" element={<AdminOnly><AdminSharedMailboxesPage /></AdminOnly>} />
            <Route path="device-credentials" element={<AdminOnly><AdminDeviceCredentialsPage /></AdminOnly>} />
            <Route path="forms" element={<Navigate to="/admin" replace />} />
            <Route path="it-form-builder" element={<AdminOnly><AdminItFormBuilderPage /></AdminOnly>} />
            <Route path="offboarding-form-builder" element={<AdminOnly><AdminOffboardingFormBuilderPage /></AdminOnly>} />
            <Route path="mailbox-form-builder" element={<AdminOnly><AdminMailboxFormBuilderPage /></AdminOnly>} />
            <Route path="local-it" element={<AdminOnly><AdminLocalITPage /></AdminOnly>} />
            <Route path="it-inventory" element={<AdminOnly><AdminItInventoryPage /></AdminOnly>} />
            <Route path="qr-codes" element={<AdminOnly><AdminQRCodesPage /></AdminOnly>} />
            <Route path="scan-logs" element={<AdminOnly><AdminScanLogsPage /></AdminOnly>} />
            <Route path="audit" element={<AdminOnly><AdminAuditLogPage /></AdminOnly>} />
            <Route path="reservations" element={<AdminOnly><AdminReservationsPage /></AdminOnly>} />
            <Route path="lost-items" element={<AdminOnly><AdminLostItemsPage /></AdminOnly>} />
            <Route path="utilization" element={<AdminOnly><AdminUtilizationPage /></AdminOnly>} />
            <Route path="module-access" element={<Navigate to="/admin/users" replace />} />
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
