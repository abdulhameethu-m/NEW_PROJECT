import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, Check, X, Trash2, Minus, Plus, ShoppingBag, ClipboardList, ShieldCheck, Award, RefreshCcw, Truck, Sparkles, Heart } from "lucide-react";
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
      lastAddedVariant?.discountPrice ?? lastAddedVariant?.price ?? lastAddedProduct?.discountPrice ?? lastAddedProduct?.price ?? 0
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
  const cartTotals = useMemo(
    () => {
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
    },
    [normalizedCart, fallbackCartItem]
  );

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
          className={`fixed right-0 top-0 z-50 flex h-dvh w-full max-w-[min(100vw,28rem)] flex-col overflow-hidden bg-[#fafbfe] shadow-2xl transition-transform duration-300 ease-out dark:bg-slate-900 ${
            isAnimating ? "translate-x-0" : "translate-x-full"
          } pb-[max(1rem,env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)]`}
        >
          <div className="flex items-center justify-between p-4 sm:p-6 bg-white shrink-0">
            <div>
              <h2 id="drawer-title" className="text-[22px] font-extrabold text-[#111827] tracking-tight dark:text-white">
                Added to Cart
              </h2>
              {lastAddedVariant ? (
                <p className="mt-0.5 text-sm font-medium text-slate-500">
                  {lastAddedVariant.variantTitle || lastAddedVariant.title ? (
                    <>Selected variant: <span className="text-[#ec4899] font-semibold">{lastAddedVariant.variantTitle || lastAddedVariant.title}</span></>
                  ) : Object.keys(lastAddedVariant?.selectedAttributes || {}).length > 0 ? (
                    <>Selected: <span className="text-[#ec4899] font-semibold">{Object.values(lastAddedVariant.selectedAttributes).join(", ")}</span></>
                  ) : (
                    "Auto-selected."
                  )}
                </p>
              ) : null}
            </div>
            <button
              ref={closeButtonRef}
              onClick={closeDrawer}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#3730A3] transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              aria-label="Close cart drawer"
            >
              <X className="h-6 w-6 stroke-[2.5]" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 pb-6 pt-2 bg-[#fafbfe] dark:bg-slate-900 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {showSuccess ? (
              <div className="relative mb-6 flex items-center gap-3 overflow-hidden bg-gradient-to-b from-white via-[#ebfcf3] to-[#fafbfe] px-4 sm:px-6 pt-6 pb-4 -mx-4 sm:-mx-6 -mt-2">
                {/* Confetti Background Shapes */}
                <svg className="absolute inset-0 h-full w-full pointer-events-none" preserveAspectRatio="none">
                  <path d="M 80 15 L 85 20 M 180 10 L 175 14 M 220 30 L 225 25 M 260 12 L 265 15 M 100 40 L 95 38" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" />
                  <path d="M 60 30 L 65 30 M 150 40 L 150 45 M 190 20 L 195 20 M 240 40 L 245 42 M 280 25 L 275 25" stroke="#facc15" strokeWidth="3" strokeLinecap="round" />
                  <path d="M 40 20 L 45 25 M 120 15 L 125 10 M 200 40 L 205 35 M 140 25 L 135 28 M 270 35 L 272 40" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#059669]">
                  <Check className="h-5 w-5 text-white stroke-[2.5]" />
                </div>
                <div className="relative text-[15px] font-bold text-[#059669]">
                  🎉 Successfully added to cart!
                </div>
              </div>
            ) : null}

            {displayItems.length > 0 ? (
              <div className="mb-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f3e8ff]">
                    <ShoppingBag className="h-5 w-5 text-[#9333ea]" />
                  </div>
                  <h3 className="text-[17px] font-extrabold text-[#1e1b4b] dark:text-slate-300">
                    Cart Items ({displayItems.length})
                  </h3>
                </div>

                <div className="space-y-4">
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
                        className={`flex items-center gap-3 rounded-[16px] bg-white p-2.5 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition dark:border-slate-800 ${
                          isDeleting ? "pointer-events-none opacity-50" : ""
                        }`}
                      >
                        <div className="flex h-[84px] w-[84px] flex-shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-slate-50 dark:bg-slate-800">
                          {itemImage ? (
                            <img loading="lazy" decoding="async" src={itemImage} alt={itemName} className="h-full w-full object-cover" />
                          ) : (
                            <div className="text-slate-400 dark:text-slate-600">
                              <ShoppingBag className="h-6 w-6 opacity-50" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1 py-0.5 flex flex-col justify-between h-full">
                          {/* Row 1: Name and Variant Inline */}
                          <div className="flex items-start justify-between gap-1">
                            <h4 className="line-clamp-2 text-[14px] font-bold text-[#111827] dark:text-white leading-tight">
                              {itemName}
                            </h4>
                            {item?.variantTitle ? (
                              <div className="flex-shrink-0 inline-flex items-center gap-1 rounded-full bg-[#fce7f3] px-1.5 py-0.5 text-[10px] font-semibold text-[#be185d]">
                                <span className="h-1 w-1 rounded-full bg-[#ec4899]"></span>
                                {item.variantTitle}
                              </div>
                            ) : null}
                          </div>
                          
                          {/* Row 2: Price and Controls Inline */}
                          <div className="flex items-center justify-between gap-1 mt-auto pt-2">
                            <div className="text-[14px] sm:text-[15px] font-black text-[#111827] dark:text-white truncate">
                              {formatCurrency(itemPrice * Number(item.quantity || 0))}
                            </div>
                            
                            <div className="flex items-center gap-1.5">
                              <div className="flex items-center rounded-lg bg-[#fdf2f8] px-0.5 py-0.5 border border-[#fce7f3]">
                                <button
                                  onClick={() => handleUpdateQuantity(productId, variantId, Number(item.quantity) - 1)}
                                  disabled={isDeleting || isUpdating || Number(item.quantity) <= 1}
                                  className="flex h-6 w-6 items-center justify-center rounded-[6px] text-[#e11d48] transition-colors hover:bg-[#ffe4e6] disabled:opacity-50"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="flex min-w-[20px] items-center justify-center text-[12px] font-bold text-[#881337]">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => handleUpdateQuantity(productId, variantId, Number(item.quantity) + 1)}
                                  disabled={isDeleting || isUpdating}
                                  className="flex h-6 w-6 items-center justify-center rounded-[6px] text-[#e11d48] transition-colors hover:bg-[#ffe4e6] disabled:opacity-50"
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                              
                              <button
                                onClick={() => handleDeleteItem(productId, variantId)}
                                disabled={isDeleting}
                                className="flex-shrink-0 rounded-lg p-1.5 border border-[#ffe4e6] text-[#e11d48] bg-white transition hover:bg-[#ffe4e6] disabled:opacity-50"
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

            <div className="relative overflow-hidden bg-gradient-to-b from-[#fafbfe] via-[#eff6ff] to-[#fafbfe] py-6 sm:py-8 -mx-4 sm:-mx-6 px-4 sm:px-6 mb-6">
              <div className="absolute right-0 top-0 h-48 w-48 opacity-[0.12] mix-blend-multiply pointer-events-none translate-x-4 -translate-y-4">
                <ShoppingBag strokeWidth={1} className="h-full w-full text-blue-300 transform -rotate-12" />
              </div>
              <div className="relative z-10">
                <h3 className="mb-5 flex items-center gap-2 text-[17px] font-extrabold text-[#111827] dark:text-slate-300">
                  <ClipboardList className="h-5 w-5 text-blue-600" />
                  Cart Summary
                </h3>
                <div className="mb-5 space-y-2 border-b border-blue-200/40 pb-4 border-dashed dark:border-slate-700">
                  <div className="flex items-center justify-between text-[15px]">
                    <span className="font-medium text-slate-600 dark:text-slate-400">Items</span>
                    <span className="font-bold text-slate-900 dark:text-white">{cartTotals.items}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[17px] font-extrabold text-[#111827] dark:text-white">Total Amount</span>
                  <span className="text-[22px] font-black text-[#059669] dark:text-green-400">
                    {formatCurrency(cartTotals.subtotal)}
                  </span>
                </div>
              </div>
            </div>

            {recommendations.length > 0 && !loadingRecs ? (
              <div className="mb-6 px-4 sm:px-6">
                <div className="mb-4 flex items-center justify-between rounded-[16px] bg-[#fdf2f8] px-4 py-3 -mx-2 sm:-mx-3">
                   <span className="flex items-center gap-2 text-[15px] font-bold text-[#9f1239]">
                     <Heart className="h-4 w-4 fill-current" />
                     You may also like
                   </span>
                   <ChevronRight className="h-4 w-4 text-[#9f1239]" />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {recommendations.map((rec) => {
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
                        onClick={() => {
                          navigate(`/product/${rec._id}`);
                          closeDrawer();
                        }}
                        className="group overflow-hidden rounded-[16px] bg-white border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-left transition hover:border-[#bfdbfe] dark:border-slate-800"
                      >
                        <div className="aspect-square overflow-hidden bg-slate-50 dark:bg-slate-800">
                          {recImage ? (
                            <img loading="lazy" decoding="async" src={recImage}
                              alt={rec?.name || "Recommended product"}
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
                            />
                          ) : null}
                        </div>
                        <div className="p-3">
                          <p className="line-clamp-1 text-[13px] font-bold text-[#111827] dark:text-white">
                            {rec?.name || "Product"}
                          </p>
                          <p className="mt-1 text-sm font-black text-[#3730A3] dark:text-blue-400">
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

          <div className="flex-shrink-0 bg-white">
            <div className="space-y-2 p-4 sm:p-5">
              <div className="flex gap-2">
                <Link
                  to="/cart"
                  onClick={closeDrawer}
                  className="group flex flex-1 items-center justify-center gap-1.5 rounded-[12px] bg-gradient-to-r from-[#a855f7] to-[#6366f1] px-2 py-3 text-[13px] font-bold text-white shadow-[0_4px_16px_rgba(99,102,241,0.25)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <ShoppingBag className="h-4 w-4" />
                  View Cart
                </Link>
    
                <button
                  onClick={closeDrawer}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-[12px] border border-[#c7d2fe] bg-white px-2 py-3 text-[13px] font-bold text-[#3730A3] transition-all hover:bg-[#eef2ff] active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Continue Shop
                </button>
              </div>
  
              <Link
                to="/checkout"
                onClick={closeDrawer}
                className="group flex w-full items-center justify-center gap-2 rounded-[14px] bg-[#10b981] bg-gradient-to-r from-[#22c55e] to-[#10b981] px-4 py-3 text-[15px] font-extrabold text-white shadow-[0_4px_16px_rgba(16,185,129,0.25)] transition-all hover:scale-[1.01] active:scale-[0.98]"
              >
                <ShieldCheck className="h-4 w-4" />
                Checkout Now
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </aside>

        <InlineToast toast={toast} onClose={clearToast} />
      </>
    </Portal>
  );
}
