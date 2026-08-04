import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Bookmark, ChevronLeft, ChevronRight, HeartHandshake, PackageCheck, Star, Target, ThumbsUp } from "lucide-react";
import { VendorStoreHeader } from "../components/vendor-storefront/VendorStoreHeader";
import { VendorProductGrid } from "../components/vendor-storefront/VendorProductGrid";
import { DynamicHomepageRenderer } from "../components/homepage/DynamicHomepageRenderer";
import { getVendorStorefront, getVendorStoreReviews, trackVendorStoreEvent } from "../services/vendorStorefrontService";
import { resolveApiAssetUrl } from "../utils/resolveUrl";

function useStoreSeo(vendor) {
  useEffect(() => {
    if (!vendor) return;
    const previousTitle = document.title;
    document.title = vendor.seo?.metaTitle || `${vendor.vendorName} Store`;
    const description = document.querySelector('meta[name="description"]') || document.createElement("meta");
    description.setAttribute("name", "description");
    description.setAttribute("content", vendor.seo?.metaDescription || "");
    document.head.appendChild(description);
    return () => {
      document.title = previousTitle;
    };
  }, [vendor]);
}

function ProductSection({ title, products, to }) {
  if (!products?.length) return null;
  return (
    <section className="grid min-w-0 gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-950 dark:text-white sm:text-lg">{title}</h2>
        {to ? <Link to={to} className="shrink-0 text-sm font-semibold text-blue-600">View all</Link> : null}
      </div>
      <VendorProductGrid products={products} />
    </section>
  );
}

function RatingStars({ value = 0, size = "h-4 w-4" }) {
  const rounded = Math.round(Number(value || 0));
  return (
    <span className="inline-flex text-amber-400">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star key={index} className={`${size} ${index < rounded ? "fill-current" : ""}`} />
      ))}
    </span>
  );
}

function ReviewCard({ review }) {
  const product = review.productId || {};
  const imageUrl = resolveApiAssetUrl(product.images?.[0]?.url || "");

  return (
    <article className="w-[72vw] max-w-[310px] shrink-0 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:w-[320px]">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
          {review.customerId?.avatarUrl ? <img loading="lazy" decoding="async" src={resolveApiAssetUrl(review.customerId.avatarUrl)} alt="" className="h-full w-full rounded-full object-cover" /> : (review.customerId?.name || "C").slice(0, 1)}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-slate-950 dark:text-white">{review.customerId?.name || "Marketplace customer"}</div>
          <div className="text-xs font-semibold text-slate-500">{review.verifiedPurchase ? "Verified Purchase" : "Customer Review"}</div>
        </div>
      </div>

      <div className="mt-3">
        <RatingStars value={review.rating} size="h-3.5 w-3.5" />
      </div>
      <p className="mt-3 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-slate-600 dark:text-slate-300">{review.review || review.title || "Customer shared feedback about this store."}</p>

      <div className="mt-4 flex items-center gap-3 rounded-lg bg-slate-50 p-2 dark:bg-slate-900">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-slate-200 dark:bg-slate-800">
          {imageUrl ? <img loading="lazy" decoding="async" src={imageUrl} alt={product.name || ""} className="h-full w-full object-cover" /> : null}
        </div>
        <div className="min-w-0">
          <div className="line-clamp-1 text-xs font-semibold text-slate-700 dark:text-slate-200">{product.name || "Store product"}</div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>{review.createdAt ? new Date(review.createdAt).toLocaleDateString() : "Recently"}</span>
        <span className="inline-flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" /> {review.helpfulCount || 0}</span>
        <Bookmark className="h-3.5 w-3.5" />
      </div>
    </article>
  );
}

function VendorReviewsAndAbout({ vendor, reviewsData }) {
  const reviews = reviewsData?.reviews || [];
  const reviewsRef = useRef(null);
  const totalReviews = Number(reviewsData?.totalReviews ?? vendor.totalReviews ?? 0);
  const averageRating = Number(reviewsData?.averageRating ?? vendor.rating ?? 0);
  const distribution = reviewsData?.ratingDistribution || {};
  const aboutText = vendor.storeDescription || `${vendor.vendorName} is committed to delivering quality products, reliable service, and a trusted marketplace shopping experience.`;
  const storeAbout = vendor.storeAbout || {};
  const aboutHighlights = [
    { icon: PackageCheck, title: storeAbout.missionTitle, text: storeAbout.missionText },
    { icon: Target, title: storeAbout.visionTitle, text: storeAbout.visionText },
    { icon: HeartHandshake, title: storeAbout.valueTitle, text: storeAbout.valueText },
  ];

  const scrollReviews = (direction) => {
    if (!reviewsRef.current) return;
    const width = reviewsRef.current.clientWidth;
    reviewsRef.current.scrollBy({ left: direction * width, behavior: "smooth" });
  };

  return (
    <div id="about-store" className="grid min-w-0 scroll-mt-28 gap-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 max-sm:rounded-xl max-sm:p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-950 dark:text-white sm:text-lg">Customer Reviews</h2>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => scrollReviews(-1)} className="hidden h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800 sm:inline-flex">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => scrollReviews(1)} className="hidden h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800 sm:inline-flex">
              <ChevronRight className="h-4 w-4" />
            </button>
            <Link to={`/vendor/${vendor.storeSlug}/reviews`} className="shrink-0 text-sm font-semibold text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">View all</Link>
          </div>
        </div>
        <div className="relative max-w-full">
          <button type="button" onClick={() => scrollReviews(-1)} className="absolute left-2 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-slate-200 bg-white/95 p-2 text-slate-700 shadow transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/95 dark:text-slate-200 dark:hover:bg-slate-800 sm:inline-flex">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => scrollReviews(1)} className="absolute right-2 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-slate-200 bg-white/95 p-2 text-slate-700 shadow transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/95 dark:text-slate-200 dark:hover:bg-slate-800 sm:inline-flex">
            <ChevronRight className="h-4 w-4" />
          </button>
          <div
            ref={reviewsRef}
            className="-mx-3 max-w-[calc(100%+1.5rem)] snap-x snap-mandatory overflow-x-scroll overscroll-x-contain scroll-smooth px-3 pb-3 [scrollbar-width:thin] sm:mx-0 sm:max-w-full sm:px-0"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div className="flex min-w-max gap-3 pr-3 sm:gap-4 sm:pr-0">
              <div className="w-[72vw] max-w-[280px] shrink-0 snap-start rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:w-[260px] sm:p-5">
                <div className="text-4xl font-bold text-slate-950 dark:text-white">{averageRating.toFixed(1)}</div>
                <div className="mt-2"><RatingStars value={averageRating} /></div>
                <div className="mt-2 text-sm text-slate-500">Based on {totalReviews.toLocaleString()} reviews</div>
                <div className="mt-5 grid gap-2">
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const count = Number(distribution[rating] || 0);
                    const percent = totalReviews ? Math.min(100, (count / totalReviews) * 100) : 0;
                    return (
                      <div key={rating} className="grid grid-cols-[1.5rem_1fr_3rem] items-center gap-2 text-xs text-slate-500">
                        <span>{rating}</span>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                          <div className="h-full rounded-full bg-amber-400" style={{ width: `${percent}%` }} />
                        </div>
                        <span className="text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {reviews.length ? reviews.map((review) => (
                <div key={review._id} className="shrink-0 snap-start">
                  <ReviewCard review={review} />
                </div>
              )) : (
                <div className="flex min-h-64 w-[72vw] max-w-[310px] shrink-0 snap-start items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-500 dark:border-slate-700">
                  No public reviews yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5 max-sm:rounded-xl">
        <h2 className="text-base font-bold text-slate-950 dark:text-white sm:text-lg">About the Store</h2>
        <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{aboutText}</p>
        <div className="mt-6 grid gap-4 text-center sm:mt-8 sm:grid-cols-3">
          {aboutHighlights.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="grid gap-2">
                <Icon className="mx-auto h-8 w-8 text-slate-600 dark:text-slate-300" />
                <div className="text-xs font-bold text-slate-950 dark:text-white">{item.title || "Store Highlight"}</div>
                <div className="text-xs text-slate-500">{item.text || "Set this from Edit Profile"}</div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export function VendorStorefrontPage() {
  const { vendorSlug } = useParams();
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const [reviewsData, setReviewsData] = useState(null);

  useEffect(() => {
    let alive = true;
    setState((current) => ({ ...current, loading: true, error: "" }));
    getVendorStorefront(vendorSlug)
      .then((response) => {
        if (alive) setState({ loading: false, error: "", data: response.data });
      })
      .catch((err) => {
        if (alive) setState({ loading: false, error: err?.response?.data?.message || "Vendor store not found.", data: null });
      });
    return () => {
      alive = false;
    };
  }, [vendorSlug]);

  useEffect(() => {
    let alive = true;
    getVendorStoreReviews(vendorSlug, { limit: 8, sortBy: "helpful" })
      .then((response) => {
        if (alive) setReviewsData(response.data);
      })
      .catch(() => {
        if (alive) setReviewsData(null);
      });
    return () => {
      alive = false;
    };
  }, [vendorSlug]);

  useEffect(() => {
    if (!state.data?.vendor?.storeSlug) return;
    trackVendorStoreEvent(state.data.vendor.storeSlug, {
      eventType: "PAGE_VIEW",
      path: window.location.pathname,
      sessionId: window.sessionStorage.getItem("storeSessionId") || "",
    }).catch(() => {});
  }, [state.data?.vendor?.storeSlug]);

  useStoreSeo(state.data?.vendor);

  if (state.loading) return <div className="rounded-2xl bg-white p-5 text-sm text-slate-500 dark:bg-slate-900 sm:p-8">Loading vendor store...</div>;
  if (state.error) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 sm:p-6">{state.error}</div>;

  const data = state.data;
  const vendor = data.vendor;
  const hasAssignedLayout = Boolean(data.assignedLayout && data.layoutRows?.length);

  return (
    <div className="grid max-w-full min-w-0 gap-4 overflow-hidden sm:gap-6">
      <VendorStoreHeader vendor={vendor} isFollowing={data.isFollowing} onFollowChange={(next) => setState((current) => ({ ...current, data: { ...current.data, ...next } }))} />

      {hasAssignedLayout ? (
        <DynamicHomepageRenderer
          rows={data.layoutRows}
          containers={data.containers || []}
          bareOuterLayout
          renderContext={{ pageContext: "VENDOR_STORE", vendorId: vendor._id, vendor }}
        />
      ) : null}

      {!hasAssignedLayout && data.collections?.length ? (
        <section className="grid gap-3">
          <h2 className="text-base font-bold text-slate-950 dark:text-white sm:text-lg">Seasonal Collections</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.collections.map((collection) => (
              <Link key={collection._id} to={`/vendor/${vendor.storeSlug}/products?category=${encodeURIComponent(collection.category || "")}`} className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <div className="h-28 bg-slate-100 dark:bg-slate-800">
                  {collection.imageUrl ? <img loading="lazy" decoding="async" src={collection.imageUrl} alt={collection.title} className="h-full w-full object-cover" /> : null}
                </div>
                <div className="p-3">
                  <div className="text-sm font-bold text-slate-950 dark:text-white">{collection.title}</div>
                  <div className="mt-1 line-clamp-2 text-xs text-slate-500">{collection.description || collection.type}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {!hasAssignedLayout ? (
        <>
          <ProductSection title="Featured Products" products={data.featuredProducts} to={`/vendor/${vendor.storeSlug}/products?sortBy=best_selling`} />
          <ProductSection title="New Arrivals" products={data.newArrivals} to={`/vendor/${vendor.storeSlug}/products?sortBy=newest`} />
          <ProductSection title="Best Sellers" products={data.bestSellers} to={`/vendor/${vendor.storeSlug}/products?sortBy=best_selling`} />
          <ProductSection title="Top Rated Products" products={data.topRatedProducts} to={`/vendor/${vendor.storeSlug}/products?sortBy=highest_rated`} />
          <ProductSection title="Deals Of The Day" products={data.dealsOfTheDay} to={`/vendor/${vendor.storeSlug}/products?discount=true`} />
          <ProductSection title="Recently Added Products" products={data.recentlyAddedProducts} to={`/vendor/${vendor.storeSlug}/products`} />
          <ProductSection title="Recommended Products" products={data.recommendedProducts} to={`/vendor/${vendor.storeSlug}/products?sortBy=best_selling`} />
        </>
      ) : null}

      <VendorReviewsAndAbout vendor={vendor} reviewsData={reviewsData} />
    </div>
  );
}
