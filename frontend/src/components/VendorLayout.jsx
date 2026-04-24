import { useEffect } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { Topbar } from "./Topbar";
import { Sidebar } from "./sidebar/Sidebar";
import { useVendorDashboardStore } from "../context/vendorDashboardStore";
import { useAuthStore } from "../context/authStore";
import { VendorModuleProvider, useModuleAccess } from "../context/VendorModuleContext";
import { useVendorSidebarData } from "../hooks/useVendorSidebarData";

const pageMeta = {
  "/vendor/dashboard": {
    title: "Dashboard",
    subtitle: "Track revenue, orders, fulfillment progress, and operational health.",
  },
  "/vendor/products": {
    title: "Products",
    subtitle: "Manage listings, approvals, and catalog quality without leaving the seller workspace.",
  },
  "/vendor/orders": {
    title: "Orders",
    subtitle: "Move orders through the fulfillment pipeline and keep customers informed.",
  },
  "/vendor/inventory": {
    title: "Inventory",
    subtitle: "Watch stock, thresholds, and low-stock risk across your catalog.",
  },
  "/vendor/analytics": {
    title: "Analytics",
    subtitle: "Read sales trends, top products, and performance distribution at a glance.",
  },
  "/vendor/payouts": {
    title: "Payouts",
    subtitle: "Review earnings, pending transfers, and payout history.",
  },
  "/vendor/delivery": {
    title: "Delivery",
    subtitle: "Assign courier details and maintain shipment visibility.",
  },
  "/vendor/notifications": {
    title: "Notifications",
    subtitle: "Stay on top of orders, payouts, system activity, and product alerts.",
  },
  "/vendor/reviews": {
    title: "Reviews",
    subtitle: "See customer feedback and reply quickly from one place.",
  },
  "/vendor/returns": {
    title: "Returns & Refunds",
    subtitle: "Handle approvals, rejections, and refund decisions with audit-friendly notes.",
  },
  "/vendor/offers": {
    title: "Discounts & Offers",
    subtitle: "Launch time-bound promotions and vendor-specific campaigns.",
  },
  "/vendor/content": {
    title: "Homepage Content",
    subtitle: "Create promotional banners and content to showcase on the homepage.",
  },
  "/vendor/support": {
    title: "Support",
    subtitle: "Open tickets with your operations team and keep a message history.",
  },
  "/vendor/settings": {
    title: "Store Settings",
    subtitle: "Control storefront, payout, notification, and security-related preferences.",
  },
};

function VendorLayoutInner() {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const { sidebarOpen, setSidebarOpen, notificationsUnread, fetchNotificationsUnread } = useVendorDashboardStore();
  const { can } = useModuleAccess();
  const sidebarData = useVendorSidebarData({ unreadCount: notificationsUnread });
  const meta = pageMeta[location.pathname] || pageMeta["/vendor/dashboard"];

  useEffect(() => {
    fetchNotificationsUnread().catch(() => {});
  }, [fetchNotificationsUnread, location.pathname]);

  if (!user || user.role !== "vendor") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="flex min-h-screen max-w-full overflow-x-hidden">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          title={sidebarData.title}
          subtitle={sidebarData.subtitle}
          primaryItem={sidebarData.primaryItem}
          sections={sidebarData.sections}
          loading={sidebarData.loading}
          error={sidebarData.error}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar title={meta.title} subtitle={meta.subtitle} onMenuToggle={() => setSidebarOpen(true)} />
          <main className="min-w-0 max-w-full flex-1 overflow-x-hidden px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
                Seller workspace
              </div>
              <div className="flex flex-col gap-2 xs:flex-row xs:gap-3 text-xs sm:text-sm">
                <Link 
                  to="/vendor/dashboard" 
                  className="inline-flex justify-center rounded-xl border border-slate-200 px-3 py-2 text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  Overview
                </Link>
                {can("products.create") ? (
                  <Link 
                    to="/seller/products/create" 
                    className="inline-flex justify-center rounded-xl bg-slate-900 px-3 py-2 font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                  >
                    Add Product
                  </Link>
                ) : null}
              </div>
            </div>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export function VendorLayout() {
  return (
    <VendorModuleProvider>
      <VendorLayoutInner />
    </VendorModuleProvider>
  );
}
