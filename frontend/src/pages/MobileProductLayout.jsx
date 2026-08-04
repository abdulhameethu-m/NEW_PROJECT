/* eslint-disable no-unused-vars */
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, ChevronDown, ChevronUp, Star } from "lucide-react";
 
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
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-4 text-left font-semibold text-slate-900 transition-colors dark:text-white"
      >
        <span className="text-base">{title}</span>
        {isOpen ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-[2000px] pb-4 opacity-100" : "max-h-0 opacity-0"
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
    const newIndex = Math.round(scrollLeft / width);
    if (newIndex !== activeIndex) {
      setActiveIndex(newIndex);
    }
  };

  const scrollTo = (index) => {
    if (!scrollRef.current) return;
    const width = scrollRef.current.clientWidth;
    scrollRef.current.scrollTo({ left: width * index, behavior: "smooth" });
  };

  if (!media || media.length === 0) {
    return <div className="flex aspect-square w-full items-center justify-center bg-slate-100 dark:bg-slate-800"><span className="text-slate-400">No image</span></div>;
  }

  return (
    <div className="flex flex-col">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="hide-scrollbar flex aspect-[4/5] w-full snap-x snap-mandatory overflow-x-auto bg-slate-50 dark:bg-slate-900"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {media.map((img, i) => (
          <div key={i} className="min-w-full shrink-0 snap-center">
            <img loading="lazy" decoding="async" src={img.url} alt={img.altText || `Product Image ${i + 1}`} className="h-full w-full object-contain mix-blend-multiply dark:mix-blend-normal" loading={i === 0 ? "eager" : "lazy"} />
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5">
        {media.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${activeIndex === i ? "w-4 bg-slate-800 dark:bg-slate-200" : "w-1.5 bg-slate-300 dark:bg-slate-700"}`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      {media.length > 1 && (
        <div className="hide-scrollbar mt-3 flex w-full gap-2 overflow-x-auto px-4 pb-2" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {media.map((img, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${activeIndex === i ? "border-slate-800 dark:border-slate-200" : "border-transparent"}`}
            >
              <img loading="lazy" decoding="async" src={img.url} alt={`Thumbnail ${i + 1}`} className="h-full w-full object-cover" />
              {activeIndex !== i && <div className="absolute inset-0 bg-white/40 dark:bg-black/40" />}
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
}) {
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (loading && !product) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800 dark:border-slate-800 dark:border-t-slate-200" />
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="flex h-screen flex-col items-center justify-center space-y-4 bg-slate-50 p-6 dark:bg-slate-950">
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
        <button onClick={() => navigate(-1)} className="rounded-xl bg-[color:var(--commerce-accent)] px-6 py-3 font-semibold text-white">Go Back</button>
      </div>
    );
  }

  const averageRating = product?.ratings?.averageRating || 0;
  const reviewCount = product?.ratings?.totalReviews || 0;
  const soldCount = product?.salesCount || 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-[100px] text-slate-900 dark:bg-slate-950 dark:text-slate-100 relative">

      <AnimatePresence>
        {error ? (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed left-1/2 top-4 z-50 w-[90%] max-w-sm -translate-x-1/2 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-medium text-rose-800 shadow-xl"
          >
            {error}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Gallery Section */}
      <section className="bg-white pb-4 dark:bg-slate-900">
        <MobileGallery media={media} />
      </section>

      {/* Title & Pricing Section */}
      <section className="mt-2 bg-white p-4 dark:bg-slate-900">
        <div className="space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-[color:var(--commerce-accent)]">{product.brand || product.category}</div>
          <h1 className="text-xl font-bold leading-tight text-slate-900 dark:text-white">{product.name}</h1>
        </div>

        {(averageRating > 0 || soldCount > 0) && (
          <div className="mt-3 flex items-center gap-3 text-sm">
            {averageRating > 0 && (
              <div className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                <Star className="h-3.5 w-3.5 fill-current" />
                <span>{averageRating.toFixed(1)}</span>
                <span className="font-medium opacity-80">({reviewCount})</span>
              </div>
            )}
            {soldCount > 0 && (
              <div className="text-slate-500 dark:text-slate-400">
                {soldCount}+ sold
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex items-end justify-between">
          <div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">{formatCurrency(pricing.salePrice)}</span>
              {pricing.hasDiscount && (
                <span className="mb-1 text-base font-medium text-slate-400 line-through">{formatCurrency(pricing.price)}</span>
              )}
            </div>
            {pricing.hasDiscount && (
              <div className="mt-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                You save {formatCurrency(pricing.amountSaved)} (Inclusive of all taxes)
              </div>
            )}
          </div>
          {pricing.hasDiscount && (
            <div className="flex flex-col items-center justify-center rounded-xl bg-rose-100 px-3 py-1 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400">
              <span className="text-lg font-black leading-none">{pricing.discountPercent}%</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">OFF</span>
            </div>
          )}
        </div>
      </section>

      {/* Variant Selector */}
      {variantGroups && variantGroups.length > 0 && (
        <section className="mt-2 bg-white p-4 dark:bg-slate-900">
          <div className="space-y-5">
            {variantGroups.map((group) => (
              <div key={group.key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 dark:text-white">{group.name}</h3>
                  <span className="text-sm font-medium text-[color:var(--commerce-accent)]">{selectedAttributes?.[group.key]}</span>
                </div>
                <div className="hide-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
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
                        className={`relative flex h-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 px-5 font-semibold transition-all active:scale-95 ${isSelected
                          ? "border-[color:var(--commerce-accent)] bg-blue-50 text-[color:var(--commerce-accent)] dark:border-[color:var(--commerce-accent)] dark:bg-blue-900/20"
                          : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          } ${disabled ? "opacity-40" : ""}`}
                      >
                        {showSwatch && (
                          <span
                            className="mr-2 block h-5 w-5 rounded-full border border-black/10 shadow-inner"
                            style={{ backgroundColor: swatchColor || "#e2e8f0" }}
                          />
                        )}
                        {option.value}
                        {isSelected && (
                          <span className="absolute -bottom-1 -right-1 block h-4 w-4 rotate-45 bg-[color:var(--commerce-accent)]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}



      {/* Description & Specs Accordion */}
      <section className="mt-2 bg-white px-4 py-2 dark:bg-slate-900">
        <Accordion title="Product Description" defaultOpen={false}>
          <div className="prose prose-sm max-w-none text-slate-600 dark:prose-invert dark:text-slate-400">
            <p>{product.description}</p>
            {product.shortDescription && <p>{product.shortDescription}</p>}
          </div>
        </Accordion>

        {moduleTabs && moduleTabs.length > 0 && moduleTabs.map((tab) => (
          <Accordion key={tab.key} title={tab.label}>
            <div className="grid gap-y-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
              {(tab.fields || [])
                .filter((field) => tab.values[field.key] !== undefined && tab.values[field.key] !== "")
                .map((field) => (
                  <div key={field.key} className="flex flex-col text-sm sm:flex-row sm:justify-between">
                    <span className="font-medium text-slate-500 dark:text-slate-400">{field.name}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{formatFieldValue(tab.values[field.key])}</span>
                  </div>
                ))}
            </div>
          </Accordion>
        ))}
      </section>

      {/* Store Info */}
      {product?.sellerId && (
        <section className="mt-2 bg-white p-4 dark:bg-slate-900">
          <h3 className="mb-4 font-bold text-slate-900 dark:text-white">Sold By</h3>
          <SellerCard seller={product?.sellerId} compact />
        </section>
      )}

      {/* Recommendations */}
      <section className="mt-2 space-y-2 bg-slate-50 pb-6 dark:bg-slate-950">
        <div className="bg-white py-6 pl-4 dark:bg-slate-900">
          <RecommendationSection
            title="Frequently Bought Together"
            items={visibleFbtBundle || []}
            layout="carousel"
            recommendationType="bundle"
            surface="product_page"
            sourceProductId={product._id}
            loading={recommendationsLoading}
            showEmptyState
          />
        </div>
        <div className="bg-white py-6 pl-4 dark:bg-slate-900">
          <RecommendationSection
            title="Related Products"
            items={recommendations?.related || []}
            layout="carousel"
            recommendationType="related"
            surface="product_page"
            sourceProductId={product._id}
            loading={recommendationsLoading}
            showEmptyState
          />
        </div>
      </section>

      {/* Sticky Bottom Actions Bar */}
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] dark:bg-slate-900 dark:shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3">
          <button
            onClick={handleWishlistToggle}
            disabled={wishlistLoading}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-slate-200 bg-white text-slate-600 transition-all active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <Heart className={`h-6 w-6 ${wishlistSaved ? "fill-rose-500 text-rose-500" : ""}`} />
          </button>

          <button
            disabled={stock === 0 || adding}
            onClick={() => handleAddToCart()}
            className="flex h-14 flex-1 items-center justify-center rounded-2xl bg-slate-900 font-bold text-white transition-all active:scale-95 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
          >
            {adding ? "Adding..." : stock === 0 ? "Out of Stock" : "Add to Cart"}
          </button>

          <button
            disabled={stock === 0 || adding}
            onClick={() => handleAddToCart("/checkout")}
            className="flex h-14 flex-1 items-center justify-center rounded-2xl bg-[color:var(--commerce-accent)] font-bold text-white transition-all active:scale-95 disabled:opacity-50"
          >
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
}
