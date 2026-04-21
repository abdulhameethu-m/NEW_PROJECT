import { Outlet, useLocation } from "react-router-dom";
import { useMemo, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

const pageMeta = {
  "/admin/dashboard": {
    title: "Dashboard",
    subtitle: "Monitor business performance, queues, and platform growth.",
  },
  "/admin/users": {
    title: "Users",
    subtitle: "Manage user accounts, access, and lifecycle actions.",
  },
  "/admin/sellers": {
    title: "Sellers",
    subtitle: "Review applications and control seller approvals.",
  },
  "/admin/products": {
    title: "Products",
    subtitle: "Moderate product catalog quality and approval workflow.",
  },
  "/admin/categories": {
    title: "Categories",
    subtitle: "Control category visibility, ordering, and storefront presentation.",
  },
  "/admin/orders": {
    title: "Orders",
    subtitle: "Track fulfillment progress and update order statuses.",
  },
  "/admin/analytics": {
    title: "Analytics",
    subtitle: "Review revenue, top products, and sales momentum.",
  },
  "/admin/revenue": {
    title: "Revenue",
    subtitle: "Track platform sales, commission, and vendor earnings with export-ready reporting.",
  },
  "/admin/audit-logs": {
    title: "Audit Logs",
    subtitle: "Inspect admin actions, compliance events, and operational history.",
  },
  "/admin/settings": {
    title: "Settings",
    subtitle: "Admin workspace preferences and operational notes.",
  },
  "/admin/roles": {
    title: "Staff Roles",
    subtitle: "Create reusable role templates and manage RBAC permissions.",
  },
  "/admin/staff": {
    title: "Staff Accounts",
    subtitle: "Provision staff access, assign roles, and control account status.",
  },
  "/staff/dashboard": {
    title: "Staff Dashboard",
    subtitle: "Your assigned workspace modules and operational overview.",
  },
  "/staff/users": {
    title: "Users",
    subtitle: "Customer records you are permitted to view or update.",
  },
  "/staff/products": {
    title: "Products",
    subtitle: "Catalog controls available to your assigned role.",
  },
  "/staff/orders": {
    title: "Orders",
    subtitle: "Order tasks and workflow actions available to your role.",
  },
  "/staff/analytics": {
    title: "Analytics",
    subtitle: "Reporting and dashboards granted to your role.",
  },
  "/staff/settings": {
    title: "Settings",
    subtitle: "Staff-facing operational settings and workspace notes.",
  },
};

export function AdminLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const meta = useMemo(() => {
    if (location.pathname.startsWith("/admin/sellers/")) {
      return {
        title: "Seller Details",
        subtitle: "Inspect onboarding details and decision history.",
      };
    }
    return pageMeta[location.pathname] || pageMeta["/admin/dashboard"];
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen max-w-full overflow-x-hidden bg-slate-100 dark:bg-slate-950">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 max-w-full flex-1 flex-col">
        <Topbar
          title={meta.title}
          subtitle={meta.subtitle}
          onMenuToggle={() => setSidebarOpen((open) => !open)}
        />
        <main className="min-w-0 max-w-full flex-1 overflow-x-hidden px-4 py-4 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
