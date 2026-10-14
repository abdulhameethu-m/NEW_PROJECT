import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronRight,
  Check,
  X,
  Trash2,
  Minus,
  Plus,
  ShoppingBag,
  ClipboardList,
  ShieldCheck,
  Heart,
} from "lucide-react";
import { useCartDrawer } from "../hooks/useCartDrawer";
import { useCart } from "../hooks/useCart";
import { formatCurrency } from "../utils/formatCurrency";
import { resolveApiAssetUrl } from "../utils/resolveUrl";
import * as productService from "../services/productService";
import { Portal } from "./Portal";
import { InlineToast } from "./commerce/InlineToast";
import {
  extractProductId,
  extractVariantId,
  getCartItemKey,
  normalizeCartPayload,
} from "../utils/cartState";

export function CartDrawer() {
  const navigate = useNavigate();
  const drawerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const {
    isRendered,
    isAnimating,
    openCount,
    lastAddedProduct,
    lastAddedVariant,
    lastAddedQuantity,
    closeDrawer,
    toast,
    showToast,
    clearToast,
    clearLastAddedItem,
  } = useCartDrawer();
  const { cart, removeItem, updateItem } = useCart();
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [deletingItems, setDeletingItems] = useState(new Set());
  const [updatingItems, setUpdatingItems] = useState(new Set());

  useEffect(() => {
    if (!isRendered || !lastAddedProduct?._id) return undefined;

    setShowSuccess(true);
    const successTimer = window.setTimeout(() => setShowSuccess(false), 2000);

    let alive = true;
    (async () => {
      try {
        setLoadingRecs(true);
        const response = await productService.getRelatedProducts(lastAddedProduct._id, 4);
        if (alive) {
          setRecommendations(Array.isArray(response?.data) ? response.data : []);
        }
      } catch {
        if (alive) setRecommendations([]);
      } finally {
        if (alive) setLoadingRecs(false);
      }
    })();

    return () => {
      alive = false;
      window.clearTimeout(successTimer);
    };
  }, [isRendered, lastAddedProduct, openCount]);

  useEffect(() => {
    if (!isRendered) return undefined;
    closeButtonRef.current?.focus();
    return undefined;
  }, [isRendered, openCount]);

  useEffect(() => {
    if (!isRendered || !drawerRef.current) return undefined;

    const node = drawerRef.current;
    const handleKeyDown = (event) => {
      if (event.key !== "Tab") return;

      const focusableElements = node.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (!focusableElements.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    node.addEventListener("keydown", handleKeyDown);
    return () => node.removeEventListener("keydown", handleKeyDown);
  }, [isRendered, openCount]);

  const normalizedCart = useMemo(() => normalizeCartPayload(cart), [cart]);
  const cartItems = normalizedCart.items;

  const fallbackCartItem = useMemo(() => {
    if (cartItems.length > 0 || !lastAddedProduct) return null;

    const rawImage =
      Array.isArray(lastAddedProduct?.images) && lastAddedProduct.images.length
        ? typeof lastAddedProduct.images[0] === "string"
          ? lastAddedProduct.images[0]
          : lastAddedProduct.images[0]?.url
        : "";

    const itemPrice = Number(
      lastAddedVariant?.discountPrice ??
        lastAddedVariant?.price ??
        lastAddedProduct?.discountPrice ??
        lastAddedProduct?.price ??
        0
    );

    return {
      productId: lastAddedProduct,
      name: lastAddedProduct?.name || "Product",
      image: rawImage,
      quantity: Number(lastAddedQuantity || 1),
      price: itemPrice,
      variantId: lastAddedVariant?.variantId || "",
      variantTitle: lastAddedVariant?.variantTitle || lastAddedVariant?.title || "",
      variantAttributes: lastAddedVariant?.selectedAttributes || {},
    };
  }, [cartItems.length, lastAddedProduct, lastAddedQuantity, lastAddedVariant]);

  const displayItems = fallbackCartItem ? [fallbackCartItem] : cartItems;
  const cartTotals = useMemo(() => {
    if (fallbackCartItem) {
      return {
        subtotal: fallbackCartItem.price * Number(fallbackCartItem.quantity || 0),
        items: Number(fallbackCartItem.quantity || 0),
      };
    }
    return {
      subtotal: normalizedCart.totalAmount,
      items: normalizedCart.totalQuantity,
    };
  }, [normalizedCart, fallbackCartItem]);

  const handleDeleteItem = async (productId, variantId) => {
    if (!productId) {
      showToast("Unable to remove this item right now.");
      return;
    }

    const itemKey = getCartItemKey(productId, variantId);
    if (deletingItems.has(itemKey)) return;

    setDeletingItems((prev) => new Set(prev).add(itemKey));
    try {
      await removeItem(productId, variantId);
      if (productId === extractProductId(lastAddedProduct)) {
        clearLastAddedItem();
      }
    } catch (error) {
      showToast(error?.response?.data?.message || error?.message || "Failed to remove item from cart.");
    } finally {
      setDeletingItems((prev) => {
        const next = new Set(prev);
        next.delete(itemKey);
        return next;
      });
    }
  };

  const handleUpdateQuantity = async (productId, variantId, newQuantity) => {
    if (!productId || newQuantity < 1) return;

    const itemKey = getCartItemKey(productId, variantId);
    if (updatingItems.has(itemKey) || deletingItems.has(itemKey)) return;

    setUpdatingItems((prev) => new Set(prev).add(itemKey));
    try {
      await updateItem(productId, newQuantity, variantId);
    } catch (error) {
      showToast(error?.response?.data?.message || error?.message || "Failed to update quantity.");
    } finally {
      setUpdatingItems((prev) => {
        const next = new Set(prev);
        next.delete(itemKey);
        return next;
      });
    }
  };

  if (!isRendered) return null;

  return (
    <Portal>
      <>
        <aside
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="drawer-title"
          className={`fixed right-0 top-0 z-50 flex h-dvh w-full max-w-[min(100vw,24rem)] sm:max-w-md flex-col overflow-hidden bg-white shadow-2xl transition-transform duration-300 ease-out dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 ${
            isAnimating ? "translate-x-0" : "translate-x-full"
          } pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)]`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3 shrink-0 dark:border-slate-800 dark:bg-slate-900">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
                <h2 id="drawer-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Added to Cart
                </h2>
              </div>
              {lastAddedVariant && (lastAddedVariant.variantTitle || lastAddedVariant.title || Object.keys(lastAddedVariant?.selectedAttributes || {}).length > 0) ? (
                <p className="mt-0.5 text-xs text-slate-500 pl-7">
                  Selected: <span className="font-semibold text-slate-700 dark:text-slate-300">{lastAddedVariant.variantTitle || lastAddedVariant.title || Object.values(lastAddedVariant.selectedAttributes).join(", ")}</span>
                </p>
              ) : null}
            </div>

            <button
              ref={closeButtonRef}
              onClick={closeDrawer}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition active:scale-95 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              aria-label="Close cart drawer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-3.5 sm:px-4 py-3 bg-slate-50/60 dark:bg-slate-950/60 space-y-3 [scrollbar-width:thin]">
            {/* Cart Items List */}
            {displayItems.length > 0 ? (
              <div>
                <div className="mb-2 flex items-center justify-between px-0.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <ShoppingBag className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" />
                    <h3>Cart Items ({displayItems.length})</h3>
                  </div>
                </div>

                <div className="space-y-2">
                  {displayItems.map((item) => {
                    const product = typeof item?.productId === "object" ? item.productId : null;
                    const productId = extractProductId(item?.productId || item);
                    const variantId = extractVariantId(item);
                    const itemKey = getCartItemKey(productId, variantId);
                    const isDeleting = deletingItems.has(itemKey);
                    const isUpdating = updatingItems.has(itemKey);
                    const itemName = product?.name || item?.name || "Product";
                    const rawImage =
                      (typeof item?.image === "string" ? item.image : item?.image?.url) ||
                      (Array.isArray(product?.images)
                        ? typeof product.images[0] === "string"
                          ? product.images[0]
                          : product.images[0]?.url
                        : "") ||
                      (Array.isArray(item?.images)
                        ? typeof item.images[0] === "string"
                          ? item.images[0]
                          : item.images[0]?.url
                        : "");
                    const itemImage = resolveApiAssetUrl(rawImage || "");
                    const itemPrice = Number(item?.discountedPrice ?? item?.price ?? 0);

                    return (
                      <div
                        key={itemKey}
                        className={`flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-xs transition dark:border-slate-800 dark:bg-slate-900 ${
                          isDeleting ? "pointer-events-none opacity-50" : ""
                        }`}
                      >
                        {/* Product Thumbnail */}
                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800">
                          {itemImage ? (
                            <img
                              loading="lazy"
                              decoding="async"
                              src={itemImage}
                              alt={itemName}
                              className="h-full w-full object-contain p-0.5"
                            />
                          ) : (
                            <ShoppingBag className="h-5 w-5 text-slate-400 opacity-60" />
                          )}
                        </div>

                        {/* Item Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-1">
                            <h4 className="line-clamp-1 text-xs font-semibold text-slate-900 dark:text-white">
                              {itemName}
                            </h4>
                            {item?.variantTitle ? (
                              <span className="flex-shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {item.variantTitle}
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                              {formatCurrency(itemPrice * Number(item.quantity || 0))}
                            </span>

                            <div className="flex items-center gap-1">
                              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuantity(productId, variantId, Number(item.quantity) - 1)}
                                  disabled={isDeleting || isUpdating || Number(item.quantity) <= 1}
                                  className="flex h-6 w-6 items-center justify-center text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-700 transition active:scale-95 disabled:opacity-40"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="flex min-w-[18px] items-center justify-center text-[11px] font-bold text-slate-800 dark:text-slate-200">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuantity(productId, variantId, Number(item.quantity) + 1)}
                                  disabled={isDeleting || isUpdating}
                                  className="flex h-6 w-6 items-center justify-center text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-700 transition active:scale-95 disabled:opacity-40"
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDeleteItem(productId, variantId)}
                                disabled={isDeleting}
                                className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 transition active:scale-95 disabled:opacity-50"
                                aria-label={`Remove ${itemName} from cart`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Cart Summary Card */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                <ClipboardList className="h-3.5 w-3.5 text-slate-500" />
                <h3>Cart Summary</h3>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <span>Items</span>
                <span className="font-semibold text-slate-900 dark:text-white">{cartTotals.items}</span>
              </div>
              <div className="flex items-baseline justify-between pt-0.5">
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Total Amount</span>
                <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  {formatCurrency(cartTotals.subtotal)}
                </span>
              </div>
            </div>

            {/* Recommendations */}
            {recommendations.length > 0 && !loadingRecs ? (
              <div className="pt-1">
                <div className="mb-2 flex items-center justify-between px-0.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                    <Heart className="h-3.5 w-3.5 fill-current" />
                    You may also like
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {recommendations.slice(0, 2).map((rec) => {
                    const firstImage = Array.isArray(rec?.images)
                      ? typeof rec.images[0] === "string"
                        ? rec.images[0]
                        : rec.images[0]?.url
                      : "";
                    const recImage = resolveApiAssetUrl(firstImage || "");
                    const recPrice = rec?.discountPrice || rec?.price || 0;

                    return (
                      <button
                        key={rec._id}
                        type="button"
                        onClick={() => {
                          navigate(`/product/${rec._id}`);
                          closeDrawer();
                        }}
                        className="group overflow-hidden rounded-xl border border-slate-200/80 bg-white p-2 text-left shadow-xs transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div className="aspect-square overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center p-1">
                          {recImage ? (
                            <img
                              loading="lazy"
                              decoding="async"
                              src={recImage}
                              alt={rec?.name || "Recommended product"}
                              className="h-full w-full object-contain transition duration-200 group-hover:scale-105"
                            />
                          ) : null}
                        </div>
                        <div className="pt-1.5">
                          <p className="line-clamp-1 text-[11px] font-semibold text-slate-900 dark:text-white">
                            {rec?.name || "Product"}
                          </p>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            {formatCurrency(recPrice)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer Action Buttons */}
          <div className="border-t border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 shrink-0 space-y-2">
            <Link
              to="/checkout"
              onClick={closeDrawer}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 text-white py-2.5 px-4 text-xs sm:text-sm font-bold shadow-xs transition active:scale-98"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Checkout Now</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>

            <div className="flex gap-2">
              <Link
                to="/cart"
                onClick={closeDrawer}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white py-2 px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition active:scale-98"
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>View Cart</span>
              </Link>

              <button
                type="button"
                onClick={closeDrawer}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white py-2 px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition active:scale-98"
              >
                <span>Continue Shopping</span>
              </button>
            </div>
          </div>
        </aside>

        <InlineToast toast={toast} onClose={clearToast} />
      </>
    </Portal>
  );
}
