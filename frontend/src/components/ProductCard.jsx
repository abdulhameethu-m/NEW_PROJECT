/* eslint-disable no-unused-vars */
import { logger } from "../services/logger/logger.js";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import { Heart, ShoppingCart, Star, ChevronLeft, ChevronRight, Truck } from "lucide-react";
import { formatCurrency } from "../utils/formatCurrency";
import { resolveApiAssetUrl } from "../utils/resolveUrl";
import { useCart } from "../hooks/useCart";
import { useCartDrawer } from "../hooks/useCartDrawer";
import { useWishlist } from "../hooks/useWishlist";
import { getCartErrorMessage } from "../utils/cartErrors";
import { extractProductId } from "../utils/cartState";

function reportProductCardError(message, details = {}) {
  const payload = {
    component: "ProductCard",
    message,
    productId: details.productId || "",
    errorMessage: details.error?.message || String(details.error || ""),
    stack: details.error?.stack,
  };

  if (import.meta.env.DEV) {
    logger.error("frontend_error", { error: message, payload });
    return;
  }

  window.dispatchEvent(new CustomEvent("app:error", { detail: payload }));
}

export function ProductCard({ product, cardStyle = "DEFAULT", imageAspectClass = "aspect-square", onProductClick, dense = false }) {
  const navigate = useNavigate();
  const { cart, addItem: addCartItem } = useCart();
  const { openDrawer, showToast } = useCartDrawer();
  const { addItem: addWishlistItem, removeItem: removeWishlistItem, isInWishlist: checkWishlistStatus } = useWishlist();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const productId = useMemo(() => extractProductId(product), [product]);

  // Get all product images
  const allImages = useMemo(() => product?.images?.filter((img) => img?.url) || [], [product?.images]);
  const imageUrl = resolveApiAssetUrl(allImages[currentImageIndex]?.url || allImages[0]?.url || "");
  const hasMultipleImages = allImages.length > 1;

  // Get display settings from product
  const displaySettings = product?.displaySettings || {};
  const enableImageScroll = displaySettings.enableImageScroll !== false;
  const scrollSpeed = displaySettings.imageScrollSpeed || 800;
  const cardType = displaySettings.cardType || "scroll";
  const shouldScroll = enableImageScroll && cardType === "scroll";

  // Auto-cycle through images on hover
  useEffect(() => {
    if (!isHovering || !hasMultipleImages || !shouldScroll) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
    }, scrollSpeed);

    return () => clearInterval(interval);
  }, [isHovering, hasMultipleImages, shouldScroll, allImages.length, scrollSpeed]);

  const hasAvailableVariants = product?.isActive !== false && product?.status !== "REJECTED";
  const availableStock = 999; // Frontend no longer calculates exact inventory

  const discountPercent = product?.discountPrice && product?.price
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0;

  useEffect(() => {
    let active = true;

    async function resolveWishlistStatus() {
      try {
        const status = await checkWishlistStatus(productId);
        if (active) {
          setIsInWishlist(Boolean(status));
        }
      } catch (err) {
        reportProductCardError("Failed to resolve wishlist status.", { productId, error: err });
        if (active) {
          setIsInWishlist(false);
        }
      }
    }

    if (productId) {
      resolveWishlistStatus();
    }

    return () => {
      active = false;
    };
  }, [productId, checkWishlistStatus]);

  const handleWishlist = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      if (isInWishlist) {
        await removeWishlistItem(productId);
        setIsInWishlist(false);
      } else {
        await addWishlistItem(productId, "");
        setIsInWishlist(true);
      }
    } catch (err) {
      reportProductCardError("Failed to update wishlist.", { productId, error: err });
      showToast(getCartErrorMessage(err, "Unable to update wishlist."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddToCart = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (isSubmitting || !productId || !hasAvailableVariants || availableStock <= 0) return;

    try {
      setIsSubmitting(true);
      const result = await addCartItem(productId, 1, ""); // Let backend auto-allocate
      if (result) {
        if (result.message && typeof showToast === "function") {
          showToast(result.message, result.action === "NEXT_VARIANT_ALLOCATED" ? "info" : "success");
        }
        const allocatedVariant = result.addedItem?.variant || result.addedItem || null;
        openDrawer(product, allocatedVariant, result.addedItem?.quantity || 1);
      }
    } catch (err) {
      reportProductCardError("Failed to add product to cart.", { productId, error: err });
      showToast(getCartErrorMessage(err, "Failed to add item to cart."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const styleKey = String(cardStyle || "DEFAULT").toUpperCase();
  const isEditorial = styleKey === "EDITORIAL";
  const cardStyleClass = {
    DEFAULT: "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:shadow-lg dark:hover:shadow-lg dark:hover:shadow-slate-950/50 hover:border-blue-300 dark:hover:border-blue-600",
    ELEVATED: "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl hover:shadow-[0_30px_90px_-45px_rgba(15,23,42,0.35)]",
    MINIMAL: "border border-slate-200/50 dark:border-slate-700/50 bg-white/95 dark:bg-slate-950/80 shadow-none hover:shadow-sm",
    EDITORIAL: "rounded-[2rem] border border-slate-900 bg-slate-950 text-white shadow-2xl ring-1 ring-slate-900/10",
  }[styleKey] || "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:shadow-lg dark:hover:shadow-lg dark:hover:shadow-slate-950/50 transition-all duration-300 hover:border-blue-300 dark:hover:border-blue-600";
  const categoryTextClass = isEditorial
    ? "text-[11px] font-semibold uppercase tracking-wide text-slate-300 line-clamp-1"
    : `text-[11px] font-semibold uppercase tracking-wide ${dense ? "text-slate-500" : "text-slate-500"} dark:text-slate-400 line-clamp-1`;
  const titleTextClass = isEditorial
    ? "line-clamp-2 text-[13px] font-semibold text-white transition group-hover:text-slate-100 leading-tight"
    : `line-clamp-2 ${dense ? "text-[13px]" : "text-sm"} font-semibold text-slate-900 dark:text-white transition group-hover:text-blue-600 dark:group-hover:text-blue-400 leading-tight`;
  const ratingTextClass = isEditorial
    ? "text-xs font-semibold text-slate-100"
    : "text-xs font-semibold text-slate-600 dark:text-slate-400";
  const priceCurrentClass = isEditorial
    ? "text-[16px] font-bold text-white"
    : `${dense ? "text-[16px]" : "text-sm"} font-bold text-slate-900 dark:text-white`;
  const priceOriginalClass = isEditorial
    ? "text-xs text-slate-400 line-through"
    : "text-xs text-slate-500 dark:text-slate-400 line-through";
  const stockClass = isEditorial ? "text-emerald-300" : "text-green-600 dark:text-green-400";
  const stockOutClass = isEditorial ? "text-rose-300" : "text-red-600 dark:text-red-400";
  const inStock = hasAvailableVariants && availableStock > 0;
  const navigateToProduct = async () => {
    if (!productId) return;
    if (onProductClick) {
      await Promise.race([
        Promise.resolve(onProductClick(product)).catch(() => null),
        new Promise((resolve) => window.setTimeout(resolve, 3000)),
      ]);
    }
    navigate(`/product/${productId}`);
  };

  const handleNextImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const handlePrevImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setCurrentImageIndex(0);
  };

  return (
    <Motion.article
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
      onClick={navigateToProduct}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          navigateToProduct();
        }
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="link"
      tabIndex={0}
      className={`group relative flex flex-col h-full overflow-hidden rounded-2xl transition-all duration-300 ${cardStyleClass}`}
      style={{
        background: "var(--theme-product-card-background)",
        borderColor: "var(--theme-product-card-border)"
      }}
    >
      <div
        className={`relative w-full ${imageAspectClass} bg-gradient-to-br from-slate-100 to-white dark:from-slate-900 dark:to-slate-800 overflow-hidden flex-shrink-0`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Product Image */}
        {imageUrl ? (
          <Motion.img
            key={`${product._id}-${currentImageIndex}`}
            src={imageUrl}
            alt={product?.name || "Product image"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="h-full w-full object-cover object-center transition-all duration-300 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Image coming soon
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/10 via-transparent to-white/5 opacity-40 transition duration-500 group-hover:opacity-60" />

        {/* Top Left Discount Ribbon */}
        {discountPercent > 0 && (
          <div 
            className="absolute top-0 left-0 z-10 w-[3.25rem] h-[3.25rem] sm:w-[5rem] sm:h-[5rem] bg-yellow-400"
            style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
          >
            <div className="absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5 flex flex-col items-start">
              <span className="text-[10px] sm:text-[14px] font-extrabold text-blue-950 leading-none">{discountPercent}%</span>
              <span className="text-[7px] sm:text-[10px] font-bold text-blue-950 leading-none mt-0.5">OFF</span>
            </div>
          </div>
        )}
        {product.isNew && discountPercent === 0 && (
          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10">
             <div className="rounded-md bg-orange-500 px-2 py-1 shadow-md">
               <span className="text-[9px] sm:text-[10px] font-bold text-white tracking-wider">NEW</span>
             </div>
          </div>
        )}

        {/* Image Navigation - Visible on Hover */}
        {hasMultipleImages && isHovering && shouldScroll && (
          <>
            {/* Previous Button */}
            <button
              onClick={handlePrevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-50 flex items-center justify-center w-9 h-9 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-lg hover:bg-white dark:hover:bg-slate-700 transition-all duration-200 hover:scale-110"
              aria-label="Previous image"
              tabIndex={-1}
              type="button"
            >
              <ChevronLeft size={18} className="text-slate-700 dark:text-slate-200" />
            </button>

            {/* Next Button */}
            <button
              onClick={handleNextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-50 flex items-center justify-center w-9 h-9 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-lg hover:bg-white dark:hover:bg-slate-700 transition-all duration-200 hover:scale-110"
              aria-label="Next image"
              tabIndex={-1}
              type="button"
            >
              <ChevronRight size={18} className="text-slate-700 dark:text-slate-200" />
            </button>
          </>
        )}

        {/* Premium Vertical Action Stack - Top Right */}
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex flex-col gap-1.5 sm:gap-2 z-10 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 ease-out">
          {/* Wishlist Button */}
          <button
            onClick={handleWishlist}
            disabled={isSubmitting}
            className="flex items-center justify-center w-6 h-6 sm:w-10 sm:h-10 rounded-full bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 transition-all duration-200 disabled:opacity-60"
            title={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
            aria-label={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart
              size={13}
              strokeWidth={1.5}
              className={`transition-all duration-300 ${isInWishlist
                ? "fill-red-500 text-red-500"
                : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
            />
          </button>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={isSubmitting || !productId || !inStock}
            className="flex items-center justify-center w-6 h-6 sm:w-10 sm:h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            title={inStock ? `Add ${product?.name || product?.title || "item"} to cart` : "Out of stock"}
            aria-label={inStock ? `Add ${product?.name || product?.title || "item"} to cart` : "Out of stock"}
            style={{
              background: "var(--theme-product-button-background)",
              color: "var(--theme-product-button-text)"
            }}
          >
            <ShoppingCart size={12} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Product Info Section */}
      <div className={`flex flex-col flex-grow ${dense ? "p-2 gap-1" : "p-2.5 sm:p-3 gap-1"}`}>
        {/* Category & Rating */}
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-bold uppercase tracking-wider text-blue-600 line-clamp-1">
            {product.category || "FEATURED"}
          </p>
          {/* Rating */}
          {product?.ratings?.averageRating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="h-2.5 sm:h-3 w-2.5 sm:w-3 fill-amber-500 text-amber-500" />
              <span className="text-[9px] sm:text-[10px] font-semibold text-slate-600">
                {Number(product.ratings.averageRating).toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* Product Name */}
        <div className="mt-0.5">
          <h3 
            className={`line-clamp-2 text-[13px] sm:text-[14px] font-bold text-slate-900 leading-[1.2] transition group-hover:text-blue-600`}
            title={product.name}
          >
            {product.name}
          </h3>
        </div>

        {/* Pricing */}
        <div className="flex flex-col mt-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[15px] sm:text-[16px] font-extrabold text-slate-900 tracking-tight">
              {formatCurrency(product.discountPrice || product.price)}
            </span>
            {product.discountPrice && (
              <span className="text-[11px] sm:text-[12px] text-slate-400 line-through font-medium">
                {formatCurrency(product.price)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Motion.article>
  );
}
