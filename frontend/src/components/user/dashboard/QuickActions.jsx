import { Link } from "react-router-dom";
import { Heart, HelpCircle, MapPin, Package, Settings, TicketPercent, UserRound } from "lucide-react";

const actions = [
  { label: "Orders", href: "/orders", icon: Package },
  { label: "Wishlist", href: "/dashboard/user/wishlist", icon: Heart },
  { label: "Address", href: "/addresses", icon: MapPin },
  { label: "Coupons", href: "/shop", icon: TicketPercent },
  { label: "Support", href: "/support", icon: HelpCircle },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Profile", href: "/profile", icon: UserRound },
];

export function QuickActions() {
  return (
    <section aria-label="Quick actions" className="grid grid-cols-4 gap-2">
      {actions.map((action) => (
        <Link
          key={action.href}
          to={action.href}
          className="group flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-1.5 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white dark:bg-indigo-500/10 dark:text-indigo-400 dark:group-hover:bg-indigo-600 dark:group-hover:text-white">
            <action.icon className="h-4.5 w-4.5" />
          </span>
          <span className="max-w-full truncate text-[11px] font-semibold leading-none text-slate-700 dark:text-slate-200">
            {action.label}
          </span>
        </Link>
      ))}
    </section>
  );
}
