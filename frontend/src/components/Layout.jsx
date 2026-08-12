import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Heart,
  MapPin,
  MoonStar,
  ShoppingCart,
  SunMedium,
  UserRound,
  Menu,
  X,
  ChevronRight,
  Home,
  Search,
} from "lucide-react";
import { useAuthStore } from "../context/authStore";
import { CartDrawerProvider } from "../context/CartDrawerContext";
import { UserMenu } from "./UserMenu";
import { Footer } from "./Footer";
import { SearchBar } from "./SearchBar";
import { LocationSelector } from "./LocationSelector";
import { CategoryNavigation } from "./CategoryNavigation";
import { CartDrawer } from "./CartDrawer";
import { CartDrawerOverlay } from "./CartDrawerOverlay";
import { useDarkMode } from "../hooks/useDarkMode";
import { useCategories } from "../hooks/useCategories";
import { usePresentedCategories } from "../utils/categoryPresentation";
import { PlatformFeaturesProvider } from "../context/PlatformFeaturesContext";
import * as cartService from "../services/cartService";
import * as wishlistService from "../services/wishlistService";
import useGuestCartStore from "../context/guestCartStore";
import useGuestWishlistStore from "../context/guestWishlistStore";
import { normalizeCartPayload } from "../utils/cartState";
import { useBranding } from "../context/BrandingContext";
import { BrandLogo } from "./BrandLogo";

const VENDOR_WORKSPACE_SEGMENTS = new Set([
  "analytics",
  "dashboard",
  "delivery",
  "earnings",
  "finance",
  "influencer-commerce",
  "inventory",
  "offers",
  "onboarding",
  "orders",
  "payouts",
  "pickups",
  "products",
  "returns",
  "reviews",
  "settings",
  "status",
  "support",
  "catalog-requests",
]);
const INFLUENCER_WORKSPACE_SEGMENTS = new Set([
  "affiliate-links",
  "affiliate-products",
  "analytics",
  "campaigns",
  "collections",
  "content",
  "dashboard",
  "earnings-withdrawals",
  "reels",
  "settings",
  "welcome",
]);

function isVendorWorkspacePath(pathname) {
  if (pathname === "/vendor") return true;
  if (!pathname.startsWith("/vendor/")) return false;
  const segment = pathname.split("/").filter(Boolean)[1];
  return VENDOR_WORKSPACE_SEGMENTS.has(segment);
}

function isInfluencerWorkspacePath(pathname) {
  if (pathname === "/influencer") return true;
  if (!pathname.startsWith("/influencer/")) return false;
  const segment = pathname.split("/").filter(Boolean)[1];
  return INFLUENCER_WORKSPACE_SEGMENTS.has(segment);
}

export function Layout() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const guestCartCount = useGuestCartStore((s) => s.getItemCount());
  const guestWishlistCount = useGuestWishlistStore((s) => s.getItemCount());
  const [isDarkMode, setIsDarkMode] = useDarkMode();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isMobileHeaderMinimized, setIsMobileHeaderMinimized] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 1024;
  });
  const location = useLocation();
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const { categories } = useCategories();
  const presentedCategories = usePresentedCategories(categories);
  const { branding } = useBranding();
  const isAdminRoute =
    location.pathname === "/dashboard/admin" ||
    location.pathname.startsWith("/admin");
  const isVendorWorkspace = isVendorWorkspacePath(location.pathname);
  const isStaffWorkspace = location.pathname.startsWith("/staff/");
  const isInfluencerWorkspace = isInfluencerWorkspacePath(location.pathname);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 1024;
    }
    return false;
  });
  const hideShopChrome = isAdminRoute || isVendorWorkspace || isStaffWorkspace || isInfluencerWorkspace;
  const isPublicInfluencerPage =
    location.pathname.startsWith("/influencers") ||
    location.pathname.startsWith("/reels") ||
    (location.pathname.startsWith("/influencer/") && !isInfluencerWorkspace);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    setIsMobileHeaderMinimized(isMobile);
  }, [isMobile]);
  const showShopActions = !user || user?.role === "user";
  const wishlistHref = user?.role === "user" ? "/dashboard/user/wishlist" : "/wishlist";


  const navItems = [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop" },
    // { label: "Compare", href: "/compare" },
    { label: "Stores", href: "/stores" },
    { label: "Influencers", href: "/influencers" },
    { label: "Track order", href: user?.role === "user" ? "/orders" : user ? "/dashboard" : "/login" },
  ];

  useEffect(() => {
    let cancelled = false;

    async function loadCartCount() {
      if (!showShopActions) {
        setCartCount(0);
        return;
      }

      if (!isAuthenticated) {
        setCartCount(guestCartCount);
        return;
      }

      try {
        const response = await cartService.getCart();
        const normalized = normalizeCartPayload(response);
        const nextCount = normalized.itemCount;
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
      setCartCount(normalizeCartPayload(event?.detail).itemCount);
    }

    window.addEventListener("cart:changed", handleCartChanged);
    return () => {
      cancelled = true;
      window.removeEventListener("cart:changed", handleCartChanged);
    };
  }, [guestCartCount, isAuthenticated, showShopActions]);

  useEffect(() => {
    let cancelled = false;

    async function loadWishlistCount() {
      if (!showShopActions) {
        setWishlistCount(0);
        return;
      }

      if (!isAuthenticated) {
        setWishlistCount(guestWishlistCount);
        return;
      }

      try {
        const response = await wishlistService.getWishlist();
        const items = Array.isArray(response?.data) ? response.data : [];
        if (!cancelled) {
          setWishlistCount(items.length);
        }
      } catch {
        if (!cancelled) {
          setWishlistCount(0);
        }
      }
    }

    loadWishlistCount();

    function handleWishlistChanged(event) {
      const items = Array.isArray(event?.detail?.items) ? event.detail.items : [];
      setWishlistCount(items.length);
    }

    window.addEventListener("wishlist:changed", handleWishlistChanged);
    return () => {
      cancelled = true;
      window.removeEventListener("wishlist:changed", handleWishlistChanged);
    };
  }, [guestWishlistCount, isAuthenticated, showShopActions]);

  return (
    <CartDrawerProvider>
      <div className="flex min-h-screen flex-col bg-white text-slate-900 transition-colors dark:bg-slate-950 dark:text-white">
      {!hideShopChrome ? (
        <>
          {/* Desktop Header */}
          <header className="hidden lg:block sticky top-0 z-30 border-b border-white/50 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/60">
            <div className="w-full px-3 py-1.5 sm:px-4 lg:px-5">
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-3 lg:flex-nowrap">
                  <Link
                    to="/"
                    className="inline-flex min-w-fit flex-shrink-0 items-center transition-opacity hover:opacity-80 mr-2"
                  >
                    <BrandLogo
                      showName={false}
                      className="text-slate-950 dark:text-white"
                      imgClassName="h-6 w-auto max-w-[120px] object-contain"
                    />
                  </Link>

                  <div className="order-3 w-full lg:order-none lg:flex-1">
                    <div className="group mx-auto w-full max-w-5xl transition-all duration-300 focus-within:max-w-6xl">
                      <SearchBar className="[&_input]:py-2 [&_input]:shadow-none" />
                    </div>
                  </div>

                  <nav className="hidden items-center gap-1 rounded-full border border-white/60 bg-white/70 p-1 backdrop-blur dark:border-white/10 dark:bg-slate-900/65 lg:flex">
                    {navItems.map((item) => {
                      const isActive =
                        location.pathname === item.href ||
                        (item.href !== "/" && location.pathname.startsWith(item.href));

                      return (
                        <Link
                          key={item.href}
                          to={item.href}
                          className={`group relative rounded-full px-3 py-1 text-sm font-medium transition ${
                            isActive
                              ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                              : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
                          }`}
                        >
                          {item.label}
                          {!isActive ? (
                            <span className="absolute inset-x-4 bottom-1 h-px origin-left scale-x-0 bg-current transition duration-300 group-hover:scale-x-100" />
                          ) : null}
                        </Link>
                      );
                    })}
                  </nav>

                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsDarkMode(!isDarkMode)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/75 text-slate-600 shadow-[0_10px_40px_-28px_rgba(15,23,42,0.55)] backdrop-blur transition hover:text-slate-950 active:scale-95 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:text-white"
                      aria-label={isDarkMode ? "Enable light mode" : "Enable dark mode"}
                    >
                      {isDarkMode ? <SunMedium className="h-4.5 w-4.5" /> : <MoonStar className="h-4.5 w-4.5" />}
                    </button>

                    <div className="hidden shrink-0 xl:block xl:w-[260px]">
                      <div className="h-9 overflow-hidden rounded-full border border-white/60 bg-white/75 shadow-[0_10px_40px_-28px_rgba(15,23,42,0.55)] backdrop-blur dark:border-white/10 dark:bg-slate-900/70">
                        <LocationSelector />
                      </div>
                    </div>

                    {user ? (
                      <>
                        {showShopActions ? (
                          <>
                            <HeaderIconLink to={wishlistHref} label="Wishlist" badge={wishlistCount}>
                              <Heart className="h-4.5 w-4.5" />
                            </HeaderIconLink>
                            <HeaderIconLink to="/cart" label="Cart" badge={cartCount}>
                              <ShoppingCart className="h-4.5 w-4.5" />
                            </HeaderIconLink>
                          </>
                        ) : null}
                        <UserMenu />
                      </>
                    ) : (
                      <>
                        <HeaderIconLink to={wishlistHref} label="Wishlist" badge={wishlistCount}>
                          <Heart className="h-4.5 w-4.5" />
                        </HeaderIconLink>
                        <HeaderIconLink to="/cart" label="Cart" badge={cartCount}>
                          <ShoppingCart className="h-4.5 w-4.5" />
                        </HeaderIconLink>
                        <Link
                          className="hidden rounded-full px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-white/60 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900/70 dark:hover:text-white sm:inline-flex"
                          to="/login"
                        >
                          Login
                        </Link>
                        <Link
                          className="inline-flex rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_40px_-20px_rgba(129,140,248,0.9)] transition hover:shadow-[0_24px_60px_-20px_rgba(129,140,248,0.95)] active:scale-95"
                          to="/role"
                          style={{ backgroundImage: `linear-gradient(90deg, ${branding?.brandColors?.primaryColor || "#6366f1"}, ${branding?.brandColors?.accentColor || "#ec4899"})` }}
                        >
                          Start
                        </Link>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 xl:hidden">
                  <div className="min-w-0 flex-1 rounded-full border border-white/60 bg-white/75 p-1 shadow-[0_10px_40px_-28px_rgba(15,23,42,0.55)] backdrop-blur dark:border-white/10 dark:bg-slate-900/70">
                    <LocationSelector />
                  </div>
                  {user ? (
                    <Link
                      to={showShopActions ? wishlistHref : "/profile"}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-white/75 text-slate-600 shadow-[0_10px_40px_-28px_rgba(15,23,42,0.55)] backdrop-blur transition hover:text-slate-950 active:scale-95 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:text-white"
                      aria-label={showShopActions ? "Saved items" : "Profile"}
                    >
                      {showShopActions ? <Heart className="h-4.5 w-4.5" /> : <UserRound className="h-4.5 w-4.5" />}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Link
                        to={wishlistHref}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-white/75 text-slate-600 shadow-[0_10px_40px_-28px_rgba(15,23,42,0.55)] backdrop-blur transition hover:text-slate-950 active:scale-95 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:text-white"
                        aria-label="Wishlist"
                      >
                        <Heart className="h-4.5 w-4.5" />
                      </Link>
                      <Link
                        to="/cart"
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-white/75 text-slate-600 shadow-[0_10px_40px_-28px_rgba(15,23,42,0.55)] backdrop-blur transition hover:text-slate-950 active:scale-95 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:text-white"
                        aria-label="Cart"
                      >
                        <ShoppingCart className="h-4.5 w-4.5" />
                      </Link>
                      <Link
                        to="/login"
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-white/75 text-slate-600 shadow-[0_10px_40px_-28px_rgba(15,23,42,0.55)] backdrop-blur transition hover:text-slate-950 active:scale-95 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:text-white"
                        aria-label="Login"
                      >
                        <MapPin className="h-4.5 w-4.5" />
                      </Link>
                    </div>
                  )}
                </div>

                <nav className="flex gap-2 overflow-x-auto rounded-full border border-white/60 bg-white/70 p-1 backdrop-blur dark:border-white/10 dark:bg-slate-900/65 lg:hidden">
                  {navItems.map((item) => {
                    const isActive =
                      location.pathname === item.href ||
                      (item.href !== "/" && location.pathname.startsWith(item.href));
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                          isActive
                            ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                            : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </div>
          </header>

          {/* Mobile Sticky Header */}
          {!isPublicInfluencerPage && (
            <header className="block lg:hidden sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/95">
              <div className="px-3 py-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsMenuOpen(true)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition active:scale-95"
                    aria-label="Open navigation menu"
                  >
                    <Menu className="h-5.5 w-5.5" />
                  </button>
                  <Link to="/" className="inline-flex items-center">
                    <BrandLogo
                      showName={false}
                      className="text-slate-950 dark:text-white"
                      imgClassName="h-7 w-auto max-w-[100px] object-contain"
                    />
                  </Link>
                </div>

                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition active:scale-95"
                    aria-label={isDarkMode ? "Enable light mode" : "Enable dark mode"}
                  >
                    {isDarkMode ? <SunMedium className="h-4.5 w-4.5" /> : <MoonStar className="h-4.5 w-4.5" />}
                  </button>
                  {showShopActions && (
                    <>
                      <HeaderIconLinkMobile to={wishlistHref} label="Wishlist" badge={wishlistCount}>
                        <Heart className="h-4.5 w-4.5" />
                      </HeaderIconLinkMobile>
                      <HeaderIconLinkMobile to="/cart" label="Cart" badge={cartCount}>
                        <ShoppingCart className="h-4.5 w-4.5" />
                      </HeaderIconLinkMobile>
                    </>
                  )}
                  {user ? (
                    <UserMenu />
                  ) : (
                    <Link
                      to="/login"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                      aria-label="Login"
                    >
                      <UserRound className="h-4.5 w-4.5" />
                    </Link>
                  )}
                </div>
              </div>
              
              {/* Mobile Full-width Search Bar */}
              <div className={`overflow-hidden transition-all duration-300 ${isMobileHeaderMinimized ? 'max-h-0 opacity-0' : 'max-h-20 opacity-100'}`}>
                <div className="px-3 pb-2 pt-0.5 border-b border-slate-100 dark:border-white/5">
                  <SearchBar className="!max-w-none h-10" />
                </div>
              </div>

              {/* Mobile Compact Delivery Location Row */}
              <div className={`overflow-hidden transition-all duration-300 ${isMobileHeaderMinimized ? 'max-h-0 opacity-0' : 'max-h-20 opacity-100 bg-slate-50/50 dark:bg-slate-900/30'}`}>
                <LocationSelector variant="compact" />
              </div>
            </header>
          )}

          {/* Mobile Sliding Drawer Navigation */}
          {isMenuOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300"
                onClick={() => setIsMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="fixed inset-y-0 left-0 w-72 max-w-[80vw] bg-white dark:bg-slate-900 shadow-2xl p-5 flex flex-col justify-between z-10 transform transition-transform duration-300">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <Link to="/" onClick={() => setIsMenuOpen(false)}>
                      <BrandLogo
                        showName={false}
                        className="text-slate-950 dark:text-white"
                        imgClassName="h-7 w-auto max-w-[120px] object-contain"
                      />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setIsMenuOpen(false)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      aria-label="Close menu"
                    >
                      <X className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                    </button>
                  </div>

                  <nav className="flex flex-col gap-2 mt-4">
                    {navItems.map((item) => {
                      const isActive =
                        location.pathname === item.href ||
                        (item.href !== "/" && location.pathname.startsWith(item.href));

                      return (
                        <Link
                          key={item.href}
                          to={item.href}
                          onClick={() => setIsMenuOpen(false)}
                          className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition ${
                            isActive
                              ? "bg-slate-100 text-slate-950 dark:bg-slate-800 dark:text-white"
                              : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50"
                          }`}
                        >
                          <span>{item.label}</span>
                          <ChevronRight className="h-4 w-4 opacity-50" />
                        </Link>
                      );
                    })}
                  </nav>
                </div>

                <div className="border-t border-slate-100 pt-4 dark:border-white/5 flex flex-col gap-3">
                  {user ? (
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-500 truncate">Logged in as</p>
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.username || user.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          setIsMenuOpen(false);
                          const logoutFn = useAuthStore.getState().logout || (() => {});
                          await logoutFn();
                          navigate("/login");
                        }}
                        className="rounded-full bg-rose-50 dark:bg-rose-950/20 px-3.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition"
                      >
                        Logout
                      </button>
                    </div>
                  ) : (
                    <Link
                      to="/login"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex w-full items-center justify-center rounded-full bg-slate-950 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
                    >
                      Login / Register
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      ) : null}

      {!hideShopChrome && !(isMobile && isPublicInfluencerPage) ? (
        <CategoryNavigation 
          categories={presentedCategories}
          isMinimized={isMobileHeaderMinimized}
          onToggleMinimize={() => setIsMobileHeaderMinimized(!isMobileHeaderMinimized)}
          onSelect={(item) => {
            setSelectedCategory(item);
            // Check if it's a subcategory or category based on presence of categoryId property
            if (item.categoryId) {
              // It's a subcategory
              navigate(`/shop?categoryId=${item.categoryId}&subCategoryId=${item._id || item.id}`);
            } else {
              // It's a category
              navigate(`/shop?categoryId=${item._id || item.id}`);
            }
          }}
          selectedCategory={selectedCategory}
        />
      ) : null}

      <main
        className={
          hideShopChrome
            ? "flex-1"
            : "w-full flex-1"
        }
      >
        <PlatformFeaturesProvider>
          <Outlet />
        </PlatformFeaturesProvider>
      </main>

      {!hideShopChrome ? (
        <>
          <div className={isPublicInfluencerPage ? "hidden lg:block" : ""}>
            <Footer />
          </div>
          {!isPublicInfluencerPage && (
            <MobileBottomNavigation
              cartCount={cartCount}
              wishlistCount={wishlistCount}
              user={user}
              location={location}
            />
          )}
        </>
      ) : null}

      {/* Cart Drawer System */}
      <CartDrawerOverlay />
      <CartDrawer />
    </div>
    </CartDrawerProvider>
  );
}

function HeaderIconLink({ to, label, badge, children }) {
  return (
    <Link
      to={to}
      aria-label={label}
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-white/75 text-slate-600 shadow-[0_10px_40px_-28px_rgba(15,23,42,0.55)] backdrop-blur transition hover:-translate-y-0.5 hover:text-slate-950 active:scale-95 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:text-white"
    >
      {children}
      {badge ? (
        <span className="absolute -right-0.5 -top-0.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-pink-500 px-1 text-[10px] font-semibold text-white">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

function HeaderIconLinkMobile({ to, label, badge, children }) {
  return (
    <Link
      to={to}
      aria-label={label}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition active:scale-95"
    >
      {children}
      {badge ? (
        <span className="absolute -right-0.5 -top-0.5 inline-flex min-h-4.5 min-w-4.5 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-pink-500 px-1 text-[9px] font-bold text-white shadow-sm">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

function MobileBottomNavigation({ cartCount, wishlistCount, user, location }) {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/95 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2.5 px-4 shadow-[0_-8px_30px_rgb(0,0,0,0.06)] backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-lg items-center justify-between">
        <Link
          to="/"
          className={`relative flex flex-col items-center gap-1 text-[11px] font-semibold transition duration-200 ${
            location.pathname === "/"
              ? "text-indigo-600 dark:text-indigo-400 font-bold"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <Home className="h-5 w-5 transition-transform duration-200 active:scale-95" />
          <span className="leading-none">Home</span>
        </Link>

        <Link
          to="/shop"
          className={`relative flex flex-col items-center gap-1 text-[11px] font-semibold transition duration-200 ${
            location.pathname.startsWith("/shop")
              ? "text-indigo-600 dark:text-indigo-400 font-bold"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <Search className="h-5 w-5 transition-transform duration-200 active:scale-95" />
          <span className="leading-none">Shop</span>
        </Link>

        <Link
          to={user?.role === "user" ? "/dashboard/user/wishlist" : "/wishlist"}
          className={`relative flex flex-col items-center gap-1 text-[11px] font-semibold transition duration-200 ${
            location.pathname === "/wishlist" || location.pathname === "/dashboard/user/wishlist"
              ? "text-indigo-600 dark:text-indigo-400 font-bold"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <div className="relative p-0.5">
            <Heart className="h-5 w-5 transition-transform duration-200 active:scale-95" />
            {wishlistCount ? (
              <span className="absolute -right-1 -top-1 inline-flex min-h-4.5 min-w-4.5 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-pink-500 px-1 text-[9px] font-bold text-white shadow-sm animate-pulse">
                {wishlistCount}
              </span>
            ) : null}
          </div>
          <span className="leading-none">Wishlist</span>
        </Link>

        <Link
          to="/cart"
          className={`relative flex flex-col items-center gap-1 text-[11px] font-semibold transition duration-200 ${
            location.pathname === "/cart"
              ? "text-indigo-600 dark:text-indigo-400 font-bold"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <div className="relative p-0.5">
            <ShoppingCart className="h-5 w-5 transition-transform duration-200 active:scale-95" />
            {cartCount ? (
              <span className="absolute -right-1 -top-1 inline-flex min-h-4.5 min-w-4.5 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-pink-500 px-1 text-[9px] font-bold text-white shadow-sm">
                {cartCount}
              </span>
            ) : null}
          </div>
          <span className="leading-none">Cart</span>
        </Link>

        <Link
          to={user?.role === "user" ? "/profile" : user ? "/dashboard" : "/login"}
          className={`relative flex flex-col items-center gap-1 text-[11px] font-semibold transition duration-200 ${
            location.pathname === "/profile" ||
            location.pathname === "/dashboard/user" ||
            location.pathname === "/user/dashboard"
              ? "text-indigo-600 dark:text-indigo-400 font-bold"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <UserRound className="h-5 w-5 transition-transform duration-200 active:scale-95" />
          <span className="leading-none">Account</span>
        </Link>
      </div>
    </nav>
  );
}
