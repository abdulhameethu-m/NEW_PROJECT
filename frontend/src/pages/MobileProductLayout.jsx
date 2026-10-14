/* eslint-disable no-unused-vars */
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Share2,
  Heart,
  ChevronDown,
  ChevronUp,
  Star,
  Truck,
  ShieldCheck,
  RefreshCw,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "../utils/formatCurrency";
import { SellerCard } from "../components/seller/SellerNavigation";
import { RecommendationSection } from "../components/RecommendationSection";

function formatFieldValue(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value ?? "");
}

function resolveSwatchColor(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.startsWith("#")) return normalized;

  const swatchMap = {
    black: "#111827", white: "#f8fafc", red: "#dc2626", blue: "#2563eb",
    green: "#16a34a", yellow: "#facc15", orange: "#f97316", purple: "#7c3aed",
    violet: "#8b5cf6", pink: "#ec4899", gray: "#6b7280", grey: "#6b7280",
    silver: "#cbd5e1", gold: "#d4af37", navy: "#1e3a8a", brown: "#92400e",
    beige: "#d6d3d1", cream: "#f5f5dc", maroon: "#7f1d1d", teal: "#0f766e",
  };

  return swatchMap[normalized] || null;
}

function isVisualSwatchGroup(group, displayType) {
  const key = String(group?.key || "").toLowerCase();
  const name = String(group?.name || "").toLowerCase();
  return displayType === "swatch" || displayType === "image-swatch" || key.includes("color") || name.includes("color");
}

function Accordion({ title, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-100 last:border-0 dark:border-slate-800">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-2.5 text-left text-xs font-bold uppercase tracking-wider text-slate-800 transition-colors dark:text-slate-200"
      >
        <span>{title}</span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          isOpen ? "max-h-[1200px] pb-3 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function MobileGallery({ media }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef(null);

  const handleScroll = (e) => {
    if (!scrollRef.current) return;
    const scrollLeft = e.target.scrollLeft;
    const width = e.target.clientWidth;
    if (width > 0) {
      const newIndex = Math.round(scrollLeft / width);
      if (newIndex !== activeIndex) {
        setActiveIndex(newIndex);
      }
    }
  };

  const scrollTo = (index) => {
    if (!scrollRef.current) return;
    const width = scrollRef.current.clientWidth;
    scrollRef.current.scrollTo({ left: width * index, behavior: "smooth" });
  };

  if (!media || media.length === 0) {
    return (
      <div className="flex h-56 w-full items-center justify-center bg-slate-50 dark:bg-slate-900">
        <span className="text-xs text-slate-400">No image available</span>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
      {/* Scrollable Gallery Container with fixed compact height */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="hide-scrollbar flex h-[280px] sm:h-[320px] w-full snap-x snap-mandatory overflow-x-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {media.map((img, i) => (
          <div key={i} className="min-w-full h-full shrink-0 snap-center flex items-center justify-center p-2">
            <img
              decoding="async"
              src={img.url}
              alt={img.altText || `Product Image ${i + 1}`}
              className="max-h-full max-w-full object-contain rounded-lg drop-shadow-xs"
              loading={i === 0 ? "eager" : "lazy"}
            />
          </div>
        ))}
      </div>

      {/* Counter Pill in bottom right corner */}
      {media.length > 1 && (
        <div className="absolute bottom-2.5 right-3 rounded-full bg-slate-950/70 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold text-white shadow-xs">
          {activeIndex + 1} / {media.length}
        </div>
      )}

      {/* Dots Indicator */}
      {media.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 pb-2.5 pt-1">
          {media.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollTo(i)}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                activeIndex === i
                  ? "w-4 bg-slate-800 dark:bg-slate-200"
                  : "w-1.5 bg-slate-300 dark:bg-slate-700"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Thumbnail strip if multiple images */}
      {media.length > 1 && (
        <div
          className="hide-scrollbar flex w-full gap-1.5 overflow-x-auto px-3 pb-2.5"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {media.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollTo(i)}
              className={`relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border-2 bg-white transition-all dark:bg-slate-800 ${
                activeIndex === i
                  ? "border-slate-900 dark:border-white shadow-xs"
                  : "border-slate-200 opacity-60 dark:border-slate-700"
              }`}
            >
              <img
                loading="lazy"
                decoding="async"
                src={img.url}
                alt={`Thumbnail ${i + 1}`}
                className="h-full w-full object-contain p-0.5"
              />
            </button>
          ))}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `.hide-scrollbar::-webkit-scrollbar { display: none; }` }} />
    </div>
  );
}

export function MobileProductLayout({
  loading,
  error,
  product,
  media,
  galleryKey,
  stock,
  pricing,
  activeVariant,
  productWeightLabel,
  variantGroups,
  selectedAttributes,
  variants,
  variantDefsByKey,
  selectVariantValue,
  tabs,
  activeTab,
  setActiveTab,
  moduleTabs,
  adding,
  handleAddToCart,
  handleWishlistToggle,
  wishlistLoading,
  wishlistSaved,
  visibleFbtBundle,
  recommendations,
  recommendationsLoading,
  returnRule,
}) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name || "Product",
          url: window.location.href,
        });
      } catch {
        // User cancelled share
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback
      }
    }
  };

  if (loading && !product) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-7 w-7 animate-spin rounded-full border-3 border-slate-200 border-t-slate-800 dark:border-slate-800 dark:border-t-slate-200" />
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="flex h-screen flex-col items-center justify-center space-y-3 bg-slate-50 p-6 text-center dark:bg-slate-950">
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
          {error}
        </div>
        <button
          onClick={() => navigate(-1)}
          className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white"
        >
          Go Back
        </button>
      </div>
    );
  }

  const averageRating = product?.ratings?.averageRating || 0;
  const reviewCount = product?.ratings?.totalReviews || 0;
  const soldCount = product?.salesCount || 0;

  return (
    <div className="bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Toast Notification for Error or Copied link */}
      <AnimatePresence>
        {copied && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed left-1/2 top-4 z-50 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg dark:bg-white dark:text-slate-900"
          >
            <Check className="h-3.5 w-3.5 text-emerald-400 dark:text-emerald-600" />
            <span>Link copied to clipboard</span>
          </motion.div>
        )}
        {error ? (
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="fixed left-1/2 top-4 z-50 w-[90%] max-w-sm -translate-x-1/2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-800 shadow-xl"
          >
            {error}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Top Mobile Bar: Back Navigation, Category & Share */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          {product?.category && (
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              {product.category}
            </span>
          )}
          <button
            type="button"
            onClick={handleShare}
            aria-label="Share product"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 active:scale-95"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Compact Gallery */}
      <MobileGallery media={media} />

      {/* Product Information Card */}
      <section className="border-b border-slate-100 bg-white p-3.5 sm:p-4 dark:border-slate-800 dark:bg-slate-900">
        {/* Badges row: Category, Stock & Return */}
        <div className="flex flex-wrap items-center gap-1.5">
          {product?.category && (
            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {product.category}
            </span>
          )}
          {stock > 0 ? (
            <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              In stock
            </span>
          ) : (
            <span className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
              Out of stock
            </span>
          )}
          {returnRule && (
            <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              {returnRule.ruleType === "no_return" ? "No Return" : `${returnRule.returnDays} Days Return`}
            </span>
          )}
        </div>

        {/* Product Title */}
        <h1 className="mt-1.5 text-base sm:text-lg font-bold leading-snug text-slate-900 dark:text-white">
          {product?.name}
        </h1>

        {/* Rating and Sales count */}
        {(averageRating > 0 || soldCount > 0) && (
          <div className="mt-1.5 flex items-center gap-2 text-xs">
            {averageRating > 0 && (
              <div className="flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                <Star className="h-3 w-3 fill-current text-amber-500" />
                <span>{averageRating.toFixed(1)}</span>
                <span className="font-normal text-slate-400">({reviewCount})</span>
              </div>
            )}
            {soldCount > 0 && (
              <span className="text-slate-500 dark:text-slate-400">
                {soldCount}+ sold
              </span>
            )}
          </div>
        )}

        {/* Pricing Row */}
        <div className="mt-2.5 flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {formatCurrency(pricing.salePrice)}
            </span>
            {pricing.hasDiscount && (
              <span className="text-xs text-slate-400 line-through">
                {formatCurrency(pricing.price)}
              </span>
            )}
            {pricing.hasDiscount && (
              <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
                {pricing.discountPercent}% OFF
              </span>
            )}
          </div>
        </div>
        {pricing.hasDiscount && (
          <p className="mt-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            You save {formatCurrency(pricing.amountSaved)} (Inclusive of all taxes)
          </p>
        )}
      </section>

      {/* Trust & Guarantee Strip */}
      <section className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 bg-white py-2.5 text-center dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col items-center px-1">
          <Truck className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
          <span className="mt-1 text-[11px] font-semibold text-slate-800 dark:text-slate-200">Fast Delivery</span>
          <span className="text-[9px] text-slate-400">Direct to doorstep</span>
        </div>
        <div className="flex flex-col items-center px-1">
          <ShieldCheck className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
          <span className="mt-1 text-[11px] font-semibold text-slate-800 dark:text-slate-200">100% Genuine</span>
          <span className="text-[9px] text-slate-400">Quality assured</span>
        </div>
        <div className="flex flex-col items-center px-1">
          <RefreshCw className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
          <span className="mt-1 text-[11px] font-semibold text-slate-800 dark:text-slate-200">Easy Returns</span>
          <span className="text-[9px] text-slate-400">Hassle-free policy</span>
        </div>
      </section>

      {/* Variant Selector (Colors, Sizes, etc.) */}
      {variantGroups && variantGroups.length > 0 && (
        <section className="border-b border-slate-100 bg-white p-3.5 sm:p-4 dark:border-slate-800 dark:bg-slate-900 space-y-3">
          {variantGroups.map((group) => (
            <div key={group.key} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  {group.name}
                </span>
                <span className="font-bold text-slate-600 dark:text-slate-400">
                  {selectedAttributes?.[group.key]}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {group.values.map((option) => {
                  const isSelected = selectedAttributes?.[group.key] === option.value;
                  const hasMatchingVariant = variants.some((variant) => {
                    if (variant?.attributes?.[group.key] !== option.value) return false;
                    return Object.entries(selectedAttributes || {}).every(([key, value]) =>
                      key === group.key ? true : !value || variant?.attributes?.[key] === value
                    );
                  });
                  const displayType = variantDefsByKey[group.key]?.variantConfig?.displayType || "button";
                  const showSwatch = isVisualSwatchGroup(group, displayType);
                  const swatchColor = resolveSwatchColor(option.value);
                  const disabled = !hasMatchingVariant;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => selectVariantValue(group.key, option.value)}
                      className={`relative flex h-8 min-w-8 items-center justify-center rounded-lg border px-2.5 text-xs font-semibold transition active:scale-95 ${
                        isSelected
                          ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900 shadow-xs"
                          : "border-slate-200 bg-slate-50/50 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      } ${disabled ? "opacity-30 cursor-not-allowed" : ""}`}
                    >
                      {showSwatch && (
                        <span
                          className="mr-1.5 h-3.5 w-3.5 rounded-full border border-black/10"
                          style={{ backgroundColor: swatchColor || "#e2e8f0" }}
                        />
                      )}
                      <span>{option.value}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Description & Specs Accordion */}
      <section className="border-b border-slate-100 bg-white px-3.5 py-1 dark:border-slate-800 dark:bg-slate-900">
        <Accordion title="Product Description" defaultOpen={false}>
          <div className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 space-y-2">
            <p>{product?.description}</p>
            {product?.shortDescription && <p>{product.shortDescription}</p>}
          </div>
        </Accordion>

        {moduleTabs && moduleTabs.length > 0 && moduleTabs.map((tab) => (
          <Accordion key={tab.key} title={tab.label}>
            <div className="grid gap-y-2 rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800/50">
              {(tab.fields || [])
                .filter((field) => tab.values[field.key] !== undefined && tab.values[field.key] !== "")
                .map((field) => (
                  <div key={field.key} className="flex justify-between">
                    <span className="font-medium text-slate-500 dark:text-slate-400">{field.name}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{formatFieldValue(tab.values[field.key])}</span>
                  </div>
                ))}
            </div>
          </Accordion>
        ))}
      </section>

      {/* Store / Seller Card */}
      {product?.sellerId && (
        <section className="border-b border-slate-100 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Sold By
          </h3>
          <SellerCard seller={product?.sellerId} compact />
        </section>
      )}

      {/* Recommendations - Only rendered when items actually exist, avoiding empty space */}
      {((visibleFbtBundle && visibleFbtBundle.length > 0) || (recommendations?.related && recommendations?.related.length > 0)) && (
        <section className="space-y-2 bg-slate-50 pt-2 pb-4 dark:bg-slate-950">
          {visibleFbtBundle && visibleFbtBundle.length > 0 && (
            <div className="border-b border-slate-100 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
              <RecommendationSection
                title="Frequently Bought Together"
                items={visibleFbtBundle}
                layout="carousel"
                recommendationType="bundle"
                surface="product_page"
                sourceProductId={product._id}
                loading={recommendationsLoading}
                showEmptyState={false}
              />
            </div>
          )}
          {recommendations?.related && recommendations?.related.length > 0 && (
            <div className="border-b border-slate-100 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
              <RecommendationSection
                title="Related Products"
                items={recommendations.related}
                layout="carousel"
                recommendationType="related"
                surface="product_page"
                sourceProductId={product._id}
                loading={recommendationsLoading}
                showEmptyState={false}
              />
            </div>
          )}
        </section>
      )}

      {/* Compact Docked Sticky Bottom Actions Bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/95 px-3 py-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow-lg backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
        <div className="flex items-center gap-2">
          {/* Wishlist Button */}
          <button
            type="button"
            onClick={handleWishlistToggle}
            disabled={wishlistLoading}
            aria-label="Toggle wishlist"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <Heart className={`h-4 w-4 ${wishlistSaved ? "fill-rose-500 text-rose-500" : ""}`} />
          </button>

          {/* Add to Cart Button */}
          <button
            type="button"
            disabled={stock === 0 || adding}
            onClick={() => handleAddToCart()}
            className="flex h-10 flex-1 items-center justify-center rounded-xl bg-slate-900 px-3 text-xs font-bold text-white transition active:scale-95 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
          >
            {adding ? "Adding..." : stock === 0 ? "Out of Stock" : "Add to Cart"}
          </button>

          {/* Buy Now Button */}
          <button
            type="button"
            disabled={stock === 0 || adding}
            onClick={() => handleAddToCart("/checkout")}
            className="flex h-10 flex-1 items-center justify-center rounded-xl bg-orange-600 hover:bg-orange-700 px-3 text-xs font-bold text-white shadow-xs transition active:scale-95 disabled:opacity-50"
          >
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
}
