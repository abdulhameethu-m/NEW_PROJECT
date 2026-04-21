import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../context/authStore";
import { UserMenu } from "./UserMenu";
import { Footer } from "./Footer";
import { SearchBar } from "./SearchBar";
import { LocationSelector } from "./LocationSelector";
import { useDarkMode } from "../hooks/useDarkMode";
import * as cartService from "../services/cartService";

export function Layout() {
  const user = useAuthStore((s) => s.user);
  const [isDarkMode] = useDarkMode();
  const location = useLocation();
  const [cartCount, setCartCount] = useState(0);
  const isAdminRoute =
    location.pathname === "/dashboard/admin" ||
    location.pathname.startsWith("/admin");
  const isVendorWorkspace = location.pathname.startsWith("/vendor/");
  const isStaffWorkspace = location.pathname.startsWith("/staff/");
  const showShopActions = user?.role === "user";

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  useEffect(() => {
    let cancelled = false;

    async function loadCartCount() {
      if (!showShopActions) {
        setCartCount(0);
        return;
      }

      try {
        const response = await cartService.getCart();
        const items = Array.isArray(response?.data?.items) ? response.data.items : [];
        const nextCount = items.reduce((sum, item) => sum + Number(item?.quantity || 0), 0);
        if (!cancelled) {
          setCartCount(nextCount);
        }
      } catch {
        if (!cancelled) {
          setCartCount(0);
        }
      }
    }

    loadCartCount();

    function handleCartChanged(event) {
      const items = Array.isArray(event?.detail?.items) ? event.detail.items : [];
      const nextCount = items.reduce((sum, item) => sum + Number(item?.quantity || 0), 0);
      setCartCount(nextCount);
    }

    window.addEventListener("cart:changed", handleCartChanged);
    return () => {
      cancelled = true;
      window.removeEventListener("cart:changed", handleCartChanged);
    };
  }, [location.pathname, showShopActions]);

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900 transition-colors dark:bg-slate-950 dark:text-white">
      {!isAdminRoute && !isVendorWorkspace && !isStaffWorkspace ? (
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
          <div className="mx-auto w-full max-w-7xl px-3 py-2 sm:px-4 sm:py-3">
            {/* Mobile Header: Logo + User Menu */}
            <div className="flex flex-col gap-3 md:gap-4">
              <div className="flex items-center justify-between gap-2">
                <Link to="/" className="block truncate text-base font-bold tracking-tight text-slate-950 dark:text-white sm:text-lg flex-shrink-0">
                  UChooseMe
                </Link>

                <div className="flex flex-shrink-0 items-center gap-2 ml-auto">
                  {showShopActions ? (
                    <>
                      <Link
                        to="/shop"
                        className="inline-flex rounded-lg border border-slate-200 px-2 py-2 sm:px-3 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Shop
                      </Link>
                      <Link
                        to="/cart"
                        className="relative inline-flex items-center rounded-lg border border-slate-200 px-2 py-2 sm:px-3 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        aria-label={`Cart with ${cartCount} items`}
                      >
                        <span>Cart</span>
                        <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[color:var(--commerce-accent)] px-1.5 text-[10px] font-semibold text-white">
                          {cartCount}
                        </span>
                      </Link>
                    </>
                  ) : null}
                  {user ? (
                    <UserMenu />
                  ) : (
                    <>
                      <Link
                        className="hidden text-xs sm:text-sm text-slate-700 hover:underline dark:text-slate-200 sm:inline"
                        to="/login"
                      >
                        Login
                      </Link>
                      <Link
                        className="inline-flex rounded-lg bg-blue-600 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-white hover:bg-blue-700"
                        to="/role"
                      >
                        Start
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {/* Search Bar - Full width on mobile */}
              <div className="w-full">
                <SearchBar />
              </div>

              {/* Location Selector - Full width on mobile, constrained on desktop */}
              <div className="w-full md:max-w-xs lg:max-w-sm">
                <LocationSelector />
              </div>
            </div>
          </div>
        </header>
      ) : null}

      <main className={isAdminRoute || isVendorWorkspace || isStaffWorkspace ? "flex-1" : "mx-auto w-full max-w-6xl flex-1 px-3 py-4 sm:px-4 sm:py-6 lg:py-8"}>
        <Outlet />
      </main>

      {!isAdminRoute && !isVendorWorkspace && !isStaffWorkspace ? <Footer /> : null}
    </div>
  );
}
