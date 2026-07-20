import { ChevronLeft, Heart, Search, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function MobileShopHeader({ title = "Shop", onSearchOpen, onWishlistOpen, onCartOpen, cartCount = 0 }) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/98 px-3 py-2 backdrop-blur-sm shadow-sm dark:border-slate-800 dark:bg-slate-950/95">
      <div className="flex h-14 items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="min-w-0 flex-1 px-1">
          <h1 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">Fast mobile shopping, refined for quick browsing</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSearchOpen}
            aria-label="Open search"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <Search size={18} />
          </button>
          <button
            type="button"
            onClick={onWishlistOpen}
            aria-label="View wishlist"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <Heart size={18} />
          </button>
          <button
            type="button"
            onClick={onCartOpen}
            aria-label="View cart"
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <ShoppingCart size={18} />
            {cartCount > 0 ? (
              <span className="absolute -right-0.5 top-1/2 -translate-y-1/2 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                {cartCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>
    </header>
  );
}
