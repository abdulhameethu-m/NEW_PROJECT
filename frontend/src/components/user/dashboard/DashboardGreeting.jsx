import { Link } from "react-router-dom";
import { BadgeCheck, PackageCheck, Sparkles } from "lucide-react";
import { getInitials } from "./dashboardUtils";

export function DashboardGreeting({ user, recentOrder }) {
  const firstName = String(user?.name || "there").split(" ")[0];
  const orderStatus = recentOrder?.status || "Ready to shop";

  return (
    <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-4 py-4 text-white shadow-[0_18px_50px_-28px_rgba(15,23,42,0.8)] sm:px-5">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(14,165,233,0.28),transparent_38%),linear-gradient(315deg,rgba(244,114,182,0.2),transparent_36%)]" />
      <div className="relative flex min-h-[96px] items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-100">
            <Sparkles className="h-3.5 w-3.5" />
            Welcome back
          </div>
          <h1 className="mt-2 truncate text-xl font-bold leading-tight tracking-normal">{firstName}</h1>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-100">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1">
              <BadgeCheck className="h-3.5 w-3.5" />
              Prime Member
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1">
              <PackageCheck className="h-3.5 w-3.5" />
              {orderStatus}
            </span>
          </div>
        </div>
        <Link
          to="/profile"
          aria-label="Open profile"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border border-white/20 bg-white/15 text-lg font-black shadow-inner transition active:scale-95"
        >
          {getInitials(user?.name)}
        </Link>
      </div>
    </section>
  );
}
