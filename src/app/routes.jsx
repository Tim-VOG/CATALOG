import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { RequireAdmin } from '@/components/auth/RequireAdmin'
import { RequireModuleAccess } from '@/components/auth/RequireModuleAccess'
import { AppLayout } from '@/components/layout/AppLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PageLoading } from '@/components/common/LoadingSpinner'

// Public pages (loaded eagerly for fast first paint)
import { LoginPage } from '@/pages/auth/LoginPage'
import { AuthCallbackPage } from '@/pages/auth/AuthCallbackPage'
import { HubPage } from '@/pages/HubPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

// User pages (lazy loaded)
const CatalogPage = lazy(() => import('@/pages/catalog/CatalogPage').then(m => ({ default: m.CatalogPage })))
const ProductDetailPage = lazy(() => import('@/pages/catalog/ProductDetailPage').then(m => ({ default: m.ProductDetailPage })))
const CartPage = lazy(() => import('@/pages/cart/CartPage').then(m => ({ default: m.CartPage })))
const CheckoutPage = lazy(() => import('@/pages/checkout/CheckoutPage').then(m => ({ default: m.CheckoutPage })))
const RequestsPage = lazy(() => import('@/pages/requests/RequestsPage').then(m => ({ default: m.RequestsPage })))
const RequestDetailPage = lazy(() => import('@/pages/requests/RequestDetailPage').then(m => ({ default: m.RequestDetailPage })))
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage').then(m => ({ default: m.ProfilePage })))
const MyRequestsPage = lazy(() => import('@/pages/my-requests/MyRequestsPage').then(m => ({ default: m.MyRequestsPage })))
const ItRequestFormPage = lazy(() => import('@/pages/it-request/ItRequestFormPage').then(m => ({ default: m.ItRequestFormPage })))
const FunctionalMailboxFormPage = lazy(() => import('@/pages/functional-mailbox/FunctionalMailboxFormPage').then(m => ({ default: m.FunctionalMailboxFormPage })))

// Admin pages (lazy loaded)
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })))
const AdminProductsPage = lazy(() => import('@/pages/admin/AdminProductsPage').then(m => ({ default: m.AdminProductsPage })))
const AdminProductOptionsPage = lazy(() => import('@/pages/admin/AdminProductOptionsPage').then(m => ({ default: m.AdminProductOptionsPage })))
const AdminCategoriesPage = lazy(() => import('@/pages/admin/AdminCategoriesPage').then(m => ({ default: m.AdminCategoriesPage })))
const AdminRequestsPage = lazy(() => import('@/pages/admin/AdminRequestsPage').then(m => ({ default: m.AdminRequestsPage })))
const AdminRequestDetailPage = lazy(() => import('@/pages/admin/AdminRequestDetailPage').then(m => ({ default: m.AdminRequestDetailPage })))
const AdminNewRequestPage = lazy(() => import('@/pages/admin/AdminNewRequestPage').then(m => ({ default: m.AdminNewRequestPage })))
const AdminReturnsPage = lazy(() => import('@/pages/admin/AdminReturnsPage').then(m => ({ default: m.AdminReturnsPage })))
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })))
const AdminDesignPage = lazy(() => import('@/pages/admin/AdminDesignPage').then(m => ({ default: m.AdminDesignPage })))
const AdminEmailTemplatesPage = lazy(() => import('@/pages/admin/AdminEmailTemplatesPage').then(m => ({ default: m.AdminEmailTemplatesPage })))
const AdminPlanningPage = lazy(() => import('@/pages/admin/AdminPlanningPage').then(m => ({ default: m.AdminPlanningPage })))
const AdminFormFieldsPage = lazy(() => import('@/pages/admin/AdminFormFieldsPage').then(m => ({ default: m.AdminFormFieldsPage })))
const AdminAllRequestsPage = lazy(() => import('@/pages/admin/AdminAllRequestsPage').then(m => ({ default: m.AdminAllRequestsPage })))
const AdminItRequestsPage = lazy(() => import('@/pages/admin/AdminItRequestsPage').then(m => ({ default: m.AdminItRequestsPage })))
const AdminItFormBuilderPage = lazy(() => import('@/pages/admin/AdminItFormBuilderPage').then(m => ({ default: m.AdminItFormBuilderPage })))
const AdminMailboxRequestsPage = lazy(() => import('@/pages/admin/AdminMailboxRequestsPage').then(m => ({ default: m.AdminMailboxRequestsPage })))
const AdminMailboxFormBuilderPage = lazy(() => import('@/pages/admin/AdminMailboxFormBuilderPage').then(m => ({ default: m.AdminMailboxFormBuilderPage })))
const AdminOffboardingFormBuilderPage = lazy(() => import('@/pages/admin/AdminOffboardingFormBuilderPage').then(m => ({ default: m.AdminOffboardingFormBuilderPage })))
const OnboardingRecipientsPage = lazy(() => import('@/pages/admin/onboarding/OnboardingRecipientsPage').then(m => ({ default: m.OnboardingRecipientsPage })))
const OnboardingComposerPage = lazy(() => import('@/pages/admin/onboarding/OnboardingComposerPage').then(m => ({ default: m.OnboardingComposerPage })))
const OnboardingHistoryPage = lazy(() => import('@/pages/admin/onboarding/OnboardingHistoryPage').then(m => ({ default: m.OnboardingHistoryPage })))
const OnboardingVariablesPage = lazy(() => import('@/pages/admin/onboarding/OnboardingVariablesPage').then(m => ({ default: m.OnboardingVariablesPage })))
const OffboardingPage = lazy(() => import('@/pages/admin/offboarding/OffboardingPage').then(m => ({ default: m.OffboardingPage })))

function LazyPage({ children }) {
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
        <Route path="catalog" element={<LazyPage><CatalogPage /></LazyPage>} />
        <Route path="catalog/:productId" element={<LazyPage><ProductDetailPage /></LazyPage>} />
        <Route path="cart" element={<LazyPage><CartPage /></LazyPage>} />
        <Route path="checkout" element={<LazyPage><CheckoutPage /></LazyPage>} />
        <Route path="requests" element={<LazyPage><RequestsPage /></LazyPage>} />
        <Route path="requests/:requestId" element={<LazyPage><RequestDetailPage /></LazyPage>} />
        <Route path="profile" element={<LazyPage><ProfilePage /></LazyPage>} />
        <Route path="it-request" element={<RequireModuleAccess moduleKey="it_form"><LazyPage><ItRequestFormPage /></LazyPage></RequireModuleAccess>} />
        <Route path="functional-mailbox" element={<RequireModuleAccess moduleKey="functional_mailbox"><LazyPage><FunctionalMailboxFormPage /></LazyPage></RequireModuleAccess>} />
        <Route path="my-requests" element={<LazyPage><MyRequestsPage /></LazyPage>} />

        {/* Admin routes */}
        <Route
          path="admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<LazyPage><AdminDashboardPage /></LazyPage>} />
          <Route path="all-requests" element={<LazyPage><AdminAllRequestsPage /></LazyPage>} />
          <Route path="products" element={<LazyPage><AdminProductsPage /></LazyPage>} />
          <Route path="product-options" element={<LazyPage><AdminProductOptionsPage /></LazyPage>} />
          <Route path="categories" element={<LazyPage><AdminCategoriesPage /></LazyPage>} />
          <Route path="requests" element={<LazyPage><AdminRequestsPage /></LazyPage>} />
          <Route path="requests/:requestId" element={<LazyPage><AdminRequestDetailPage /></LazyPage>} />
          <Route path="new-request" element={<LazyPage><AdminNewRequestPage /></LazyPage>} />
          <Route path="returns" element={<LazyPage><AdminReturnsPage /></LazyPage>} />
          <Route path="users" element={<LazyPage><AdminUsersPage /></LazyPage>} />
          <Route path="design" element={<LazyPage><AdminDesignPage /></LazyPage>} />
          <Route path="email-templates" element={<LazyPage><AdminEmailTemplatesPage /></LazyPage>} />
          <Route path="planning" element={<LazyPage><AdminPlanningPage /></LazyPage>} />
          <Route path="forms" element={<LazyPage><AdminFormFieldsPage /></LazyPage>} />
          <Route path="onboarding" element={<LazyPage><OnboardingRecipientsPage /></LazyPage>} />
          <Route path="onboarding/compose" element={<LazyPage><OnboardingComposerPage /></LazyPage>} />
          <Route path="onboarding/compose/:emailId" element={<LazyPage><OnboardingComposerPage /></LazyPage>} />
          <Route path="onboarding/history" element={<LazyPage><OnboardingHistoryPage /></LazyPage>} />
          <Route path="onboarding/variables" element={<LazyPage><OnboardingVariablesPage /></LazyPage>} />
          <Route path="it-requests" element={<LazyPage><AdminItRequestsPage /></LazyPage>} />
          <Route path="it-form-builder" element={<LazyPage><AdminItFormBuilderPage /></LazyPage>} />
          <Route path="offboarding" element={<LazyPage><OffboardingPage /></LazyPage>} />
          <Route path="offboarding-form-builder" element={<LazyPage><AdminOffboardingFormBuilderPage /></LazyPage>} />
          <Route path="mailbox-requests" element={<LazyPage><AdminMailboxRequestsPage /></LazyPage>} />
          <Route path="mailbox-form-builder" element={<LazyPage><AdminMailboxFormBuilderPage /></LazyPage>} />
          <Route path="module-access" element={<Navigate to="/admin/users" replace />} />
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
