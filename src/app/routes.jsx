import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { RequireAdmin } from '@/components/auth/RequireAdmin'
import { AppLayout } from '@/components/layout/AppLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { RequireModuleAccess } from '@/components/auth/RequireModuleAccess'

// Public / always-loaded pages (critical path)
import { HubPage } from '@/pages/HubPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { AuthCallbackPage } from '@/pages/auth/AuthCallbackPage'
import { CatalogPage } from '@/pages/catalog/CatalogPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

// User-facing pages (lazy)
const ProductDetailPage = lazy(() => import('@/pages/catalog/ProductDetailPage').then(m => ({ default: m.ProductDetailPage })))
const ReservePage = lazy(() => import('@/pages/catalog/ReservePage').then(m => ({ default: m.ReservePage })))
const RequestsPage = lazy(() => import('@/pages/requests/RequestsPage').then(m => ({ default: m.RequestsPage })))
const RequestDetailPage = lazy(() => import('@/pages/requests/RequestDetailPage').then(m => ({ default: m.RequestDetailPage })))
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage').then(m => ({ default: m.ProfilePage })))
const ItRequestFormPage = lazy(() => import('@/pages/it-request/ItRequestFormPage').then(m => ({ default: m.ItRequestFormPage })))
const FunctionalMailboxFormPage = lazy(() => import('@/pages/functional-mailbox/FunctionalMailboxFormPage').then(m => ({ default: m.FunctionalMailboxFormPage })))
const MyRequestsPage = lazy(() => import('@/pages/my-requests/MyRequestsPage').then(m => ({ default: m.MyRequestsPage })))
const ScanPage = lazy(() => import('@/pages/scan/ScanPage').then(m => ({ default: m.ScanPage })))
const MyEquipmentsPage = lazy(() => import('@/pages/my-equipments/MyEquipmentsPage').then(m => ({ default: m.MyEquipmentsPage })))
const OnboardingRequestPage = lazy(() => import('@/pages/onboarding-request/OnboardingRequestPage').then(m => ({ default: m.OnboardingRequestPage })))
const OffboardingRequestPage = lazy(() => import('@/pages/offboarding-request/OffboardingRequestPage').then(m => ({ default: m.OffboardingRequestPage })))
const EquipmentRequestPage = lazy(() => import('@/pages/equipment-request/EquipmentRequestPage').then(m => ({ default: m.EquipmentRequestPage })))

// Admin pages (always lazy — rarely opened by regular users)
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })))
const AdminProductsPage = lazy(() => import('@/pages/admin/AdminProductsPage').then(m => ({ default: m.AdminProductsPage })))
const AdminCategoriesPage = lazy(() => import('@/pages/admin/AdminCategoriesPage').then(m => ({ default: m.AdminCategoriesPage })))
const AdminRequestsPage = lazy(() => import('@/pages/admin/AdminRequestsPage').then(m => ({ default: m.AdminRequestsPage })))
const AdminRequestDetailPage = lazy(() => import('@/pages/admin/AdminRequestDetailPage').then(m => ({ default: m.AdminRequestDetailPage })))
const AdminReturnsPage = lazy(() => import('@/pages/admin/AdminReturnsPage').then(m => ({ default: m.AdminReturnsPage })))
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })))
const AdminDesignPage = lazy(() => import('@/pages/admin/AdminDesignPage').then(m => ({ default: m.AdminDesignPage })))
const AdminEmailTemplatesPage = lazy(() => import('@/pages/admin/AdminEmailTemplatesPage').then(m => ({ default: m.AdminEmailTemplatesPage })))
const AdminPlanningPage = lazy(() => import('@/pages/admin/AdminPlanningPage').then(m => ({ default: m.AdminPlanningPage })))
const AdminFormFieldsPage = lazy(() => import('@/pages/admin/AdminFormFieldsPage').then(m => ({ default: m.AdminFormFieldsPage })))
const AdminProductOptionsPage = lazy(() => import('@/pages/admin/AdminProductOptionsPage').then(m => ({ default: m.AdminProductOptionsPage })))
const AdminNewRequestPage = lazy(() => import('@/pages/admin/AdminNewRequestPage').then(m => ({ default: m.AdminNewRequestPage })))
const OnboardingRecipientsPage = lazy(() => import('@/pages/admin/onboarding/OnboardingRecipientsPage').then(m => ({ default: m.OnboardingRecipientsPage })))
const OnboardingComposerPage = lazy(() => import('@/pages/admin/onboarding/OnboardingComposerPage').then(m => ({ default: m.OnboardingComposerPage })))
const OnboardingHistoryPage = lazy(() => import('@/pages/admin/onboarding/OnboardingHistoryPage').then(m => ({ default: m.OnboardingHistoryPage })))
const OnboardingVariablesPage = lazy(() => import('@/pages/admin/onboarding/OnboardingVariablesPage').then(m => ({ default: m.OnboardingVariablesPage })))
const AdminItRequestsPage = lazy(() => import('@/pages/admin/AdminItRequestsPage').then(m => ({ default: m.AdminItRequestsPage })))
const AdminItFormBuilderPage = lazy(() => import('@/pages/admin/AdminItFormBuilderPage').then(m => ({ default: m.AdminItFormBuilderPage })))
const OffboardingPage = lazy(() => import('@/pages/admin/offboarding/OffboardingPage').then(m => ({ default: m.OffboardingPage })))
const AdminOffboardingFormBuilderPage = lazy(() => import('@/pages/admin/AdminOffboardingFormBuilderPage').then(m => ({ default: m.AdminOffboardingFormBuilderPage })))
const AdminMailboxRequestsPage = lazy(() => import('@/pages/admin/AdminMailboxRequestsPage').then(m => ({ default: m.AdminMailboxRequestsPage })))
const AdminMailboxFormBuilderPage = lazy(() => import('@/pages/admin/AdminMailboxFormBuilderPage').then(m => ({ default: m.AdminMailboxFormBuilderPage })))
const AdminAllRequestsPage = lazy(() => import('@/pages/admin/AdminAllRequestsPage').then(m => ({ default: m.AdminAllRequestsPage })))
const AdminQRCodesPage = lazy(() => import('@/pages/admin/AdminQRCodesPage').then(m => ({ default: m.AdminQRCodesPage })))
const AdminScanLogsPage = lazy(() => import('@/pages/admin/AdminScanLogsPage').then(m => ({ default: m.AdminScanLogsPage })))
const AdminQRTestPage = lazy(() => import('@/pages/admin/AdminQRTestPage').then(m => ({ default: m.AdminQRTestPage })))

// Suspense wrapper for lazy-loaded pages
function Lazy({ children }) {
  return <Suspense fallback={<PageLoading />}>{children}</Suspense>
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

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
        <Route path="catalog/:productId" element={<Lazy><ProductDetailPage /></Lazy>} />
        <Route path="catalog/:productId/reserve" element={<Lazy><ReservePage /></Lazy>} />
        <Route path="requests" element={<Lazy><RequestsPage /></Lazy>} />
        <Route path="requests/:requestId" element={<Lazy><RequestDetailPage /></Lazy>} />
        <Route path="profile" element={<Lazy><ProfilePage /></Lazy>} />
        <Route path="it-request" element={<RequireModuleAccess moduleKey="it_form"><Lazy><ItRequestFormPage /></Lazy></RequireModuleAccess>} />
        <Route path="functional-mailbox" element={<RequireModuleAccess moduleKey="functional_mailbox"><Lazy><FunctionalMailboxFormPage /></Lazy></RequireModuleAccess>} />
        <Route path="my-requests" element={<Lazy><MyRequestsPage /></Lazy>} />
        <Route path="scan" element={<Lazy><ScanPage /></Lazy>} />
        <Route path="my-equipments" element={<Lazy><MyEquipmentsPage /></Lazy>} />
        <Route path="onboarding-request" element={<Lazy><OnboardingRequestPage /></Lazy>} />
        <Route path="equipment-request" element={<Lazy><EquipmentRequestPage /></Lazy>} />
        <Route path="offboarding-request" element={<Lazy><OffboardingRequestPage /></Lazy>} />

        {/* Admin routes — all lazy */}
        <Route
          path="admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<Lazy><AdminDashboardPage /></Lazy>} />
          <Route path="all-requests" element={<Lazy><AdminAllRequestsPage /></Lazy>} />
          <Route path="products" element={<Lazy><AdminProductsPage /></Lazy>} />
          <Route path="product-options" element={<Lazy><AdminProductOptionsPage /></Lazy>} />
          <Route path="categories" element={<Lazy><AdminCategoriesPage /></Lazy>} />
          <Route path="requests" element={<Lazy><AdminRequestsPage /></Lazy>} />
          <Route path="requests/:requestId" element={<Lazy><AdminRequestDetailPage /></Lazy>} />
          <Route path="new-request" element={<Lazy><AdminNewRequestPage /></Lazy>} />
          <Route path="returns" element={<Lazy><AdminReturnsPage /></Lazy>} />
          <Route path="users" element={<Lazy><AdminUsersPage /></Lazy>} />
          <Route path="design" element={<Lazy><AdminDesignPage /></Lazy>} />
          <Route path="email-templates" element={<Lazy><AdminEmailTemplatesPage /></Lazy>} />
          <Route path="planning" element={<Lazy><AdminPlanningPage /></Lazy>} />
          <Route path="forms" element={<Lazy><AdminFormFieldsPage /></Lazy>} />
          <Route path="onboarding" element={<Lazy><OnboardingRecipientsPage /></Lazy>} />
          <Route path="onboarding/compose" element={<Lazy><OnboardingComposerPage /></Lazy>} />
          <Route path="onboarding/compose/:emailId" element={<Lazy><OnboardingComposerPage /></Lazy>} />
          <Route path="onboarding/history" element={<Lazy><OnboardingHistoryPage /></Lazy>} />
          <Route path="onboarding/variables" element={<Lazy><OnboardingVariablesPage /></Lazy>} />
          <Route path="it-requests" element={<Lazy><AdminItRequestsPage /></Lazy>} />
          <Route path="it-form-builder" element={<Lazy><AdminItFormBuilderPage /></Lazy>} />
          <Route path="offboarding" element={<Lazy><OffboardingPage /></Lazy>} />
          <Route path="offboarding-form-builder" element={<Lazy><AdminOffboardingFormBuilderPage /></Lazy>} />
          <Route path="mailbox-requests" element={<Lazy><AdminMailboxRequestsPage /></Lazy>} />
          <Route path="mailbox-form-builder" element={<Lazy><AdminMailboxFormBuilderPage /></Lazy>} />
          <Route path="qr-codes" element={<Lazy><AdminQRCodesPage /></Lazy>} />
          <Route path="scan-logs" element={<Lazy><AdminScanLogsPage /></Lazy>} />
          <Route path="qr-test" element={<Lazy><AdminQRTestPage /></Lazy>} />
          {/* Redirect old module-access route to users page */}
          <Route path="module-access" element={<Navigate to="/admin/users" replace />} />
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
