/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronRight,
  Heart,
  HelpCircle,
  Home,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Package,
  Settings,
  ShieldCheck,
  Star,
  TicketPercent,
  UserRound,
  X,
} from "lucide-react";
import { useAuthStore } from "../context/authStore";
import * as authService from "../services/authService";
import { resolveApiAssetUrl } from "../utils/resolveUrl";
import { getInitials } from "./user/dashboard/dashboardUtils";

const drawerSections = [
  {
    title: "Account",
    items: [
      { label: "Dashboard", path: "/dashboard/user", icon: Home },
      { label: "Profile", path: "/profile", icon: UserRound },
      { label: "Orders", path: "/orders", icon: Package },
      { label: "Addresses", path: "/addresses", icon: MapPin },
      { label: "Wishlist", path: "/dashboard/user/wishlist", icon: Heart },
      { label: "Reviews", path: "/reviews", icon: Star },
    ],
  },
  {
    title: "Shopping",
    items: [
      { label: "Coupons", path: "/shop", icon: TicketPercent },
      { label: "Support", path: "/support", icon: MessageCircle },
    ],
  },
  {
    title: "Help",
    items: [
      { label: "FAQ", path: "/support", icon: HelpCircle },
      { label: "Contact", path: "/support", icon: MessageCircle },
      { label: "Privacy Policy", path: "/privacy-policy", icon: ShieldCheck },
      { label: "Terms", path: "/terms-and-conditions", icon: ShieldCheck },
    ],
  },
  {
    title: "Account",
    items: [{ label: "Settings", path: "/settings", icon: Settings }],
  },
];

function isActivePath(pathname, path) {
  if (path === "/dashboard/user") return pathname === path || pathname === "/user/dashboard";
  return pathname === path || (path !== "/" && pathname.startsWith(path));
}

function Avatar({ user, className = "h-10 w-10 rounded-2xl", textClassName = "text-sm" }) {
  const avatarUrl = resolveApiAssetUrl(user?.avatarUrl);

  if (avatarUrl) {
    return <img src={avatarUrl} alt={user?.name || "User"} className={`${className} object-cover`} />;
  }

  return (
    <div className={`flex shrink-0 items-center justify-center bg-slate-950 font-black text-white dark:bg-white dark:text-slate-950 ${className} ${textClassName}`}>
      {getInitials(user?.name)}
    </div>
  );
}

function DrawerMenuItem({ item, active, onNavigate }) {
  return (
    <Link
      to={item.path}
      onClick={onNavigate}
      className={`group flex min-h-9 items-center gap-2 rounded-xl px-2.5 text-xs font-semibold transition active:scale-[0.99] ${
        active
          ? "bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950"
          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
          active ? "bg-white/15" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        }`}
      >
        <item.icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      <ChevronRight className="h-4 w-4 opacity-40" />
    </Link>
  );
}

function AccountDrawer({ open, user, pathname, onClose, onLogout }) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm transition-opacity duration-200 lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[74vw] max-w-[280px] flex-col overflow-hidden rounded-r-3xl border-r border-white/60 bg-white/95 shadow-2xl backdrop-blur-xl transition-transform duration-300 dark:border-white/10 dark:bg-slate-950/95 lg:sticky lg:top-24 lg:z-0 lg:h-[calc(100vh-7rem)] lg:w-full lg:max-w-none lg:translate-x-0 lg:rounded-3xl lg:border lg:border-slate-200 lg:bg-white lg:shadow-sm lg:dark:border-slate-800 lg:dark:bg-slate-900 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Account navigation"
      >
        <div className="border-b border-slate-100 p-3 dark:border-slate-800">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar user={user} className="h-9 w-9 rounded-xl" textClassName="text-xs" />
              <div className="min-w-0">
                <p className="truncate text-xs font-black text-slate-950 dark:text-white">{user?.name || "Customer"}</p>
                <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">{user?.email || user?.phone}</p>
                <span className="mt-0.5 inline-flex rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-black text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                  Prime Member
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <Link
            to="/profile"
            onClick={onClose}
            className="mt-2 inline-flex min-h-8 w-full items-center justify-center rounded-xl border border-slate-200 text-xs font-bold text-slate-700 transition hover:bg-slate-50 active:scale-[0.99] dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Quick edit profile
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-2.5">
          {drawerSections.map((section, sectionIndex) => (
            <div key={`${section.title}-${sectionIndex}`} className="mb-3">
              <p className="mb-1.5 px-2 text-[9px] font-black uppercase text-slate-400">{section.title}</p>
              <div className="grid gap-0.5">
                {section.items.map((item) => (
                  <DrawerMenuItem
                    key={`${section.title}-${item.label}`}
                    item={item}
                    active={isActivePath(pathname, item.path)}
                    onNavigate={onClose}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-2.5 dark:border-slate-800">
          <button
            type="button"
            onClick={onLogout}
            className="flex min-h-9 w-full items-center justify-center gap-2 rounded-xl bg-rose-50 text-xs font-black text-rose-700 transition hover:bg-rose-100 active:scale-[0.99] dark:bg-rose-950/20 dark:text-rose-300"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

export function UserAccountLayout() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  async function handleLogout() {
    try {
      await authService.logout();
    } catch {
      // Local logout remains the fallback when the server session is already gone.
    } finally {
      logout();
      setDrawerOpen(false);
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/70 pb-[calc(4.75rem+env(safe-area-inset-bottom))] text-slate-900 dark:bg-slate-950 dark:text-white lg:pb-8">
      <div className="mx-auto grid w-full max-w-7xl gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-6 lg:px-8">
        <AccountDrawer
          open={drawerOpen}
          user={user}
          pathname={location.pathname}
          onClose={() => setDrawerOpen(false)}
          onLogout={handleLogout}
        />
        <main className="min-w-0">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="mb-3 inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 lg:hidden"
            aria-label="Open account menu"
          >
            <Menu className="h-4 w-4" />
            Account menu
          </button>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
