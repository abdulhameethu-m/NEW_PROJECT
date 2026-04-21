import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BannerCarousel } from "../components/BannerCarousel";
import { CategoryCarousel } from "../components/CategoryCarousel";
import { useCategories } from "../hooks/useCategories";
import * as productService from "../services/productService";
import { formatCurrency } from "../utils/formatCurrency";
import { usePresentedCategories } from "../utils/categoryPresentation.jsx";

export function HomePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [popularPicks, setPopularPicks] = useState([]);
  const [trending, setTrending] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const { categories, loading: categoriesLoading } = useCategories();
  const presentedCategories = usePresentedCategories(categories);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [popularRes, trendingRes, recommendedRes] = await Promise.all([
          productService.getPublicProducts({ limit: 8, sortBy: "analytics.views", sortOrder: "desc" }),
          productService.getPublicProducts({ limit: 8, sortBy: "createdAt", sortOrder: "desc" }),
          productService.getPublicProducts({ limit: 8, sortBy: "ratings.averageRating", sortOrder: "desc" }),
        ]);

        if (cancelled) return;
        setPopularPicks(popularRes?.data?.products || []);
        setTrending(trendingRes?.data?.products || []);
        setRecommended(recommendedRes?.data?.products || []);
      } catch (e) {
        if (!cancelled) {
          setError(e?.response?.data?.message || "Failed to load storefront");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      <div className="-mx-3 sm:mx-0">
        <CategoryCarousel
          title="Top Categories"
          categories={presentedCategories}
          loading={categoriesLoading}
          onSelect={(cat) => navigate(`/shop?category=${encodeURIComponent(cat.name)}`)}
        />
      </div>

      <BannerCarousel />

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200 sm:px-4 sm:py-3 sm:text-sm">
          {error}
        </div>
      ) : null}

      <ProductSection
        title="Popular Picks"
        subtitle="Most viewed products right now"
        items={popularPicks}
        loading={loading}
        viewAllHref="/shop?sortBy=analytics.views&sortOrder=desc"
      />

      <ProductSection
        title="Trending"
        subtitle="Fresh arrivals and fast movers"
        items={trending}
        loading={loading}
        viewAllHref="/shop?sortBy=createdAt&sortOrder=desc"
      />

      <ProductSection
        title="Recommended"
        subtitle="Top rated picks"
        items={recommended}
        loading={loading}
        viewAllHref="/shop?sortBy=ratings.averageRating&sortOrder=desc"
      />

      <div className="grid grid-cols-1 gap-2 xs:grid-cols-2 sm:gap-3 lg:grid-cols-4 lg:gap-4">
        <TrustBadge title="Fast Delivery" detail="Quick shipping to your doorstep" icon="🚚" />
        <TrustBadge title="Secure Payment" detail="Safe and encrypted transactions" icon="🔒" />
        <TrustBadge title="Easy Returns" detail="Hassle-free return policy" icon="↩" />
        <TrustBadge title="24/7 Support" detail="Always here to help you" icon="💬" />
      </div>
    </div>
  );
}

function ProductSection({ title, subtitle, items, loading, viewAllHref }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:rounded-3xl lg:p-6 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white sm:text-lg">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300 sm:text-sm">{subtitle}</p>
        </div>
        <Link
          to={viewAllHref}
          className="inline-flex flex-shrink-0 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:text-sm"
        >
          View all
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-4">
        {loading ? (
          Array.from({ length: 8 }).map((_, index) => <ProductCardSkeleton key={index} />)
        ) : items?.length ? (
          items.map((product) => <ProductCard key={product._id} product={product} />)
        ) : (
          <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/30 dark:text-slate-300">
            No products to show yet.
          </div>
        )}
      </div>
    </section>
  );
}

function ProductCard({ product }) {
  const img = product?.images?.[0]?.url || "";
  const discountPercent = product?.discountPrice ? Math.round(((product.price - product.discountPrice) / product.price) * 100) : 0;

  return (
    <Link
      to={`/product/${product._id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-950 lg:rounded-2xl"
    >
      <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800">
        {img ? (
          <img
            src={img}
            alt={product.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.src = "https://via.placeholder.com/600x450?text=Product";
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-slate-500 dark:text-slate-400">
            No image
          </div>
        )}

        {discountPercent > 0 ? (
          <div className="absolute left-2 top-2 rounded-lg bg-rose-600 px-2 py-1 text-[10px] font-bold text-white sm:text-[11px]">
            {discountPercent}% OFF
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-2 sm:p-3">
        <div className="line-clamp-2 text-xs font-medium text-slate-900 group-hover:text-blue-700 dark:text-slate-100 dark:group-hover:text-blue-400 sm:text-sm">
          {product.name}
        </div>
        <div className="mt-0.5 line-clamp-1 text-[11px] text-slate-500 dark:text-slate-400 sm:text-xs">{product.category}</div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="min-w-0">
            {product.discountPrice ? (
              <div className="flex items-baseline gap-1 sm:gap-2">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 sm:text-sm">
                  {formatCurrency(product.discountPrice)}
                </div>
                <div className="truncate text-[10px] text-slate-500 line-through dark:text-slate-400 sm:text-xs">
                  {formatCurrency(product.price)}
                </div>
              </div>
            ) : (
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 sm:text-sm">{formatCurrency(product.price)}</div>
            )}
          </div>

          {product?.ratings?.averageRating > 0 ? (
            <div className="flex-shrink-0 whitespace-nowrap rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white sm:px-2 sm:text-[11px]">
              ★ {Number(product.ratings.averageRating).toFixed(1)}
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="aspect-[4/3] animate-pulse bg-slate-200 dark:bg-slate-800" />
      <div className="space-y-2 p-3">
        <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  );
}

function TrustBadge({ icon, title, detail }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:rounded-3xl lg:p-6 sm:p-4">
      <div className="flex items-start gap-2 sm:gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl dark:bg-slate-800 sm:h-11 sm:w-11 sm:text-2xl">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-900 dark:text-white sm:text-sm">{title}</div>
          <div className="mt-0.5 line-clamp-2 text-[11px] text-slate-600 dark:text-slate-300 sm:text-xs">{detail}</div>
        </div>
      </div>
    </div>
  );
}
