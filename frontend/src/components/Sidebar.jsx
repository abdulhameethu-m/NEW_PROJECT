import { NavLink } from "react-router-dom";
import { useAdminSession } from "../hooks/useAdminSession";

export function Sidebar({ open, onClose }) {
  const { basePath, isLegacyAdmin, canAccess } = useAdminSession();
  const navItems = [
    { label: "Dashboard", to: `${basePath}/dashboard`, visible: isLegacyAdmin || canAccess("analytics.read") },
    { label: "Users", to: `${basePath}/users`, visible: isLegacyAdmin || canAccess("users.read") },
    { label: "Products", to: `${basePath}/products`, visible: isLegacyAdmin || canAccess("products.read") },
    { label: "Orders", to: `${basePath}/orders`, visible: isLegacyAdmin || canAccess("orders.read") },
    { label: "Analytics", to: `${basePath}/analytics`, visible: isLegacyAdmin || canAccess("analytics.read") },
    { label: "Settings", to: `${basePath}/settings`, visible: isLegacyAdmin || canAccess("settings.update") || canAccess("analytics.read") },
    { label: "Sellers", to: "/admin/sellers", visible: isLegacyAdmin },
    { label: "Categories", to: "/admin/categories", visible: isLegacyAdmin },
    { label: "Subcategories", to: "/admin/subcategories", visible: isLegacyAdmin },
    { label: "Attributes", to: "/admin/attributes", visible: isLegacyAdmin },
    { label: "Product Modules", to: "/admin/product-modules", visible: isLegacyAdmin },
    { label: "Vendor Access", to: "/admin/vendor-access", visible: isLegacyAdmin },
    { label: "Revenue", to: "/admin/revenue", visible: isLegacyAdmin },
    { label: "Audit Logs", to: "/admin/audit-logs", visible: isLegacyAdmin },
    { label: "Staff Roles", to: "/admin/roles", visible: isLegacyAdmin },
    { label: "Staff Accounts", to: "/admin/staff", visible: isLegacyAdmin },
  ].filter((item) => item.visible);

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-slate-950/40 transition-opacity duration-300 lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[min(17rem,85vw)] flex-col border-r border-slate-200 bg-white transition-transform duration-300 ease-out dark:border-slate-800 dark:bg-slate-950 lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5 sm:py-4 dark:border-slate-800">
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-slate-950 dark:text-white sm:text-lg">
              {isLegacyAdmin ? "Admin Hub" : "Staff Hub"}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {isLegacyAdmin ? "Control center" : "Permission-based workspace"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex flex-shrink-0 h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" d="M5 5l10 10M15 5 5 15" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                [
                  "flex items-center rounded-xl px-4 py-3 text-sm font-medium transition",
                  isActive
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
                ].join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
