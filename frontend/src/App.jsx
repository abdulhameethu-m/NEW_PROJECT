import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AdminLayout } from "./components/AdminLayout";
import { VendorLayout } from "./components/VendorLayout";
import { UserAccountLayout } from "./components/UserAccountLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RoleGate } from "./components/RoleGate";
import { StaffProtectedRoute } from "./components/StaffProtectedRoute";
import { StaffPermissionRoute } from "./components/StaffPermissionRoute";
import { StaffDashboardLayout } from "./components/staff/DashboardLayout";
import VendorModuleRoute from "./components/VendorModuleRoute";
import { VendorModuleProvider } from "./context/VendorModuleContext";

import { HomePage } from "./pages/HomePage";
import { RoleSelectionPage } from "./pages/RoleSelectionPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardRedirect } from "./pages/DashboardRedirect";
import { UserDashboardPage } from "./pages/UserDashboardPage";
import { VendorDashboardPage } from "./pages/VendorDashboardPage";
import { VendorOnboardingPage } from "./pages/VendorOnboardingPage";
import { VendorStatusPage } from "./pages/VendorStatusPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AdminVendorDetailsPage } from "./pages/AdminVendorDetailsPage";
import { AdminUsersPage } from "./pages/AdminUsersPage";
import { AdminSellersPage } from "./pages/AdminSellersPage";
import { ProductsPage } from "./pages/ProductsPage";
import { AdminProductsPage } from "./pages/AdminProductsPage";
import { AdminProductCreate } from "./pages/AdminProductCreate";
import { AdminProductEdit } from "./pages/AdminProductEdit";
import { AdminOrdersPage } from "./pages/AdminOrdersPage";
import { AdminOrderDetailsPage } from "./pages/AdminOrderDetailsPage";
import { AdminOrderCreatePage } from "./pages/AdminOrderCreatePage";
import { AdminAnalyticsPage } from "./pages/AdminAnalyticsPage";
import { AdminRevenuePage } from "./pages/AdminRevenuePage";
import { AuditLogsPage } from "./pages/AuditLogsPage";
import { AdminCategoriesPage } from "./pages/AdminCategoriesPage";
import { AdminSubcategoriesPage } from "./pages/AdminSubcategoriesPage";
import { AdminAttributesPage } from "./pages/AdminAttributesPage";
import { AdminFiltersPage } from "./pages/AdminFiltersPage";
import { AdminProductModulesPage } from "./pages/AdminProductModulesPage";
import { AdminContentPage } from "./pages/AdminContentPage";
import AdminVendorAccessPage from "./pages/AdminVendorAccessPage";
import { AdminSettingsPage } from "./pages/AdminSettingsPage";
import { AdminRolesPage } from "./pages/AdminRolesPage";
import { AdminStaffPage } from "./pages/AdminStaffPage";
import { SellerProductsPage } from "./pages/SellerProductsPage";
import { ProductFormPage } from "./pages/ProductFormPage";
import { ProductDetailsPage } from "./pages/ProductDetailsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { OrdersPage } from "./pages/OrdersPage";
import { WishlistPage } from "./pages/WishlistPage";
import { AddressesPage } from "./pages/AddressesPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ReviewsPage } from "./pages/ReviewsPage";
import { SupportPage } from "./pages/SupportPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { OrderDetailsPage } from "./pages/OrderDetailsPage";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { VendorOverviewPage } from "./pages/VendorOverviewPage";
import { VendorProductsPage } from "./pages/VendorProductsPage";
import { VendorOrdersPage } from "./pages/VendorOrdersPage";
import { VendorInventoryPage } from "./pages/VendorInventoryPage";
import { VendorAnalyticsPage } from "./pages/VendorAnalyticsPage";
import { VendorPayoutsPage } from "./pages/VendorPayoutsPage";
import { VendorDeliveryPage } from "./pages/VendorDeliveryPage";
import { VendorNotificationsPage } from "./pages/VendorNotificationsPage";
import { VendorReviewsPage } from "./pages/VendorReviewsPage";
import { VendorReturnsPage } from "./pages/VendorReturnsPage";
import { VendorOffersPage } from "./pages/VendorOffersPage";
import { VendorContentPage } from "./pages/VendorContentPage";
import { VendorFiltersPage } from "./pages/VendorFiltersPage";
import { VendorSupportPage } from "./pages/VendorSupportPage";
import { VendorSettingsPage } from "./pages/VendorSettingsPage";
import { TermsAndConditionsPage } from "./pages/TermsAndConditionsPage";
import { PrivacyPolicyPage } from "./pages/PrivacyPolicyPage";
import { ReturnPolicyPage } from "./pages/ReturnPolicyPage";
import { ShippingPolicyPage } from "./pages/ShippingPolicyPage";
import { StaffDashboardPage } from "./pages/StaffDashboardPage";
import { StaffUsersPage } from "./pages/StaffUsersPage";
import { StaffOrdersPage } from "./pages/StaffOrdersPage";
import { StaffProductsPage } from "./pages/StaffProductsPage";
import { StaffPayoutsPage } from "./pages/StaffPayoutsPage";
import { StaffPaymentsPage } from "./pages/StaffPaymentsPage";
import { StaffReviewsPage } from "./pages/StaffReviewsPage";
import { StaffAnalyticsPage } from "./pages/StaffAnalyticsPage";
import { StaffSettingsPage } from "./pages/StaffSettingsPage";
import { StaffRolesPage } from "./pages/StaffRolesPage";
import { StaffStaffPage } from "./pages/StaffStaffPage";
import { StaffUnauthorizedPage } from "./pages/StaffUnauthorizedPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/role" element={<RoleSelectionPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/staff/login" element={<Navigate to="/login" replace />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/product/:productId" element={<ProductDetailsPage />} />
        <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/return-policy" element={<ReturnPolicyPage />} />
        <Route path="/shipping-policy" element={<ShippingPolicyPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardRedirect />} />
          <Route path="/profile" element={<ProfilePage />} />

          <Route element={<RoleGate roles={["user"]} />}>
            <Route element={<UserAccountLayout />}>
              <Route path="/user/dashboard" element={<UserDashboardPage />} />
              <Route path="/dashboard/user" element={<UserDashboardPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/orders/:orderId" element={<OrderDetailsPage />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/addresses" element={<AddressesPage />} />
              <Route path="/reviews" element={<ReviewsPage />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="/shop" element={<ProductsPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
          </Route>

          <Route element={<RoleGate roles={["vendor"]} />}>
            <Route path="/vendor/onboarding" element={<VendorOnboardingPage />} />
            <Route path="/vendor/status" element={<VendorStatusPage />} />
            <Route path="/dashboard/vendor" element={<VendorDashboardPage />} />
            <Route path="/seller/products" element={<VendorModuleProvider><VendorModuleRoute moduleKey="products" action="read"><SellerProductsPage /></VendorModuleRoute></VendorModuleProvider>} />
            <Route path="/seller/products/create" element={<VendorModuleProvider><VendorModuleRoute moduleKey="products" action="create"><ProductFormPage /></VendorModuleRoute></VendorModuleProvider>} />
            <Route path="/seller/products/:productId/edit" element={<VendorModuleProvider><VendorModuleRoute moduleKey="products" action="update"><ProductFormPage /></VendorModuleRoute></VendorModuleProvider>} />
            <Route path="/vendor" element={<VendorLayout />}>
              <Route index element={<Navigate to="/vendor/dashboard" replace />} />
              <Route path="dashboard" element={<VendorOverviewPage />} />
              <Route path="products" element={<VendorModuleRoute moduleKey="products"><VendorProductsPage /></VendorModuleRoute>} />
              <Route path="orders" element={<VendorModuleRoute moduleKey="orders"><VendorOrdersPage /></VendorModuleRoute>} />
              <Route path="inventory" element={<VendorModuleRoute moduleKey="inventory"><VendorInventoryPage /></VendorModuleRoute>} />
              <Route path="filters" element={<VendorModuleRoute moduleKey="filters"><VendorFiltersPage /></VendorModuleRoute>} />
              <Route path="analytics" element={<VendorModuleRoute moduleKey="analytics"><VendorAnalyticsPage /></VendorModuleRoute>} />
              <Route path="payouts" element={<VendorModuleRoute moduleKey="payments"><VendorPayoutsPage /></VendorModuleRoute>} />
              <Route path="delivery" element={<VendorModuleRoute moduleKey="delivery"><VendorDeliveryPage /></VendorModuleRoute>} />
              <Route path="notifications" element={<VendorNotificationsPage />} />
              <Route path="reviews" element={<VendorModuleRoute moduleKey="reviews"><VendorReviewsPage /></VendorModuleRoute>} />
              <Route path="returns" element={<VendorModuleRoute moduleKey="returns"><VendorReturnsPage /></VendorModuleRoute>} />
              <Route path="offers" element={<VendorOffersPage />} />
              <Route path="content" element={<VendorModuleRoute moduleKey="homepage_content"><VendorContentPage /></VendorModuleRoute>} />
              <Route path="support" element={<VendorSupportPage />} />
              <Route path="settings" element={<VendorSettingsPage />} />
            </Route>
          </Route>

          <Route element={<RoleGate roles={["admin", "super_admin", "support_admin", "finance_admin"]} />}>
            <Route path="/dashboard/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/dashboard/admin/vendor/:id" element={<AdminVendorDetailsPage />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="sellers" element={<AdminSellersPage />} />
              <Route path="sellers/:id" element={<AdminVendorDetailsPage />} />
              <Route path="products" element={<AdminProductsPage />} />
              <Route path="categories" element={<AdminCategoriesPage />} />
              <Route path="subcategories" element={<AdminSubcategoriesPage />} />
              <Route path="attributes" element={<AdminAttributesPage />} />
              <Route path="filters" element={<AdminFiltersPage />} />
              <Route path="product-modules" element={<AdminProductModulesPage />} />
              <Route path="content" element={<AdminContentPage />} />
              <Route path="vendor-access" element={<AdminVendorAccessPage />} />
              <Route path="products/create" element={<AdminProductCreate />} />
              <Route path="products/:id/edit" element={<AdminProductEdit />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="orders/create" element={<AdminOrderCreatePage />} />
              <Route path="orders/:id" element={<AdminOrderDetailsPage />} />
              <Route path="analytics" element={<AdminAnalyticsPage />} />
              <Route path="revenue" element={<AdminRevenuePage />} />
              <Route path="audit-logs" element={<AuditLogsPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route path="roles" element={<AdminRolesPage />} />
              <Route path="staff" element={<AdminStaffPage />} />
            </Route>
          </Route>
        </Route>

        <Route element={<StaffProtectedRoute />}>
          <Route path="/staff" element={<StaffDashboardLayout />}>
            <Route index element={<Navigate to="/staff/dashboard" replace />} />
            <Route path="dashboard" element={<StaffDashboardPage />} />
            <Route path="unauthorized" element={<StaffUnauthorizedPage />} />

            <Route element={<StaffPermissionRoute permission="users.read" />}>
              <Route path="users" element={<StaffUsersPage />} />
            </Route>
            <Route element={<StaffPermissionRoute permission="orders.read" />}>
              <Route path="orders" element={<StaffOrdersPage />} />
            </Route>
            <Route element={<StaffPermissionRoute permission="products.read" />}>
              <Route path="products" element={<StaffProductsPage />} />
            </Route>
            <Route element={<StaffPermissionRoute permission="filters.read" />}>
              <Route path="filters" element={<AdminFiltersPage />} />
            </Route>
            <Route element={<StaffPermissionRoute permission="reviews.read" />}>
              <Route path="reviews" element={<StaffReviewsPage />} />
            </Route>
            <Route element={<StaffPermissionRoute permission="payments.read" />}>
              <Route path="payments" element={<StaffPaymentsPage />} />
            </Route>
            <Route element={<StaffPermissionRoute permission="payouts.read" />}>
              <Route path="payouts" element={<StaffPayoutsPage />} />
            </Route>
            <Route element={<StaffPermissionRoute permission="analytics.read" />}>
              <Route path="analytics" element={<StaffAnalyticsPage />} />
            </Route>
            <Route element={<StaffPermissionRoute permission="settings.update" />}>
              <Route path="settings" element={<StaffSettingsPage />} />
            </Route>
            <Route element={<StaffPermissionRoute permission="roles.read" />}>
              <Route path="roles" element={<StaffRolesPage />} />
            </Route>
            <Route element={<StaffPermissionRoute permission="staff.read" />}>
              <Route path="staff" element={<StaffStaffPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="/shop" element={<ProductsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
