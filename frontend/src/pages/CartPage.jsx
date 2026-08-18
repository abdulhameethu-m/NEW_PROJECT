import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import { FbtBundleSection } from "../components/FbtBundleSection";
import { RecommendationSection } from "../components/RecommendationSection";
import { getCartRecommendations, getFbtRecommendations } from "../services/recommendationService";
import { formatCurrency } from "../utils/formatCurrency";
import { formatWeight, getFormattedWeight, getWeightUnit, getWeightValue } from "../utils/weight";
import { useCart } from "../hooks/useCart";
import { SellerNameLink } from "../components/seller/SellerNavigation";
import { ShoppingBag, Store, Trash2, Lock, Tag, Truck, ArrowLeft, ShieldCheck, Info } from "lucide-react";

const RECOMMENDATION_CONTAINER_LIMIT = 20;

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
    <div className="min-h-screen bg-slate-50/50 pb-12 relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/40 via-transparent to-purple-50/40" />
        
        {/* Soft Blobs */}
        <div className="absolute top-24 left-[15%] w-12 h-12 rounded-full bg-indigo-200/40 blur-sm" />
        <div className="absolute top-[30%] right-[10%] w-24 h-24 rounded-full bg-purple-200/30 blur-md" />
        <div className="absolute bottom-32 left-[5%] w-32 h-32 rounded-full bg-indigo-200/20 blur-md" />

        {/* Top Center Stylized Bag */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-64 h-64 text-indigo-200/40 -rotate-3">
          <svg viewBox="0 0 100 100" fill="currentColor" className="w-full h-full drop-shadow-xl">
            {/* Back handle */}
            <path d="M35 35 C35 15, 65 15, 65 35" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.4" />
            {/* Front handle */}
            <path d="M40 38 C40 18, 70 18, 70 38" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.7" />
            {/* Bag Body Back */}
            <path d="M20 35 L80 35 L75 90 C75 95, 70 95, 50 95 C30 95, 25 95, 25 90 Z" fill="currentColor" opacity="0.3" />
            {/* Bag Body Front (overlap for 3D effect) */}
            <path d="M15 45 L85 40 L75 90 C75 95, 70 95, 50 95 C30 95, 25 95, 25 90 Z" fill="currentColor" opacity="0.7" />
            {/* Fold line */}
            <path d="M25 90 C25 90, 50 85, 75 90" fill="none" stroke="white" strokeWidth="1" opacity="0.5" />
          </svg>
        </div>

        {/* Bottom Right Bag moved to Order Summary */}

        {/* More Sparkles / Stars */}
        <svg className="absolute top-10 right-20 w-12 h-12 text-indigo-300/60 drop-shadow-sm" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0 C12 6, 18 12, 24 12 C18 12, 12 18, 12 24 C12 18, 6 12, 0 12 C6 12, 12 6, 12 0 Z" />
        </svg>
        <svg className="absolute top-32 right-[25%] w-6 h-6 text-purple-300/60" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0 C12 6, 18 12, 24 12 C18 12, 12 18, 12 24 C12 18, 6 12, 0 12 C6 12, 12 6, 12 0 Z" />
        </svg>
        <svg className="absolute top-24 left-[20%] w-10 h-10 text-indigo-200/70" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0 C12 6, 18 12, 24 12 C18 12, 12 18, 12 24 C12 18, 6 12, 0 12 C6 12, 12 6, 12 0 Z" />
        </svg>
        <svg className="absolute top-6 left-12 w-6 h-6 text-purple-300/50" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0 C12 6, 18 12, 24 12 C18 12, 12 18, 12 24 C12 18, 6 12, 0 12 C6 12, 12 6, 12 0 Z" />
        </svg>
        <svg className="absolute top-[40%] left-[8%] w-8 h-8 text-indigo-300/40" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0 C12 6, 18 12, 24 12 C18 12, 12 18, 12 24 C12 18, 6 12, 0 12 C6 12, 12 6, 12 0 Z" />
        </svg>
        <svg className="absolute bottom-[20%] left-10 w-9 h-9 text-purple-200/60" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0 C12 6, 18 12, 24 12 C18 12, 12 18, 12 24 C12 18, 6 12, 0 12 C6 12, 12 6, 12 0 Z" />
        </svg>
        <svg className="absolute bottom-40 right-[40%] w-5 h-5 text-indigo-200/70" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0 C12 6, 18 12, 24 12 C18 12, 12 18, 12 24 C12 18, 6 12, 0 12 C6 12, 12 6, 12 0 Z" />
        </svg>
        <svg className="absolute bottom-[10%] right-[30%] w-10 h-10 text-purple-300/50" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0 C12 6, 18 12, 24 12 C18 12, 12 18, 12 24 C12 18, 6 12, 0 12 C6 12, 12 6, 12 0 Z" />
        </svg>
      </div>

      <div className="mx-auto max-w-7xl px-4 lg:px-8 py-8 relative z-10">
        {error ? (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
            {error}
          </div>
        ) : null}

        {/* Top Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-sm">
              <ShoppingBag size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Your Cart <span className="text-lg font-medium text-slate-500 ml-1">({items.length} items)</span>
              </h1>
              <p className="mt-1 text-sm text-slate-500">Review items from multiple sellers in one place</p>
            </div>
          </div>
          <Link to="/shop" className="mt-6 sm:mt-0 flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
            <ArrowLeft size={16} strokeWidth={2.5} /> Continue Shopping
          </Link>
        </div>

        {loading && items.length === 0 ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <div className="flex flex-col gap-4">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="h-48 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
              ))}
            </div>
            <div className="h-96 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-slate-50 text-indigo-200">
              <ShoppingBag size={48} strokeWidth={1.5} />
            </div>
            <h3 className="mt-6 text-xl font-bold text-slate-900">Your cart is empty</h3>
            <p className="mt-2 text-sm text-slate-500">Browse products and add something to your cart</p>
            <Link
              to="/shop"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-8 py-3.5 text-sm font-bold text-white transition hover:bg-indigo-700 shadow-sm shadow-indigo-200 active:scale-[0.98]"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
            {/* Left Column: Cart Items */}
            <div className="flex flex-col gap-5">
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
                const itemWeight = getWeightValue(p || item);
                const itemWeightUnit = getWeightUnit(p || item);
                const totalWeight = itemWeight * qty;
                const productWeightLabel = getFormattedWeight(p || item);
                const busyKey = `${id}:${variantId}`;
                
                // Static delivery date for UI representation based on screenshot
                const deliveryDate = "Wed, 21 May"; 

                return (
                  <div key={`${String(id)}:${variantId}`} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    {/* Item Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 bg-slate-50/50">
                      <div className="flex items-center gap-2">
                        <Store size={18} className="text-slate-600" />
                        <span className="text-sm text-slate-500">Sold by</span>
                        <div className="font-bold text-slate-900 text-sm">
                          <SellerNameLink seller={seller} showPrefix={false} />
                        </div>
                      </div>

                    </div>

                    {/* Item Body */}
                    <div className="flex flex-col sm:flex-row gap-6 p-5">
                      {/* Image */}
                      <div className="h-32 w-32 flex-shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 p-1">
                        {img ? (
                          <img
                            loading="lazy"
                            decoding="async"
                            src={img}
                            alt={name}
                            className="h-full w-full object-cover rounded-lg cursor-pointer transition-transform duration-300 hover:scale-105"
                            onClick={() => navigate(`/product/${id}`)}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-slate-400">No image</div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex flex-1 flex-col justify-between">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                          <div>
                            <h3
                              className="text-lg font-bold text-slate-900 cursor-pointer hover:text-indigo-600 transition-colors line-clamp-2 leading-tight"
                              onClick={() => navigate(`/product/${id}`)}
                            >
                              {name}
                            </h3>
                            <div className="mt-2.5 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                              {variantLabel && (
                                <span className="flex items-center gap-1">
                                  Color: <span className="font-medium text-slate-700">{variantLabel}</span>
                                </span>
                              )}
                              {variantLabel && productWeightLabel && <span className="text-slate-300">•</span>}
                              {productWeightLabel && (
                                <span className="flex items-center gap-1">
                                  Size: <span className="font-medium text-slate-700">{productWeightLabel}</span>
                                </span>
                              )}
                            </div>
                            <div className="mt-3.5 inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 border border-emerald-100">
                              In Stock
                            </div>
                          </div>

                          <div className="sm:text-right flex flex-row sm:flex-col items-baseline sm:items-end justify-between sm:justify-start">
                            <div className="text-xl font-bold text-slate-900 tracking-tight">
                              {formatCurrency(price * qty)}
                            </div>
                            <div className="text-sm font-medium text-slate-500 mt-1">
                              {formatCurrency(price)} <span className="font-normal text-slate-400">each</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 sm:border-none sm:pt-0">
                          <div className="flex items-center rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                            <button
                              type="button"
                              disabled={busyId === busyKey || qty <= 1}
                              onClick={() => changeQty(String(id), variantId, qty - 1)}
                              className="flex h-9 w-10 items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 transition-colors"
                            >
                              −
                            </button>
                            <div className="flex h-9 w-12 items-center justify-center border-x border-slate-200 bg-slate-50/50 text-sm font-bold text-slate-900 relative">
                              {busyId === busyKey && (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80">
                                  <div className="h-4 w-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></div>
                                </div>
                              )}
                              <span className={busyId === busyKey ? "opacity-0" : ""}>{qty}</span>
                            </div>
                            <button
                              type="button"
                              disabled={busyId === busyKey}
                              onClick={() => changeQty(String(id), variantId, qty + 1)}
                              className="flex h-9 w-10 items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 transition-colors"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            disabled={busyId === busyKey}
                            onClick={() => remove(String(id), variantId)}
                            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold text-rose-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 transition-colors"
                            title="Remove item"
                          >
                            <Trash2 size={16} strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Order Summary */}
            <div>
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm sticky top-6 relative overflow-hidden">
                {/* Decorative background bag for Summary */}
                <div className="absolute -bottom-24 -right-24 w-80 h-80 text-purple-300/40 rotate-12 pointer-events-none z-0">
                  <svg viewBox="0 0 100 100" fill="currentColor" className="w-full h-full drop-shadow-xl">
                    <path d="M35 35 C35 15, 65 15, 65 35" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.4" />
                    <path d="M40 38 C40 18, 70 18, 70 38" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.7" />
                    <path d="M20 35 L80 35 L75 90 C75 95, 70 95, 50 95 C30 95, 25 95, 25 90 Z" fill="currentColor" opacity="0.3" />
                    <path d="M15 45 L85 40 L75 90 C75 95, 70 95, 50 95 C30 95, 25 95, 25 90 Z" fill="currentColor" opacity="0.7" />
                  </svg>
                </div>
                
                <div className="relative z-10 p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-6">Order Summary</h2>
                
                <div className="space-y-4 text-sm text-slate-600">
                  <div className="flex justify-between items-center">
                    <span>Subtotal ({items.length} items)</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(total)}</span>
                  </div>

                </div>
                
                <div className="my-6 border-t border-slate-100 pt-5">
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-lg font-bold text-slate-900">Total</div>
                      <div className="text-xs text-slate-500 mt-0.5">Inclusive of all taxes</div>
                    </div>
                    <div className="text-2xl font-black text-slate-900 tracking-tight">
                      {formatCurrency(total)}
                    </div>
                  </div>
                </div>
                

                
                <button
                  type="button"
                  onClick={() => navigate("/checkout")}
                  disabled={items.length === 0}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-4 text-sm font-bold text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200 mb-3 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
                >
                  <Lock size={16} strokeWidth={2.5} /> Proceed to Checkout
                </button>
                
                <button
                  type="button"
                  onClick={() => navigate("/shop")}
                  className="w-full rounded-xl border-2 border-slate-100 bg-white py-3.5 text-sm font-bold text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50 transition-colors active:scale-[0.98]"
                >
                  Continue Shopping
                </button>
                
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recommendations Sections */}
        {items.length > 0 && (
          <div className="mt-16 flex flex-col gap-12">
            <RecommendationSection
              title="Recommended add-ons"
              subtitle="Cross-sell picks generated from cart contents and co-purchase behavior."
              items={recommendations?.crossSell || []}
              layout="grid"
              recommendationType="cross_sell"
              surface="cart"
              sourceProductId={productIds[0] || ""}
            />
            <FbtBundleSection fbt={fbtBundle} sourceProductId={productIds[0] || ""} surface="cart" onAddProduct={addItem} />
            <RecommendationSection
              title="Recommended for you"
              subtitle="Personalized picks based on your shopping signals."
              items={recommendations?.personalized || []}
              layout="carousel"
              recommendationType="personalized"
              surface="cart"
              sourceProductId={productIds[0] || ""}
            />
            <RecommendationSection
              title="Trending now"
              subtitle="Popular products customers are exploring right now."
              items={recommendations?.trending || []}
              layout="grid"
              recommendationType="trending"
              surface="cart"
              sourceProductId={productIds[0] || ""}
            />
            <RecommendationSection
              title="Recently viewed"
              subtitle="Return to products you checked before opening the cart."
              items={recommendations?.recentlyViewed || []}
              layout="carousel"
              recommendationType="recently_viewed"
              surface="cart"
              sourceProductId={productIds[0] || ""}
            />
            <RecommendationSection
              title="Similar picks"
              subtitle="More products close to your current cart item."
              items={recommendations?.similar || []}
              layout="grid"
              recommendationType="similar"
              surface="cart"
              sourceProductId={productIds[0] || ""}
            />
          </div>
        )}
      </div>
    </div>
  );
}
