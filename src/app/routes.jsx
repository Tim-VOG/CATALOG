import { Routes, Route, Navigate } from 'react-router-dom'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { RequireAdmin } from '@/components/auth/RequireAdmin'
import { AppLayout } from '@/components/layout/AppLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'

import { HubPage } from '@/pages/HubPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { AuthCallbackPage } from '@/pages/auth/AuthCallbackPage'
import { CatalogPage } from '@/pages/catalog/CatalogPage'
// ProductDetailPage removed — all info is on the card
// Cart and Checkout removed — all equipment actions go through QR scan
import { RequestsPage } from '@/pages/requests/RequestsPage'
import { RequestDetailPage } from '@/pages/requests/RequestDetailPage'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { AdminProductsPage } from '@/pages/admin/AdminProductsPage'
import { AdminCategoriesPage } from '@/pages/admin/AdminCategoriesPage'
import { AdminRequestsPage } from '@/pages/admin/AdminRequestsPage'
import { AdminRequestDetailPage } from '@/pages/admin/AdminRequestDetailPage'
// AdminReturnsPage removed — returns handled via QR scan
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'
import { AdminDesignPage } from '@/pages/admin/AdminDesignPage'
import { AdminEmailTemplatesPage } from '@/pages/admin/AdminEmailTemplatesPage'
// AdminPlanningPage, AdminFormFieldsPage, AdminNewRequestPage removed
import { AdminSubscriptionPlansPage } from '@/pages/admin/AdminSubscriptionPlansPage'
import { ProfilePage } from '@/pages/profile/ProfilePage'
import { ItRequestFormPage } from '@/pages/it-request/ItRequestFormPage'
import { AdminItRequestsPage } from '@/pages/admin/AdminItRequestsPage'
import { OnboardingRequestsPage } from '@/pages/admin/onboarding/OnboardingRequestsPage'
import { WelcomeRequestsPage } from '@/pages/admin/welcome/WelcomeRequestsPage'
import { AdminItInventoryPage } from '@/pages/admin/AdminItInventoryPage'
// (Removed OnboardingHistoryPage — history merged into Welcome's "Sent" tab)
import { AdminOffboardingRequestsPage } from '@/pages/admin/AdminOffboardingRequestsPage'
import { AdminItFormBuilderPage } from '@/pages/admin/AdminItFormBuilderPage'
import { OffboardingPage } from '@/pages/admin/offboarding/OffboardingPage'
import { AdminOffboardingFormBuilderPage } from '@/pages/admin/AdminOffboardingFormBuilderPage'
import { FunctionalMailboxFormPage } from '@/pages/functional-mailbox/FunctionalMailboxFormPage'
import { MyRequestsPage } from '@/pages/my-requests/MyRequestsPage'
import { AdminMailboxRequestsPage } from '@/pages/admin/AdminMailboxRequestsPage'
import { AdminMailboxFormBuilderPage } from '@/pages/admin/AdminMailboxFormBuilderPage'
import { AdminAllRequestsPage } from '@/pages/admin/AdminAllRequestsPage'
import { AdminQRCodesPage } from '@/pages/admin/AdminQRCodesPage'
import { AdminLocalITPage } from '@/pages/admin/AdminLocalITPage'
import { AdminStatsPage } from '@/pages/admin/AdminStatsPage'
import { AdminScanLogsPage } from '@/pages/admin/AdminScanLogsPage'
// AdminQRTestPage removed — dev-only tool, not needed in production admin
import { RequireModuleAccess } from '@/components/auth/RequireModuleAccess'
// ReservePage removed — booking via cart flow
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ScanPage } from '@/pages/scan/ScanPage'
import { OnboardingRequestPage } from '@/pages/onboarding-request/OnboardingRequestPage'
import { OffboardingRequestPage } from '@/pages/offboarding-request/OffboardingRequestPage'
import { EquipmentRequestPage } from '@/pages/equipment-request/EquipmentRequestPage'
import { CartPage } from '@/pages/cart/CartPage'
import { TrackingPage } from '@/pages/track/TrackingPage'

export function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/track/:token" element={<TrackingPage />} />

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
        <Route path="scan" element={<RequireAdmin><ScanPage /></RequireAdmin>} />
        <Route path="onboarding-request" element={<OnboardingRequestPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="equipment-request" element={<EquipmentRequestPage />} />
        <Route path="offboarding-request" element={<OffboardingRequestPage />} />

        {/* Admin routes */}
        <Route
          path="admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="stats" element={<AdminStatsPage />} />
          <Route path="all-requests" element={<AdminAllRequestsPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="subscription-plans" element={<AdminSubscriptionPlansPage />} />
          {/* Redirect old product-options route */}
          <Route path="product-options" element={<Navigate to="/admin/products" replace />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="requests" element={<AdminRequestsPage />} />
          <Route path="requests/:requestId" element={<AdminRequestDetailPage />} />
          <Route path="new-request" element={<Navigate to="/admin/requests" replace />} />
          <Route path="returns" element={<Navigate to="/admin/requests" replace />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="design" element={<AdminDesignPage />} />
          <Route path="email-templates" element={<AdminEmailTemplatesPage />} />
          <Route path="planning" element={<Navigate to="/admin" replace />} />
          <Route path="forms" element={<Navigate to="/admin" replace />} />
          <Route path="onboarding" element={<Navigate to="/admin/onboarding/requests" replace />} />
          <Route path="onboarding/requests" element={<OnboardingRequestsPage />} />
          <Route path="onboarding/compose" element={<Navigate to="/admin/onboarding/requests" replace />} />
          <Route path="onboarding/compose/:emailId" element={<Navigate to="/admin/onboarding/requests" replace />} />
          <Route path="onboarding/history" element={<Navigate to="/admin/welcome" replace />} />
          <Route path="onboarding/recipients" element={<Navigate to="/admin/onboarding/requests" replace />} />
          <Route path="onboarding/variables" element={<Navigate to="/admin/onboarding/requests" replace />} />
          <Route path="it-requests" element={<Navigate to="/admin/onboarding/requests" replace />} />
          <Route path="onboarding-requests" element={<Navigate to="/admin/onboarding/requests" replace />} />
          <Route path="welcome" element={<WelcomeRequestsPage />} />
          <Route path="offboarding-requests" element={<AdminOffboardingRequestsPage />} />
          <Route path="it-form-builder" element={<AdminItFormBuilderPage />} />
          <Route path="offboarding" element={<OffboardingPage />} />
          <Route path="offboarding-form-builder" element={<AdminOffboardingFormBuilderPage />} />
          <Route path="mailbox-requests" element={<AdminMailboxRequestsPage />} />
          <Route path="mailbox-form-builder" element={<AdminMailboxFormBuilderPage />} />
          <Route path="local-it" element={<AdminLocalITPage />} />
          <Route path="it-inventory" element={<AdminItInventoryPage />} />
          <Route path="qr-codes" element={<AdminQRCodesPage />} />
          <Route path="scan-logs" element={<AdminScanLogsPage />} />
          {/* QR Test Lab removed — dev-only tool */}
          {/* Redirect old module-access route to users page */}
          <Route path="module-access" element={<Navigate to="/admin/users" replace />} />
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
