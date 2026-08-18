import { Link } from "react-router-dom";
import { BadgeCheck, PackageCheck } from "lucide-react";
import { getInitials } from "./dashboardUtils";

export function DashboardGreeting({ user, recentOrder }) {
  const firstName = String(user?.name || "there").split(" ")[0];
  const orderStatus = recentOrder?.status || "Ready to shop";

  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-[#f5f3ff] px-6 py-6 shadow-sm dark:bg-slate-900 sm:px-8 sm:py-8">
      {/* Decorative fluid background shapes */}
      <div className="absolute inset-0 opacity-60 dark:opacity-20 pointer-events-none">
        <div className="absolute -right-[10%] top-[-20%] h-[150%] w-[70%] -rotate-12 rounded-[100%] bg-gradient-to-l from-indigo-200/60 to-purple-100/10 blur-[80px]" />
        <div className="absolute left-[30%] top-[40%] h-[100%] w-[50%] rotate-45 rounded-[100%] bg-gradient-to-r from-purple-200/50 to-indigo-100/10 blur-[60px]" />
      </div>

      {/* Sparkles */}
      <span className="absolute left-10 top-12 text-sm text-indigo-400/40 pointer-events-none">✦</span>
      <span className="absolute right-[45%] top-10 text-xl text-indigo-300/50 pointer-events-none">✦</span>
      <span className="absolute bottom-8 right-[25%] text-lg text-indigo-300/40 pointer-events-none">✦</span>
      
      <div className="relative flex min-h-[100px] items-center justify-between gap-4 z-10">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[11px] font-bold text-indigo-600 shadow-[0_2px_10px_rgba(0,0,0,0.04)] dark:bg-slate-800 dark:text-indigo-400">
            Welcome back 👋
          </div>
          <h1 className="mt-4 truncate text-3xl font-black leading-tight text-slate-900 dark:text-white sm:text-[2.5rem]">{firstName}</h1>
          <div className="mt-4 flex flex-wrap gap-2.5 text-[11px] font-bold">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-slate-700 shadow-[0_2px_10px_rgba(0,0,0,0.04)] dark:bg-slate-800 dark:text-slate-300">
              <BadgeCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              Prime Member
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-slate-700 shadow-[0_2px_10px_rgba(0,0,0,0.04)] dark:bg-slate-800 dark:text-slate-300">
              <PackageCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              {orderStatus}
            </span>
          </div>
        </div>
        <Link
          to="/profile"
          aria-label="Open profile"
          className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-full border-4 border-white bg-indigo-600 text-xl font-black text-white shadow-[0_8px_20px_rgba(79,70,229,0.25)] transition hover:bg-indigo-700 active:scale-95 dark:border-slate-800 sm:h-[5.5rem] sm:w-[5.5rem] sm:text-[28px]"
        >
          {getInitials(user?.name)}
        </Link>
      </div>
    </section>
  );
}
