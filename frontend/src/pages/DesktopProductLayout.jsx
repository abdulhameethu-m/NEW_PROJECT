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

// eslint-disable-next-line no-unused-vars
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
    <div className="space-y-8 pb-28 lg:pb-0 relative">
      <AnimatePresence>
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Home / Shop / <span className="text-slate-700 dark:text-slate-200">{product.category}</span>
          </div>
          <h1 className="mt-2 max-w-4xl text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-3xl">{product.name}</h1>
          <div className="mt-3 flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:items-center">
            <SellerNameLink seller={product?.sellerId} />
            <StoreRatingDisplay seller={product?.sellerId} rating={product?.sellerId?.rating || product?.ratings?.averageRating} />
          </div>
        </div>
        <BackButton fallbackTo="/shop" />
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.95fr)]">
        <div className="space-y-8">
          <ProductImageGallery media={media} productName={product?.name} galleryKey={galleryKey} />

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:bg-slate-800 dark:text-slate-200">{product.category}</span>
                {stock > 0 ? (
                  <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">In stock</span>
                ) : (
                  <span className="rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white">Out of stock</span>
                )}
              </div>
              <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="text-4xl font-black tracking-tight text-slate-950 dark:text-white">{formatCurrency(pricing.salePrice)}</div>
                  {pricing.hasDiscount ? <div className="mt-1 text-sm font-semibold text-slate-500 line-through dark:text-slate-400">{formatCurrency(pricing.price)}</div> : null}
                </div>
                {pricing.hasDiscount ? (
                  <div className="shrink-0 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-2 text-center shadow-lg shadow-orange-500/30">
                    <div className="text-lg font-black text-white">{pricing.discountPercent}%</div>
                    <div className="text-xs font-semibold text-white">OFF</div>
                  </div>
                ) : null}
              </div>
              {pricing.hasDiscount ? <div className="mt-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">You save {formatCurrency(pricing.amountSaved)}</div> : null}

              <div className="mt-5 grid gap-3 rounded-[1.75rem] bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                <div className="font-semibold text-slate-950 dark:text-white">{activeVariant?.title || "Standard product configuration"}</div>
                <div>{stock > 0 ? `${stock} units ready to dispatch.` : "Currently unavailable."}</div>
                {productWeightLabel ? <div>Weight: {productWeightLabel}</div> : null}
                <div>SKU: {activeVariant?.sku || product.productNumber || product.SKU}</div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:hidden">
              {variantGroups.length ? (
                <div className="grid gap-5">
                  {variantGroups.map((group) => (
                    <div key={group.key}>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">{group.name}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
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
                              className={`rounded-2xl border px-4 py-2 text-sm font-medium transition ${
                                isSelected
                                  ? "border-slate-950 bg-slate-950 text-white shadow-sm dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950"
                                  : "border-slate-300 text-slate-700 hover:border-slate-950 hover:shadow-sm dark:border-slate-700 dark:text-slate-200"
                              } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                              title={option.inStock ? option.value : `${option.value} is out of stock`}
                            >
                              {showSwatch ? (
                                <span className="inline-flex items-center gap-2">
                                  <span
                                    className={`h-4 w-4 rounded-full border ${swatchColor && swatchColor.toLowerCase() === "#f8fafc" ? "border-slate-300" : "border-white/50"}`}
                                    style={{ backgroundColor: swatchColor || "#e2e8f0" }}
                                    aria-hidden="true"
                                  />
                                  {option.value}
                                </span>
                              ) : (
                                option.value
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-center gap-3">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      activeTab === tab.key
                        ? "bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="mt-6">
                {activeTab === "description" ? (
                  <div className="space-y-4 text-sm leading-7 text-slate-700 dark:text-slate-200">
                    <p>{product.description}</p>
                    {product.shortDescription ? <p className="text-slate-500 dark:text-slate-400">{product.shortDescription}</p> : null}
                  </div>
                ) : null}

                {moduleTabs
                  .filter((tab) => tab.key === activeTab)
                  .map((tab) => (
                    <div key={tab.key} className="grid gap-3">
                      {(tab.fields || [])
                        .filter((field) => tab.values[field.key] !== undefined && tab.values[field.key] !== "")
                        .map((field) => (
                          <div key={field.key} className="grid gap-1 rounded-2xl border border-slate-200 p-4 text-sm dark:border-slate-800 sm:grid-cols-[180px_minmax(0,1fr)]">
                            <div className="font-semibold text-slate-950 dark:text-white">{field.name}</div>
                            <div className="text-slate-600 dark:text-slate-300">{formatFieldValue(tab.values[field.key])}</div>
                          </div>
                        ))}
                    </div>
                  ))}
              </div>
            </section>
          </div>
        </div>

        <aside className="hidden xl:block xl:sticky xl:top-24 xl:self-start">
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 bg-[linear-gradient(135deg,_rgba(14,165,233,0.14),_rgba(251,191,36,0.12))] p-6 dark:border-slate-800">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">{product.category}</span>
                    {stock > 0 ? (
                      <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">In stock</span>
                    ) : (
                      <span className="rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white">Out of stock</span>
                    )}
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="text-4xl font-black tracking-tight text-slate-950 dark:text-white">{formatCurrency(pricing.salePrice)}</div>
                      {pricing.hasDiscount ? <div className="pb-1 text-lg text-slate-500 line-through dark:text-slate-400">{formatCurrency(pricing.price)}</div> : null}
                    </div>
                    {pricing.hasDiscount ? <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">You save {formatCurrency(pricing.amountSaved)}</div> : null}
                  </div>
                </div>

                {pricing.hasDiscount ? (
                  <div className="shrink-0 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-2 text-center shadow-lg shadow-orange-500/30">
                    <div className="text-lg font-black text-white">{pricing.discountPercent}%</div>
                    <div className="text-xs font-semibold text-white">OFF</div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-5 p-6">
              <SellerCard seller={product?.sellerId} compact />

              {variantGroups.length ? (
                <div className="grid gap-4">
                  {variantGroups.map((group) => (
                    <div key={group.key}>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">{group.name}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
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
                              className={`rounded-2xl border px-4 py-2 text-sm font-medium transition ${
                                isSelected
                                  ? "border-slate-950 bg-slate-950 text-white shadow-sm dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950"
                                  : "border-slate-300 text-slate-700 hover:border-slate-950 hover:shadow-sm dark:border-slate-700 dark:text-slate-200"
                              } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                              title={option.inStock ? option.value : `${option.value} is out of stock`}
                            >
                              {showSwatch ? (
                                <span className="inline-flex items-center gap-2">
                                  <span
                                    className={`h-4 w-4 rounded-full border ${swatchColor && swatchColor.toLowerCase() === "#f8fafc" ? "border-slate-300" : "border-white/50"}`}
                                    style={{ backgroundColor: swatchColor || "#e2e8f0" }}
                                    aria-hidden="true"
                                  />
                                  {option.value}
                                </span>
                              ) : (
                                option.value
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="rounded-[1.5rem] bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                <div className="font-semibold text-slate-950 dark:text-white">Current selection</div>
                <div className="mt-2 grid gap-2">
                  {activeVariant?.title ? <div>{activeVariant.title}</div> : <div>Standard product configuration</div>}
                  <div>{stock > 0 ? `${stock} units ready to dispatch.` : "Currently unavailable."}</div>
                  {productWeightLabel ? <div>Weight: {productWeightLabel}</div> : null}
                  <div>SKU: {activeVariant?.sku || product.productNumber || product.SKU}</div>
                </div>
              </div>

              <div className="grid gap-3">
                <button type="button" disabled={stock === 0 || adding} onClick={() => handleAddToCart()} className="rounded-2xl bg-[color:var(--commerce-accent)] px-5 py-4 text-sm font-semibold text-white shadow-sm transition hover:translate-y-[-1px] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60">
                  {adding ? "Adding to cart..." : "Add to Cart"}
                </button>
                <button type="button" disabled={stock === 0 || adding} onClick={() => handleAddToCart("/checkout")} className="rounded-2xl bg-[color:var(--commerce-accent-warm)] px-5 py-4 text-sm font-semibold text-slate-950 shadow-sm transition hover:translate-y-[-1px] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60">
                  Buy Now
                </button>
                <button type="button" disabled={stock === 0 || wishlistLoading} onClick={handleWishlistToggle} className="rounded-2xl border border-slate-300 bg-white px-5 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800">
                  {stock === 0 ? "Out of Stock" : wishlistLoading ? "Updating..." : wishlistSaved ? "Saved to Wishlist" : "Save to Wishlist"}
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <ProductReviewsSection productId={product._id} product={product} />

      <section className="relative left-1/2 w-screen max-w-none -translate-x-1/2 space-y-6">
        <div className="w-full space-y-6">
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
            title="Featured Products"
            items={recommendations?.featured || recommendations?.personalized || []}
            layout="featured"
            recommendationType="featured"
            surface="product_page"
            sourceProductId={product._id}
            featuredHeroPosition="right"
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
      </section>

      <div className="fixed inset-x-0 bottom-0 z-50 lg:hidden bg-white/95 border-t border-slate-200/80 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-950 dark:text-white">{formatCurrency(pricing.salePrice)}</div>
            {pricing.hasDiscount ? <div className="text-xs text-slate-500 line-through dark:text-slate-400">{formatCurrency(pricing.price)}</div> : null}
          </div>
          <button type="button" disabled={stock === 0 || adding} onClick={() => handleAddToCart()} className="inline-flex items-center justify-center rounded-2xl bg-[color:var(--commerce-accent)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:translate-y-[-1px] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60">
            {adding ? "Adding..." : "Add to Cart"}
          </button>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button type="button" disabled={stock === 0 || adding} onClick={() => handleAddToCart("/checkout")} className="rounded-2xl bg-[color:var(--commerce-accent-warm)] px-4 py-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:translate-y-[-1px] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60">
            Buy Now
          </button>
          <button type="button" disabled={stock === 0 || wishlistLoading} onClick={handleWishlistToggle} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800">
            {stock === 0 ? "Out of Stock" : wishlistLoading ? "Updating..." : wishlistSaved ? "Saved" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
