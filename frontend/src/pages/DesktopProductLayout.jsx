import { Link } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import { ProductImageGallery } from "../components/ProductImageGallery";
import { ProductReviewsSection } from "../components/ProductReviewsSection";
import { RecommendationSection } from "../components/RecommendationSection";
import { formatCurrency } from "../utils/formatCurrency";
import { SellerCard, SellerNameLink, StoreRatingDisplay } from "../components/seller/SellerNavigation";

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

 
import { motion, AnimatePresence } from "framer-motion";

export function DesktopProductLayout({
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
  if (loading && !product) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">Loading product...</div>;
  }

  if (error && !product) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Product</h1>
          <BackButton fallbackTo="/shop" />
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
        <Link to="/shop" className="inline-flex rounded-lg bg-[color:var(--commerce-accent)] px-4 py-2 text-sm font-semibold text-white">Browse products</Link>
      </div>
    );
  }

  return (
    <div className="py-6 pb-16 relative">
      <div className="mx-auto max-w-[1150px] px-4 lg:px-8">
      <AnimatePresence>
        {/** Error toast **/}
        {error ? (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed left-1/2 top-24 z-50 w-[90%] max-w-2xl -translate-x-1/2 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm font-medium text-rose-800 shadow-xl"
          >
            {error}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="mb-4 flex justify-end">
        <BackButton fallbackTo="/shop" />
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] items-start">
        {/* LEFT COLUMN: Gallery */}
        <div className="space-y-8">
          <ProductImageGallery media={media} productName={product?.name} galleryKey={galleryKey} />
        </div>

        {/* RIGHT COLUMN: Product Info & Actions */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-24">
          
          {/* Badges / Header block */}
          <div className="flex flex-wrap items-center gap-2">
             <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-slate-700 dark:bg-slate-800 dark:text-slate-300">
               {product.category}
             </span>
             {stock > 0 ? (
               <span className="rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-xs font-bold uppercase tracking-widest dark:bg-emerald-900/40 dark:text-emerald-300">
                 In stock
               </span>
             ) : (
               <span className="rounded-full bg-rose-100 text-rose-800 px-3 py-1 text-xs font-bold uppercase tracking-widest dark:bg-rose-900/40 dark:text-rose-300">
                 Out of stock
               </span>
             )}
             {returnRule && (
               <>
                 {returnRule.ruleType === "no_return" ? (
                   <span className="flex items-center rounded-full bg-rose-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-rose-700 border border-rose-200 dark:bg-rose-900/30 dark:border-rose-800/50 dark:text-rose-300">
                     <svg className="mr-1.5 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                     No Return
                   </span>
                 ) : returnRule.ruleType === "returnable" ? (
                   <span className="flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:border-blue-800/50 dark:text-blue-300">
                     <svg className="mr-1.5 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                     {returnRule.returnDays} Days Return
                   </span>
                 ) : null}
               </>
             )}
          </div>

          <div className="space-y-1.5">
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white leading-tight">
              {product.name}
            </h1>
            
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <SellerNameLink seller={product?.sellerId} />
              {product?.sellerId?.rating || product?.ratings?.averageRating ? (
                 <StoreRatingDisplay seller={product?.sellerId} rating={product?.sellerId?.rating || product?.ratings?.averageRating} />
              ) : null}
            </div>
          </div>

          {/* Pricing Block */}
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-end gap-2">
              <div className="text-4xl font-black tracking-tight text-slate-950 dark:text-white">
                {formatCurrency(pricing.salePrice)}
              </div>
              {pricing.hasDiscount && (
                <div className="pb-1 text-xl font-medium text-slate-400 line-through dark:text-slate-500">
                  {formatCurrency(pricing.price)}
                </div>
              )}
              {pricing.hasDiscount && (
                <div className="ml-2 mb-1 shrink-0 rounded bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
                  Save {pricing.discountPercent}%
                </div>
              )}
            </div>
            {pricing.hasDiscount && (
               <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                 You save {formatCurrency(pricing.amountSaved)}
               </div>
            )}
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* Variants */}
          {variantGroups.length > 0 && (
            <div className="space-y-4">
              {variantGroups.map((group) => (
                <div key={group.key} className="space-y-2">
                  <div className="text-[15px] font-bold text-slate-950 dark:text-white">
                    {group.name}
                  </div>
                  <div className="flex flex-wrap gap-2.5">
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
                      
                      if (showSwatch && swatchColor) {
                         return (
                           <button
                             key={option.value}
                             type="button"
                             disabled={disabled}
                             onClick={() => selectVariantValue(group.key, option.value)}
                             className={`group relative flex items-center justify-center rounded-full transition-all ${
                               disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer hover:scale-105"
                             }`}
                             title={option.inStock ? option.value : `${option.value} is out of stock`}
                           >
                             <span 
                               className={`h-9 w-9 rounded-full shadow-sm ring-2 ${
                                 isSelected ? "ring-slate-950 dark:ring-white scale-110" : "ring-transparent group-hover:ring-slate-300"
                               } border ${swatchColor.toLowerCase() === "#ffffff" || swatchColor.toLowerCase() === "#f8fafc" ? "border-slate-200" : "border-transparent"}`}
                               style={{ backgroundColor: swatchColor }} 
                               aria-hidden="true" 
                             />
                           </button>
                         )
                      }
                      
                      return (
                        <button
                          key={option.value}
                          type="button"
                          disabled={disabled}
                          onClick={() => selectVariantValue(group.key, option.value)}
                          className={`rounded-xl border px-5 py-2.5 text-sm font-bold transition-all ${
                            isSelected
                              ? "border-slate-950 bg-slate-950 text-white shadow-md dark:border-white dark:bg-white dark:text-slate-950"
                              : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600"
                          } ${disabled ? "cursor-not-allowed opacity-40 shadow-none hover:border-slate-300 hover:bg-white" : ""}`}
                          title={option.inStock ? option.value : `${option.value} is out of stock`}
                        >
                          {option.value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Current Selection Summary */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
            <div className="font-semibold text-slate-950 dark:text-white">
              {activeVariant?.title || "Standard configuration"}
            </div>
            <div className="mt-1 flex flex-col gap-0.5">
              <div>{stock > 0 ? `${stock} units ready to dispatch.` : "Currently unavailable."}</div>
              {productWeightLabel && <div>Weight: {productWeightLabel}</div>}
              <div>SKU: {activeVariant?.sku || product.productNumber || product.SKU}</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={stock === 0 || adding}
                onClick={() => handleAddToCart()}
                className="flex items-center justify-center rounded-xl bg-slate-950 px-4 py-3.5 text-[15px] font-bold text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
              >
                {adding ? "Adding..." : "Add to Cart"}
              </button>
              
              <button
                type="button"
                disabled={stock === 0 || adding}
                onClick={() => handleAddToCart("/checkout")}
                className="flex items-center justify-center rounded-xl bg-rose-500 px-4 py-3.5 text-[15px] font-bold text-white transition-all hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Buy Now
              </button>
            </div>
            
            <button
              type="button"
              disabled={stock === 0 || wishlistLoading}
              onClick={handleWishlistToggle}
              className="flex w-full items-center justify-center rounded-xl border-2 border-slate-200 bg-transparent px-4 py-3.5 text-[15px] font-bold text-slate-900 transition-all hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-white dark:hover:bg-slate-900"
            >
               ♡ {stock === 0 ? "Out of Stock" : wishlistLoading ? "Updating..." : wishlistSaved ? "Saved to Wishlist" : "Save to Wishlist"}
            </button>
          </div>

        </div>
      </div>

      {/* Tabs and Description */}
      <section className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 md:p-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-5 py-2 text-sm font-bold transition-all ${
                activeTab === tab.key
                  ? "bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="prose prose-slate prose-sm md:prose-base dark:prose-invert max-w-none">
          {activeTab === "description" ? (
            <div className="space-y-4 text-slate-700 dark:text-slate-300">
              <p className="whitespace-pre-wrap">{product.description}</p>
              {product.shortDescription && <p className="text-slate-500 font-medium">{product.shortDescription}</p>}
            </div>
          ) : null}

          {moduleTabs
            .filter((tab) => tab.key === activeTab)
            .map((tab) => (
              <div key={tab.key} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(tab.fields || [])
                  .filter((field) => tab.values[field.key] !== undefined && tab.values[field.key] !== "")
                  .map((field) => (
                    <div key={field.key} className="flex flex-col gap-1 rounded-xl border border-slate-100 p-4 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30">
                      <div className="font-bold text-slate-900 dark:text-white uppercase tracking-wide text-xs">{field.name}</div>
                      <div className="text-slate-700 dark:text-slate-300">{formatFieldValue(tab.values[field.key])}</div>
                    </div>
                  ))}
              </div>
            ))}
        </div>
      </section>
    </div>

      <div className="mx-auto w-full max-w-[1600px] px-4 lg:px-8 mt-16 space-y-12">
        <ProductReviewsSection productId={product._id} product={product} />
        <RecommendationSection
          title="Frequently Bought Together"
          items={visibleFbtBundle || []}
          layout="carousel"
          recommendationType="bundle"
          surface="product_page"
          sourceProductId={product._id}
          loading={recommendationsLoading}
          showEmptyState
          fullWidth
        />
        <RecommendationSection
          title="Featured Products"
          items={recommendations?.featured || recommendations?.upsell || []}
          layout="featured"
          recommendationType="featured"
          surface="product_page"
          sourceProductId={product._id}
          featuredHeroPosition="left"
          loading={recommendationsLoading}
          showEmptyState
          fullWidth
        />
        <RecommendationSection
          title="Trending Products"
          items={recommendations?.trending || []}
          layout="grid"
          recommendationType="trending"
          surface="product_page"
          sourceProductId={product._id}
          loading={recommendationsLoading}
          showEmptyState
          fullWidth
        />
        <RecommendationSection
          title="Related Products"
          items={recommendations?.related || []}
          layout="grid"
          recommendationType="related"
          surface="product_page"
          sourceProductId={product._id}
          loading={recommendationsLoading}
          showEmptyState
          fullWidth
        />
      </div>
    </div>
  );
}
