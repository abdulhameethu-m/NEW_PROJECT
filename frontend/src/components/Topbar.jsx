import { useAuthStore } from "../context/authStore";
import * as authService from "../services/authService";

export function Topbar({ title, subtitle, onMenuToggle }) {
  const user = useAuthStore((s) => s.user);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const logout = useAuthStore((s) => s.logout);

  const initials = user?.name
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "A";

  async function handleLogout() {
    try {
      await authService.logout(refreshToken);
    } catch {
      // local logout is still the fallback
    } finally {
      logout();
    }
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="flex flex-col gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        {/* Left section: Menu button + Title + Subtitle */}
        <div className="flex min-w-0 items-start gap-3 flex-1">
          <button
            type="button"
            onClick={onMenuToggle}
            className="inline-flex flex-shrink-0 h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" d="M3 5h14M3 10h14M3 15h14" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold tracking-tight text-slate-950 dark:text-white sm:text-xl">{title}</h1>
            {subtitle ? (
              <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">{subtitle}</p>
            ) : null}
          </div>
        </div>

        {/* Right section: User info + Logout */}
        <div className="flex flex-shrink-0 items-center justify-between gap-2 sm:gap-3 md:ml-auto lg:ml-0">
          <div className="hidden text-right sm:block">
            <div className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white">{user?.name || "Admin"}</div>
            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{user?.role || "admin"}</div>
          </div>
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs sm:text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
            {initials}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-slate-200 px-2 sm:px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:text-sm flex-shrink-0"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
