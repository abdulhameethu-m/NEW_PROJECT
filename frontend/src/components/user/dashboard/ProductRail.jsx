import { Link } from "react-router-dom";
import { Heart, ShoppingBag } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { formatCurrency } from "../../../utils/formatCurrency";
import { resolveApiAssetUrl } from "../../../utils/resolveUrl";

export function ProductRail({ title, products = [], emptyTitle = "Nothing here yet" }) {
  return (
    <section aria-label={title} className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-black text-slate-950 dark:text-white">{title}</h2>
        <Link to="/shop" className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline dark:text-indigo-400">
          Shop all
        </Link>
      </div>

      {products.length ? (
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
          {products.map((product) => {
            const image = resolveApiAssetUrl(product.image || product.images?.[0]?.url);
            return (
              <Link
                key={product._id || product.id || product.slug}
                to={product._id ? `/product/${product._id}` : "/shop"}
                className="w-32 shrink-0 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm transition active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="relative aspect-square overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                  {image ? <img loading="lazy" decoding="async" src={image} alt={product.name || "Product"} className="h-full w-full object-cover" /> : null}
                  <span className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-rose-600 shadow-sm">
                    <Heart className="h-3.5 w-3.5" />
                  </span>
                </div>
                <p className="mt-2 line-clamp-1 text-xs font-bold text-slate-800 dark:text-slate-100">{product.name || "Recommended item"}</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-slate-950 dark:text-white">
                    {formatCurrency(product.discountPrice || product.price || 0)}
                  </span>
                  <ShoppingBag className="h-4 w-4 text-slate-500" />
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState title={emptyTitle} actionLabel="Explore products" actionTo="/shop" icon={ShoppingBag} />
      )}
    </section>
  );
}
