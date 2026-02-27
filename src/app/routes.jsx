import { Routes, Route, Navigate } from 'react-router-dom'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { RequireAdmin } from '@/components/auth/RequireAdmin'
import { AppLayout } from '@/components/layout/AppLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'

import { HubPage } from '@/pages/HubPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { AuthCallbackPage } from '@/pages/auth/AuthCallbackPage'
import { CatalogPage } from '@/pages/catalog/CatalogPage'
import { ProductDetailPage } from '@/pages/catalog/ProductDetailPage'
import { CartPage } from '@/pages/cart/CartPage'
import { CheckoutPage } from '@/pages/checkout/CheckoutPage'
import { RequestsPage } from '@/pages/requests/RequestsPage'
import { RequestDetailPage } from '@/pages/requests/RequestDetailPage'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { AdminProductsPage } from '@/pages/admin/AdminProductsPage'
import { AdminCategoriesPage } from '@/pages/admin/AdminCategoriesPage'
import { AdminRequestsPage } from '@/pages/admin/AdminRequestsPage'
import { AdminRequestDetailPage } from '@/pages/admin/AdminRequestDetailPage'
import { AdminReturnsPage } from '@/pages/admin/AdminReturnsPage'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'
import { AdminDesignPage } from '@/pages/admin/AdminDesignPage'
import { AdminEmailTemplatesPage } from '@/pages/admin/AdminEmailTemplatesPage'
import { AdminPlanningPage } from '@/pages/admin/AdminPlanningPage'
import { AdminFormFieldsPage } from '@/pages/admin/AdminFormFieldsPage'
import { AdminProductOptionsPage } from '@/pages/admin/AdminProductOptionsPage'
import { AdminNewRequestPage } from '@/pages/admin/AdminNewRequestPage'
import { ProfilePage } from '@/pages/profile/ProfilePage'
import { OnboardingRecipientsPage } from '@/pages/admin/onboarding/OnboardingRecipientsPage'
import { OnboardingComposerPage } from '@/pages/admin/onboarding/OnboardingComposerPage'
import { OnboardingHistoryPage } from '@/pages/admin/onboarding/OnboardingHistoryPage'
import { ItRequestFormPage } from '@/pages/it-request/ItRequestFormPage'
import { AdminItRequestsPage } from '@/pages/admin/AdminItRequestsPage'
import { OnboardingVariablesPage } from '@/pages/admin/onboarding/OnboardingVariablesPage'
import { AdminModuleAccessPage } from '@/pages/admin/AdminModuleAccessPage'
import { AdminItFormBuilderPage } from '@/pages/admin/AdminItFormBuilderPage'
import { RequireModuleAccess } from '@/components/auth/RequireModuleAccess'
import { NotFoundPage } from '@/pages/NotFoundPage'

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
        <Route path="catalog/:productId" element={<ProductDetailPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="requests" element={<RequestsPage />} />
        <Route path="requests/:requestId" element={<RequestDetailPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="it-request" element={<RequireModuleAccess moduleKey="it_form"><ItRequestFormPage /></RequireModuleAccess>} />

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
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="product-options" element={<AdminProductOptionsPage />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="requests" element={<AdminRequestsPage />} />
          <Route path="requests/:requestId" element={<AdminRequestDetailPage />} />
          <Route path="new-request" element={<AdminNewRequestPage />} />
          <Route path="returns" element={<AdminReturnsPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="design" element={<AdminDesignPage />} />
          <Route path="email-templates" element={<AdminEmailTemplatesPage />} />
          <Route path="planning" element={<AdminPlanningPage />} />
          <Route path="forms" element={<AdminFormFieldsPage />} />
          <Route path="onboarding" element={<OnboardingRecipientsPage />} />
          <Route path="onboarding/compose" element={<OnboardingComposerPage />} />
          <Route path="onboarding/compose/:emailId" element={<OnboardingComposerPage />} />
          <Route path="onboarding/history" element={<OnboardingHistoryPage />} />
          <Route path="onboarding/variables" element={<OnboardingVariablesPage />} />
          <Route path="it-requests" element={<AdminItRequestsPage />} />
          <Route path="it-form-builder" element={<AdminItFormBuilderPage />} />
          <Route path="module-access" element={<AdminModuleAccessPage />} />
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
