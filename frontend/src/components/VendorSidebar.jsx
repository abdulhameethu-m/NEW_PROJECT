import { NavLink } from "react-router-dom";

const vendorNavItems = [
  { label: "Overview", to: "/vendor/dashboard" },
  { label: "Products", to: "/vendor/products" },
  { label: "Orders", to: "/vendor/orders" },
  { label: "Inventory", to: "/vendor/inventory" },
  { label: "Analytics", to: "/vendor/analytics" },
  { label: "Payouts", to: "/vendor/payouts" },
  { label: "Delivery", to: "/vendor/delivery" },
  { label: "Notifications", to: "/vendor/notifications" },
  { label: "Reviews", to: "/vendor/reviews" },
  { label: "Returns", to: "/vendor/returns" },
  { label: "Offers", to: "/vendor/offers" },
  { label: "Support", to: "/vendor/support" },
  { label: "Settings", to: "/vendor/settings" },
];

export function VendorSidebar({ open, onClose, unreadCount = 0 }) {
  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-slate-950/40 transition-opacity duration-300 lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[min(18rem,88vw)] flex-col border-r border-slate-200 bg-white transition-transform duration-300 ease-out dark:border-slate-800 dark:bg-slate-950 lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5 sm:py-4 dark:border-slate-800">
          <div className="min-w-0">
            <div className="truncate text-base sm:text-lg font-semibold text-slate-950 dark:text-white">Vendor Central</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Seller workspace</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex flex-shrink-0 h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" d="M5 5l10 10M15 5 5 15" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {vendorNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                [
                  "flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition",
                  isActive
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
                ].join(" ")
              }
            >
              <span>{item.label}</span>
              {item.to === "/vendor/notifications" && unreadCount > 0 ? (
                <span className="ml-2 inline-flex flex-shrink-0 rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                  {unreadCount}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
