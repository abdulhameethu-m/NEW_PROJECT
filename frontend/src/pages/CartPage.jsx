import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FbtBundleSection } from "../components/FbtBundleSection";
import { RecommendationSection } from "../components/RecommendationSection";
import { getCartRecommendations, getFbtRecommendations } from "../services/recommendationService";
import { formatCurrency } from "../utils/formatCurrency";
import { getFormattedWeight } from "../utils/weight";
import { useCart } from "../hooks/useCart";
import { SellerNameLink } from "../components/seller/SellerNavigation";
import {
  ShoppingBag,
  Store,
  Trash2,
  Lock,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

const RECOMMENDATION_CONTAINER_LIMIT = 10;

function normalizeError(err) {
  return err?.response?.data?.message || err?.message || "Request failed";
}

export function CartPage() {
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [recommendations, setRecommendations] = useState(null);
  const [fbtBundle, setFbtBundle] = useState(null);
  const { cart, isGuest, loading, refreshCart, addItem, updateItem, removeItem, validateCart } = useCart();
  const initialFetchDone = useRef(false);

  // Only fetch on mount to avoid dependency cycle
  useEffect(() => {
    if (initialFetchDone.current) return;
    initialFetchDone.current = true;

    setError("");
    const performFetch = async () => {
      try {
        if (isGuest) {
          await validateCart();
        } else {
          await refreshCart();
        }
      } catch (e) {
        setError(normalizeError(e));
      }
    };

    performFetch();
  }, [isGuest, refreshCart, validateCart]);

  const items = useMemo(() => (Array.isArray(cart?.items) ? cart.items : []), [cart]);
  const total = Number(cart?.totalAmount || 0);
  const totalItemsCount = useMemo(() => {
    return items.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
  }, [items]);

  const productIds = useMemo(
    () => items.map((item) => item?.productId?._id || item?.productId).filter(Boolean).map(String),
    [items]
  );

  useEffect(() => {
    let cancelled = false;
    async function loadRecommendations() {
      if (!productIds.length) {
        setRecommendations(null);
        return;
      }
      try {
        const response = await getCartRecommendations(productIds, { limit: RECOMMENDATION_CONTAINER_LIMIT });
        const fbtResponse = productIds[0]
          ? await getFbtRecommendations(productIds[0], { limit: RECOMMENDATION_CONTAINER_LIMIT - 1 }).catch(() => ({ data: null }))
          : { data: null };
        if (!cancelled) {
          setRecommendations(response?.data || null);
          setFbtBundle(fbtResponse?.data || null);
        }
      } catch {
        if (!cancelled) {
          setRecommendations(null);
          setFbtBundle(null);
        }
      }
    }
    loadRecommendations();
    return () => {
      cancelled = true;
    };
  }, [productIds]);

  async function changeQty(productId, variantId, nextQty) {
    setBusyId(`${productId}:${variantId || ""}`);
    setError("");
    try {
      await updateItem(productId, nextQty, variantId);
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setBusyId("");
    }
  }

  async function remove(productId, variantId) {
    setBusyId(`${productId}:${variantId || ""}`);
    setError("");
    try {
      await removeItem(productId, variantId);
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/60 pb-20 sm:pb-12 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {error ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs sm:text-sm font-medium text-rose-800">
            {error}
          </div>
        ) : null}

        {/* Compact Top Header */}
        <div className="mb-4 sm:mb-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 sm:pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs">
              <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Your Cart <span className="text-xs sm:text-sm font-medium text-slate-500 ml-1">({totalItemsCount} {totalItemsCount === 1 ? "item" : "items"})</span>
              </h1>
            </div>
          </div>
          <Link
            to="/shop"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Continue Shopping</span>
          </Link>
        </div>

        {/* Loading state */}
        {loading && items.length === 0 ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="flex flex-col gap-3">
              {Array.from({ length: 2 }).map((_, idx) => (
                <div key={idx} className="h-28 animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-800" />
              ))}
            </div>
            <div className="h-64 animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-800" />
          </div>
        ) : items.length === 0 ? (
          /* Empty Cart State */
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 sm:p-12 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900 max-w-lg mx-auto my-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              <ShoppingBag className="h-8 w-8 stroke-[1.5]" />
            </div>
            <h3 className="mt-4 text-base sm:text-lg font-bold text-slate-900 dark:text-white">Your cart is empty</h3>
            <p className="mt-1 text-xs text-slate-500">Looks like you haven&apos;t added any items yet.</p>
            <Link
              to="/shop"
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-xs active:scale-98"
            >
              Explore Products
            </Link>
          </div>
        ) : (
          /* Cart Content Layout */
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_360px] items-start">
            {/* Left Column: Cart Items List */}
            <div className="flex flex-col gap-2.5 sm:gap-3">
              {items.map((item) => {
                const p = item?.productId;
                const id = p?._id || item.productId;
                const name = p?.name || item?.name || "Product";
                const img = item.image || (Array.isArray(p?.images) && p.images.length ? p.images[0]?.url : "");
                const qty = Number(item.quantity || 1);
                const price = Number(item.price || 0);
                const seller = item?.sellerId || p?.sellerId;
                const variantLabel = item?.variantTitle || "";
                const variantId = item?.variantId || "";
                const productWeightLabel = getFormattedWeight(p || item);
                const busyKey = `${id}:${variantId}`;

                return (
                  <div
                    key={`${String(id)}:${variantId}`}
                    className="rounded-xl border border-slate-200/80 bg-white p-3 sm:p-4 shadow-xs transition dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex gap-3 sm:gap-4">
                      {/* Product Thumbnail */}
                      <div
                        onClick={() => navigate(`/product/${id}`)}
                        className="h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800 p-1 cursor-pointer flex items-center justify-center"
                      >
                        {img ? (
                          <img
                            loading="lazy"
                            decoding="async"
                            src={img}
                            alt={name}
                            className="h-full w-full object-contain rounded-md transition-transform duration-200 hover:scale-105"
                          />
                        ) : (
                          <div className="text-[10px] text-slate-400">No img</div>
                        )}
                      </div>

                      {/* Details Column */}
                      <div className="flex flex-1 flex-col justify-between min-w-0">
                        <div>
                          <div className="flex items-start justify-between gap-1.5">
                            <h3
                              className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 line-clamp-1 sm:line-clamp-2 leading-snug"
                              onClick={() => navigate(`/product/${id}`)}
                            >
                              {name}
                            </h3>
                            <button
                              type="button"
                              disabled={busyId === busyKey}
                              onClick={() => remove(String(id), variantId)}
                              className="flex-shrink-0 h-6 w-6 rounded flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition disabled:opacity-40"
                              title="Remove item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Seller & Variant meta */}
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                            {seller && (
                              <span className="flex items-center gap-1">
                                <Store className="h-3 w-3 text-slate-400" />
                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                  <SellerNameLink seller={seller} showPrefix={false} />
                                </span>
                              </span>
                            )}
                            {variantLabel && (
                              <>
                                <span className="text-slate-300 dark:text-slate-700">•</span>
                                <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                                  {variantLabel}
                                </span>
                              </>
                            )}
                            {productWeightLabel && (
                              <>
                                <span className="text-slate-300 dark:text-slate-700">•</span>
                                <span className="text-[10px]">{productWeightLabel}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Price & Quantity Stepper */}
                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                              {formatCurrency(price * qty)}
                            </span>
                            {qty > 1 && (
                              <span className="text-[10px] text-slate-400">
                                ({formatCurrency(price)} each)
                              </span>
                            )}
                          </div>

                          {/* Stepper */}
                          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                            <button
                              type="button"
                              disabled={busyId === busyKey || qty <= 1}
                              onClick={() => changeQty(String(id), variantId, qty - 1)}
                              className="flex h-7 w-7 items-center justify-center text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 transition active:scale-95 disabled:opacity-30"
                              aria-label="Decrease quantity"
                            >
                              −
                            </button>
                            <span className="flex min-w-[22px] items-center justify-center text-xs font-bold text-slate-800 dark:text-slate-100">
                              {busyId === busyKey ? (
                                <div className="h-3 w-3 rounded-full border-2 border-slate-600 border-t-transparent animate-spin" />
                              ) : (
                                qty
                              )}
                            </span>
                            <button
                              type="button"
                              disabled={busyId === busyKey}
                              onClick={() => changeQty(String(id), variantId, qty + 1)}
                              className="flex h-7 w-7 items-center justify-center text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 transition active:scale-95"
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Order Summary (Desktop / Tablet) */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3 sticky top-4">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Order Summary
              </h2>

              <div className="space-y-2 border-b border-slate-100 pb-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <div className="flex justify-between items-center">
                  <span>Subtotal ({totalItemsCount} {totalItemsCount === 1 ? "item" : "items"})</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Delivery</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Free</span>
                </div>
              </div>

              <div className="flex items-baseline justify-between pt-0.5">
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Total Amount</div>
                  <div className="text-[10px] text-slate-400">Inclusive of all taxes</div>
                </div>
                <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {formatCurrency(total)}
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate("/checkout")}
                disabled={items.length === 0}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 py-2.5 sm:py-3 text-xs sm:text-sm font-bold shadow-xs transition active:scale-98 disabled:opacity-50"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Proceed to Checkout</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>

              <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 pt-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>Safe and secure 256-bit encrypted checkout</span>
              </div>
            </div>
          </div>
        )}

        {/* Compact Recommendations (if available) */}
        {items.length > 0 && recommendations?.crossSell && recommendations.crossSell.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
            <RecommendationSection
              title="Recommended add-ons"
              subtitle="Picks frequently paired with your cart items."
              items={recommendations.crossSell}
              layout="carousel"
              recommendationType="cross_sell"
              surface="cart"
              sourceProductId={productIds[0] || ""}
              showEmptyState={false}
            />
          </div>
        )}

        {items.length > 0 && fbtBundle && (
          <div className="mt-6">
            <FbtBundleSection
              fbt={fbtBundle}
              sourceProductId={productIds[0] || ""}
              surface="cart"
              onAddProduct={addItem}
            />
          </div>
        )}
      </div>

      {/* Mobile Fixed Bottom Checkout Bar */}
      {items.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/95 px-3.5 py-2.5 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow-lg backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 sm:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Total ({totalItemsCount})</div>
              <div className="text-base font-black text-slate-900 dark:text-white leading-tight">
                {formatCurrency(total)}
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/checkout")}
              className="flex-1 max-w-[200px] flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 py-2.5 px-4 text-xs font-bold shadow-xs transition active:scale-95"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Checkout Now</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
