/* eslint-disable no-unused-vars */
import { logger } from "../services/logger/logger.js";
import { useEffect, useMemo, useState, memo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronUp, Search, LayoutGrid, Layers, ArrowUpDown, Heart, ShoppingCart, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";

import { FilterBottomSheet } from "../components/shop/FilterBottomSheet";
import { useCategories } from "../hooks/useCategories";
import { getSubcategoriesByCategory } from "../services/subcategoryService";
import * as productService from "../services/productService";
import { formatCurrency } from "../utils/formatCurrency";
import { extractProductId } from "../utils/cartState";
import { useCart } from "../hooks/useCart";
import { useCartDrawer } from "../hooks/useCartDrawer";
import { useWishlist } from "../hooks/useWishlist";
import { getCartErrorMessage } from "../utils/cartErrors";
import { SellerNameLink } from "../components/seller/SellerNavigation";
import { ProductCard } from "../components/ProductCard";


const RESERVED_QUERY_KEYS = new Set([
  "category",
  "categoryId",
  "subCategoryId",
  "search",
  "minPrice",
  "maxPrice",
  "sortBy",
  "sortOrder",
  "page",
]);

function toRangeKeys(key) {
  const capitalized = key.charAt(0).toUpperCase() + key.slice(1);
  return {
    minKey: `min${capitalized}`,
    maxKey: `max${capitalized}`,
  };
}

function getCheckboxValues(searchParams, key) {
  const all = searchParams.getAll(key);
  if (all.length > 1) return all;
  if (all.length === 1) {
    return all[0]
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function buildDynamicQueryParams(searchParams) {
  const dynamic = {};
  for (const [key, value] of searchParams.entries()) {
    if (RESERVED_QUERY_KEYS.has(key)) continue;
    dynamic[key] = dynamic[key] ? `${dynamic[key]},${value}` : value;
  }
  return dynamic;
}

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories } = useCategories();

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [isDesktopFilterOpen, setIsDesktopFilterOpen] = useState(false);
  const [filterDefs, setFilterDefs] = useState([]);
  const [facetMap, setFacetMap] = useState({});
  const [subcategories, setSubcategories] = useState([]);

  const category = searchParams.get("category") || "";
  const matchedCategory = categories.find(
    (item) => item._id === searchParams.get("categoryId") || item.name === category
  );
  const categoryId = searchParams.get("categoryId") || matchedCategory?._id || "";
  const subCategoryId = searchParams.get("subCategoryId") || "";
  const search = searchParams.get("search") || "";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") || "desc";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const dynamicParams = useMemo(() => buildDynamicQueryParams(searchParams), [searchParams]);

  useEffect(() => {
    if (!categoryId) {
      setSubcategories([]);
      return;
    }

    let alive = true;
    (async () => {
      try {
        const response = await getSubcategoriesByCategory(categoryId);
        if (!alive) return;
        setSubcategories(Array.isArray(response?.data) ? response.data : []);
      } catch {
        if (alive) setSubcategories([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, [categoryId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const response = await productService.getPublicProductFilters({
          ...(category && { category }),
          ...(categoryId && { categoryId }),
          ...(subCategoryId && { subCategoryId }),
          ...(search && { search }),
          ...dynamicParams,
        });
        if (!alive) return;
        setFilterDefs(Array.isArray(response?.data?.filters) ? response.data.filters : []);
        const nextFacetMap = Object.fromEntries((response?.data?.facets || []).map((facet) => [facet.key, facet]));
        setFacetMap((prev) => ({ ...prev, ...nextFacetMap }));
      } catch {
        if (alive) setFilterDefs([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, [category, categoryId, subCategoryId, search, dynamicParams]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const params = {
          page,
          limit: 12,
          ...(category && { category }),
          ...(categoryId && { categoryId }),
          ...(subCategoryId && { subCategoryId }),
          ...(search && { search }),
          ...(minPrice && { minPrice: Number(minPrice) }),
          ...(maxPrice && { maxPrice: Number(maxPrice) }),
          sortBy,
          sortOrder,
          ...dynamicParams,
        };

        const response = await productService.getPublicProducts(params);
        if (!alive) return;
        setProducts(response?.data?.products || []);
        setPagination(response?.data?.pagination || { total: 0, pages: 1 });
        setFacetMap((prev) => {
          const next = Object.fromEntries(
            (response?.data?.facets || []).map((facet) => [facet.key, facet])
          );
          if (prev.price) {
            next.price = prev.price;
          }
          return { ...prev, ...next };
        });
      } catch (err) {
        if (alive) setError(err?.response?.data?.message || "Failed to load products");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [page, category, categoryId, subCategoryId, search, minPrice, maxPrice, sortBy, sortOrder, dynamicParams]);

  function updateParams(mutator) {
    const next = new URLSearchParams(searchParams);
    mutator(next);
    if (!next.get("page")) next.set("page", "1");
    setSearchParams(next);
  }

  function clearDynamicFilters(next) {
    [...next.keys()].forEach((key) => {
      if (!RESERVED_QUERY_KEYS.has(key)) next.delete(key);
    });
  }

  const appliedFilterChips = useMemo(() => {
    const chips = [];
    if (search) chips.push({ key: "search", label: `Search: ${search}` });
    if (category) chips.push({ key: "category", label: `Category: ${category}` });
    const selectedSubcategory = subcategories.find((item) => item._id === subCategoryId);
    if (selectedSubcategory) chips.push({ key: "subCategoryId", label: `Subcategory: ${selectedSubcategory.name}` });
    if (minPrice || maxPrice) {
      const minStr = minPrice ? formatCurrency(minPrice).replace(/\.00$/, "") : formatCurrency(0).replace(/\.00$/, "");
      const maxStr = maxPrice ? formatCurrency(maxPrice).replace(/\.00$/, "") : "Any";
      chips.push({ key: "price", label: `Price: ${minStr} - ${maxStr}` });
    }

    for (const def of filterDefs) {
      if (["price", "rating"].includes(def.key)) continue;
      if (def.type === "range") {
        const { minKey, maxKey } = toRangeKeys(def.key);
        const min = searchParams.get(minKey);
        const max = searchParams.get(maxKey);
        if (min || max) chips.push({ key: def.key, label: `${def.name}: ${min || 0} - ${max || "Any"}` });
        continue;
      }

      const values = getCheckboxValues(searchParams, def.key);
      if (values.length) chips.push({ key: def.key, label: `${def.name}: ${values.join(", ")}` });
      const singleValue = searchParams.get(def.key);
      if (!values.length && singleValue) chips.push({ key: def.key, label: `${def.name}: ${singleValue}` });
    }

    return chips;
  }, [category, filterDefs, maxPrice, minPrice, search, searchParams, subCategoryId, subcategories]);

  // Handlers for desktop FilterSidebar
  function onCategoryChange(value) {
    updateParams((next) => {
      if (value) {
        const selectedCategory = categories.find((item) => item._id === value);
        next.set("categoryId", value);
        next.set("category", selectedCategory?.name || "");
      } else {
        next.delete("categoryId");
        next.delete("category");
      }
      next.delete("subCategoryId");
      next.delete("minPrice");
      next.delete("maxPrice");
      clearDynamicFilters(next);
      next.set("page", "1");
    });
  }

  function onSubcategoryChange(value) {
    updateParams((next) => {
      if (value) next.set("subCategoryId", value);
      else next.delete("subCategoryId");
      next.delete("minPrice");
      next.delete("maxPrice");
      next.set("page", "1");
    });
  }

  function onSearchChange(value) {
    updateParams((next) => {
      if (value) next.set("search", value);
      else next.delete("search");
      next.delete("minPrice");
      next.delete("maxPrice");
      next.set("page", "1");
    });
  }

  function onPriceChange(nextMin, nextMax) {
    updateParams((next) => {
      if (nextMin !== "" && nextMin !== null && nextMin !== undefined) next.set("minPrice", String(nextMin));
      else next.delete("minPrice");
      if (nextMax !== "" && nextMax !== null && nextMax !== undefined) next.set("maxPrice", String(nextMax));
      else next.delete("maxPrice");
      next.set("page", "1");
    });
  }

  function onSortChange(value) {
    updateParams((next) => {
      next.set("sortBy", value);
      next.set("page", "1");
    });
  }

  function onFilterChange(key, value, type) {
    updateParams((next) => {
      if (type === "checkbox") {
        if (Array.isArray(value)) {
          if (value.length) next.set(key, value.join(","));
          else next.delete(key);
        }
      } else if (type === "range") {
        const minKey = `min${key.charAt(0).toUpperCase() + key.slice(1)}`;
        const maxKey = `max${key.charAt(0).toUpperCase() + key.slice(1)}`;
        if (value && value.min !== undefined) next.set(minKey, String(value.min));
        else next.delete(minKey);
        if (value && value.max !== undefined) next.set(maxKey, String(value.max));
        else next.delete(maxKey);
      } else {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      next.set("page", "1");
    });
  }

  return (
    <div className="min-h-screen transition-colors" style={{ backgroundColor: "var(--theme-background)", color: "var(--theme-text)" }}>
      <div className="px-3 pb-3">


        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{pagination.total} Products</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Compact view for fast browsing</p>
          </div>
          <button
            type="button"
            onClick={() => setFilterSheetOpen(true)}
            className="lg:hidden inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
          >
            <SlidersHorizontal size={16} />
            Filters
          </button>
          <button
            type="button"
            onClick={() => setIsDesktopFilterOpen(prev => !prev)}
            className="hidden lg:inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
          >
            <SlidersHorizontal size={16} />
            Filters
          </button>
        </div>

        {error ? (
          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {appliedFilterChips.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {appliedFilterChips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() =>
                  updateParams((next) => {
                    if (chip.key === "price") {
                      next.delete("minPrice");
                      next.delete("maxPrice");
                    } else if (filterDefs.some((def) => def.key === chip.key && def.type === "range")) {
                      const { minKey, maxKey } = toRangeKeys(chip.key);
                      next.delete(minKey);
                      next.delete(maxKey);
                    } else {
                      next.delete(chip.key);
                    }
                    next.set("page", "1");
                  })
                }
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                {chip.label} ×
              </button>
            ))}
          </div>
        ) : null}

        <FilterBottomSheet
          open={filterSheetOpen}
          onClose={() => setFilterSheetOpen(false)}
          onReset={() => {
            updateParams((next) => {
              next.delete("search");
              next.delete("category");
              next.delete("categoryId");
              next.delete("subCategoryId");
              next.delete("minPrice");
              next.delete("maxPrice");
              clearDynamicFilters(next);
              next.set("sortBy", "createdAt");
              next.set("sortOrder", "desc");
              next.set("page", "1");
            });
          }}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Category</label>
              <select
                value={categoryId}
                onChange={(event) => {
                  const value = event.target.value;
                  updateParams((next) => {
                    if (value) {
                      const selectedCategory = categories.find((item) => item._id === value);
                      next.set("categoryId", value);
                      next.set("category", selectedCategory?.name || "");
                    } else {
                      next.delete("categoryId");
                      next.delete("category");
                    }
                    next.delete("subCategoryId");
                    next.delete("minPrice");
                    next.delete("maxPrice");
                    clearDynamicFilters(next);
                    next.set("page", "1");
                  });
                }}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-100 dark:focus:ring-slate-700"
              >
                <option value="">All Categories</option>
                {categories.map((item) => (
                  <option key={item._id} value={item._id}>{item.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Subcategory</label>
              <select
                value={subCategoryId}
                onChange={(event) => {
                  const value = event.target.value;
                  updateParams((next) => {
                    if (value) next.set("subCategoryId", value);
                    else next.delete("subCategoryId");
                    next.delete("minPrice");
                    next.delete("maxPrice");
                    next.set("page", "1");
                  });
                }}
                disabled={!categoryId}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-900 dark:focus:border-slate-100 dark:focus:ring-slate-700"
              >
                <option value="">All Subcategories</option>
                {subcategories.map((item) => (
                  <option key={item._id} value={item._id}>{item.name}</option>
                ))}
              </select>
            </div>

            <RangeFacetCard
              title="Price range"
              min={Number(minPrice || facetMap.price?.min || 0)}
              max={Number(maxPrice || facetMap.price?.max || 100000)}
              floor={Number(facetMap.price?.min || 0)}
              ceiling={Number(facetMap.price?.max || 100000)}
              step={1}
              onApply={(nextMin, nextMax) => {
                updateParams((next) => {
                  if (nextMin !== "" && nextMin !== null && nextMin !== undefined) next.set("minPrice", String(nextMin));
                  else next.delete("minPrice");
                  if (nextMax !== "" && nextMax !== null && nextMax !== undefined) next.set("maxPrice", String(nextMax));
                  else next.delete("maxPrice");
                  next.set("page", "1");
                });
              }}
            />

            {filterDefs
              .filter((def) => !["price", "rating"].includes(def.key))
              .map((def) => {
                const facet = facetMap[def.key];
                if (def.type === "checkbox") {
                  const values = getCheckboxValues(searchParams, def.key);
                  return (
                    <div key={def.key} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{def.name}</div>
                      <div className="grid gap-2">
                        {(facet?.options || def.options?.map((option) => ({ value: option, count: 0 })) || []).map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              const nextSelected = values.includes(option.value)
                                ? values.filter((item) => item !== option.value)
                                : [...values, option.value];
                              updateParams((next) => {
                                if (nextSelected.length) next.set(def.key, nextSelected.join(","));
                                else next.delete(def.key);
                                next.set("page", "1");
                              });
                            }}
                            className={`rounded-2xl border px-3 py-3 text-left text-sm transition ${values.includes(option.value)
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                              }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span>{option.value}</span>
                              <span className="text-[11px] text-slate-400">{option.count}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                }

                if (def.type === "range") {
                  const { minKey, maxKey } = toRangeKeys(def.key);
                  return (
                    <RangeFacetCard
                      key={def.key}
                      title={def.name}
                      min={Number(searchParams.get(minKey) || facet?.min || def.rangeConfig?.min || 0)}
                      max={Number(searchParams.get(maxKey) || facet?.max || def.rangeConfig?.max || 0)}
                      floor={Number(facet?.min ?? def.rangeConfig?.min ?? 0)}
                      ceiling={Number(facet?.max ?? def.rangeConfig?.max ?? 100)}
                      step={Number(def.rangeConfig?.step || 1)}
                      formatSuffix={def.unit || ""}
                      onApply={(min, max) => {
                        updateParams((next) => {
                          if (min !== "" && min !== null && min !== undefined) next.set(`min${def.key.charAt(0).toUpperCase() + def.key.slice(1)}`, String(min));
                          else next.delete(`min${def.key.charAt(0).toUpperCase() + def.key.slice(1)}`);
                          if (max !== "" && max !== null && max !== undefined) next.set(`max${def.key.charAt(0).toUpperCase() + def.key.slice(1)}`, String(max));
                          else next.delete(`max${def.key.charAt(0).toUpperCase() + def.key.slice(1)}`);
                          next.set("page", "1");
                        });
                      }}
                    />
                  );
                }

                return (
                  <div key={def.key} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{def.name}</div>
                    <div className="grid gap-2">
                      {(facet?.options || def.options?.map((option) => ({ value: option, count: 0 })) || []).map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            updateParams((next) => {
                              if (option.value) next.set(def.key, option.value);
                              else next.delete(def.key);
                              next.set("page", "1");
                            });
                          }}
                          className={`rounded-2xl border px-3 py-3 text-left text-sm transition ${searchParams.get(def.key) === option.value
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                            }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span>{option.value}</span>
                            <span className="text-[11px] text-slate-400">{option.count}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </FilterBottomSheet>

        <div className="mt-4 lg:flex lg:items-start lg:gap-6">
          {isDesktopFilterOpen && (
            <div className="hidden lg:block lg:w-80 shrink-0">
              <FilterSidebar
                categories={categories}
                categoryId={categoryId}
                subCategoryId={subCategoryId}
                subcategories={subcategories}
                search={search}
                minPrice={minPrice}
                maxPrice={maxPrice}
                sortBy={sortBy}
                filterDefs={filterDefs}
                facetMap={facetMap}
                searchParams={searchParams}
                onCategoryChange={onCategoryChange}
                onSubcategoryChange={onSubcategoryChange}
                onSearchChange={onSearchChange}
                onPriceChange={onPriceChange}
                onSortChange={onSortChange}
                onFilterChange={onFilterChange}
                onClose={() => setIsDesktopFilterOpen(false)}
              />
            </div>
          )}

          <div className="flex-1">
            {!loading && products.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
                <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800">
                  <LayoutGrid className="h-10 w-10 text-slate-400" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">No products found</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">We couldn't find any products that match your current selection.</p>
                <button
                  type="button"
                  onClick={() => {
                    updateParams((next) => {
                      next.delete("search");
                      next.delete("category");
                      next.delete("categoryId");
                      next.delete("subCategoryId");
                      next.delete("minPrice");
                      next.delete("maxPrice");
                      clearDynamicFilters(next);
                      next.set("sortBy", "createdAt");
                      next.set("sortOrder", "desc");
                      next.set("page", "1");
                    });
                  }}
                  className="mt-6 rounded-xl bg-[#0052FF] px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 shadow-sm"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className={`grid gap-3 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 ${isDesktopFilterOpen ? "lg:grid-cols-4 xl:grid-cols-4" : "lg:grid-cols-6 xl:grid-cols-6"}`}>
                {loading && !products.length
                  ? Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="animate-pulse rounded-3xl bg-white p-4 shadow-sm dark:bg-slate-900">
                      <div className="mb-3 h-40 rounded-3xl bg-slate-100 dark:bg-slate-800" />
                      <div className="space-y-2">
                        <div className="h-3 w-3/4 rounded-full bg-slate-200 dark:bg-slate-800" />
                        <div className="h-3 w-1/2 rounded-full bg-slate-200 dark:bg-slate-800" />
                        <div className="h-8 rounded-2xl bg-slate-200 dark:bg-slate-800" />
                      </div>
                    </div>
                  ))
                  : products.map((product) => <ProductCard key={product._id} product={product} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterSidebar({
  categories,
  categoryId,
  subCategoryId,
  subcategories,
  search,
  minPrice,
  maxPrice,
  sortBy,
  filterDefs,
  facetMap,
  searchParams,
  onCategoryChange,
  onSubcategoryChange,
  onSearchChange,
  onPriceChange,
  onSortChange,
  onFilterChange,
  onClose,
}) {
  const [localSearch, setLocalSearch] = useState(search);
  const groupedFilterDefs = useMemo(() => {
    return filterDefs
      .filter((def) => !["price", "rating"].includes(def.key))
      .reduce((acc, def) => {
        const group = def.group || "General";
        if (!acc[group]) acc[group] = [];
        acc[group].push(def);
        return acc;
      }, {});
  }, [filterDefs]);

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  return (
    <div className="relative overflow-hidden space-y-4 rounded-[1.5rem] border-0 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:bg-slate-900 sm:space-y-5 sm:p-6">
      {/* Wave Graphic at bottom */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 opacity-50 dark:opacity-20" style={{ background: "url('data:image/svg+xml;utf8,<svg viewBox=\"0 0 1440 320\" xmlns=\"http://www.w3.org/2000/svg\"><path fill=\"%23BFDBFE\" fill-opacity=\"1\" d=\"M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,224C672,245,768,267,864,261.3C960,256,1056,224,1152,197.3C1248,171,1344,149,1392,138.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z\"></path></svg>') no-repeat bottom", backgroundSize: 'cover' }}></div>

      <button 
        type="button" 
        onClick={onClose}
        className="relative z-10 flex w-full items-center justify-between cursor-pointer rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 p-1 -m-1 transition-colors"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Filters</h2>
        </div>
        <ChevronUp className="h-5 w-5 text-slate-900 dark:text-slate-100" />
      </button>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSearchChange(localSearch.trim());
        }}
        className="relative z-10 space-y-3"
      >
        <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100">Search</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={localSearch}
            onChange={(event) => setLocalSearch(event.target.value)}
            placeholder="Search products..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <button type="submit" className="w-full rounded-xl bg-[#0052FF] py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
          Apply search
        </button>
      </form>

      <div className="relative z-10">
        <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Category</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <div className="p-1 rounded-md bg-blue-50 text-blue-600">
              <LayoutGrid className="w-4 h-4" />
            </div>
          </div>
          <select
            value={categoryId}
            onChange={(event) => onCategoryChange(event.target.value)}
            className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-12 pr-10 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">All Categories</option>
            {categories.map((item) => (
              <option key={item._id} value={item._id}>{item.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none text-slate-900 dark:text-slate-100" />
        </div>
      </div>

      <div className="relative z-10">
        <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Subcategory</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <div className="p-1 rounded-md bg-blue-50 text-blue-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <select
            value={subCategoryId}
            onChange={(event) => onSubcategoryChange(event.target.value)}
            disabled={!categoryId}
            className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-12 pr-10 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">All Subcategories</option>
            {subcategories.map((item) => (
              <option key={item._id} value={item._id}>{item.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none text-slate-900 dark:text-slate-100" />
        </div>
      </div>

      <div className="relative z-10">
        <RangeFacetCard
          title="Price"
          min={Number(minPrice || facetMap.price?.min || 0)}
          max={Number(maxPrice || facetMap.price?.max || 100000)}
          floor={Number(facetMap.price?.min || 0)}
          ceiling={Number(facetMap.price?.max || 100000)}
          step={1}
          onApply={onPriceChange}
          formatSuffix=""
        />
      </div>

      <div className="relative z-10 pb-16">
        <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Sort By</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-blue-600">
            <ArrowUpDown className="w-4 h-4" />
          </div>
          <select
            value={sortBy}
            onChange={(event) => onSortChange(event.target.value)}
            className="w-full appearance-none rounded-xl border border-slate-900 bg-white py-2.5 pl-10 pr-10 text-sm font-medium transition focus:outline-none dark:border-slate-100 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="createdAt">Newest</option>
            <option value="priceAsc">Price: Low to High</option>
            <option value="priceDesc">Price: High to Low</option>
            <option value="rating">Top Rated</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none text-slate-900 dark:text-slate-100" />
        </div>
      </div>

      {Object.entries(groupedFilterDefs).map(([groupName, defs]) => (
        <div key={groupName} className="space-y-3">
          <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {groupName}
          </div>
          {defs.map((def) => {
            const facet = facetMap[def.key];
            if (def.type === "range") {
              const { minKey, maxKey } = toRangeKeys(def.key);
              return (
                <RangeFacetCard
                  key={def.key}
                  title={def.name}
                  min={Number(searchParams.get(minKey) || facet?.min || def.rangeConfig?.min || 0)}
                  max={Number(searchParams.get(maxKey) || facet?.max || def.rangeConfig?.max || 0)}
                  floor={Number(facet?.min ?? def.rangeConfig?.min ?? 0)}
                  ceiling={Number(facet?.max ?? def.rangeConfig?.max ?? 100)}
                  step={Number(def.rangeConfig?.step || 1)}
                  formatSuffix={def.unit || ""}
                  onApply={(min, max) => onFilterChange(def.key, { min, max }, "range")}
                />
              );
            }

            if (def.type === "checkbox") {
              const selected = getCheckboxValues(searchParams, def.key);
              return (
                <details key={def.key} open className="rounded-2xl border border-slate-200 px-3 py-3 dark:border-slate-800">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {def.name}
                  </summary>
                  <div className="mt-3 space-y-2">
                    {(facet?.options || def.options?.map((option) => ({ value: option, count: 0 })) || []).map((option) => (
                      <label key={option.value} className="flex items-center justify-between gap-3 text-sm text-slate-700 dark:text-slate-300">
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selected.includes(option.value)}
                            onChange={(event) => {
                              const next = event.target.checked
                                ? [...selected, option.value]
                                : selected.filter((item) => item !== option.value);
                              onFilterChange(def.key, next, "checkbox");
                            }}
                          />
                          {option.value}
                        </span>
                        <span className={`text-xs ${option.count === 0 ? "text-slate-300" : "text-slate-400"}`}>{option.count}</span>
                      </label>
                    ))}
                  </div>
                </details>
              );
            }

            return (
              <details key={def.key} open className="rounded-2xl border border-slate-200 px-3 py-3 dark:border-slate-800">
                <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {def.name}
                </summary>
                <div className="mt-3 grid gap-2">
                  <button
                    type="button"
                    onClick={() => onFilterChange(def.key, "", def.type)}
                    className={`rounded-xl border px-3 py-2 text-left text-sm ${!searchParams.get(def.key) ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200"
                      }`}
                  >
                    All
                  </button>
                  {(facet?.options || def.options?.map((option) => ({ value: option, count: 0 })) || []).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onFilterChange(def.key, option.value, def.type)}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm ${searchParams.get(def.key) === option.value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200"
                        }`}
                    >
                      <span>{option.value}</span>
                      <span className="text-xs opacity-70">{option.count}</span>
                    </button>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      ))}


    </div>
  );
}

function RangeFacetCard({ title, min, max, floor, ceiling, step, onApply, formatSuffix = "" }) {
  const safeFloor = Number.isFinite(floor) ? floor : 0;
  const safeCeiling = Number.isFinite(ceiling) && ceiling >= safeFloor ? ceiling : Math.max(safeFloor, 100);

  const [localMin, setLocalMin] = useState(min === "" ? "" : Math.max(min, safeFloor));
  const [localMax, setLocalMax] = useState(max === "" ? "" : Math.min(max, safeCeiling));

  const [inputMin, setInputMin] = useState(min === "" ? "" : Math.max(min, safeFloor).toLocaleString("en-IN"));
  const [inputMax, setInputMax] = useState(max === "" ? "" : Math.min(max, safeCeiling).toLocaleString("en-IN"));

  const [error, setError] = useState("");

  useEffect(() => {
    setLocalMin(min === "" ? "" : min);
    setLocalMax(max === "" ? "" : max);
    setInputMin(min === "" ? "" : Number(min).toLocaleString("en-IN"));
    setInputMax(max === "" ? "" : Number(max).toLocaleString("en-IN"));
    setError("");
  }, [min, max]);

  const parseNumber = (val) => {
    if (!val) return "";
    const parsed = Number(val.replace(/[^0-9]/g, ""));
    return isNaN(parsed) ? "" : parsed;
  };

  const handleMinInputChange = (e) => {
    const val = e.target.value;
    setInputMin(val);
    const parsed = parseNumber(val);
    if (parsed !== "") setLocalMin(parsed);
    setError("");
  };

  const handleMaxInputChange = (e) => {
    const val = e.target.value;
    setInputMax(val);
    const parsed = parseNumber(val);
    if (parsed !== "") setLocalMax(parsed);
    setError("");
  };

  const handleInputBlur = (type) => {
    if (type === "min") {
      let val = localMin === "" ? safeFloor : Number(localMin);
      val = Math.max(safeFloor, Math.min(val, safeCeiling));
      setLocalMin(val);
      setInputMin(val.toLocaleString("en-IN"));
    } else {
      let val = localMax === "" ? safeCeiling : Number(localMax);
      val = Math.max(safeFloor, Math.min(val, safeCeiling));
      setLocalMax(val);
      setInputMax(val.toLocaleString("en-IN"));
    }
  };

  const handleMinSliderChange = (e) => {
    let val = Number(e.target.value);
    const currentMax = localMax === "" ? safeCeiling : localMax;
    if (val > currentMax) val = currentMax;
    setLocalMin(val);
    setInputMin(val.toLocaleString("en-IN"));
    setError("");
  };

  const handleMaxSliderChange = (e) => {
    let val = Number(e.target.value);
    const currentMin = localMin === "" ? safeFloor : localMin;
    if (val < currentMin) val = currentMin;
    setLocalMax(val);
    setInputMax(val.toLocaleString("en-IN"));
    setError("");
  };

  const handleApply = () => {
    const currentMin = localMin === "" ? safeFloor : localMin;
    const currentMax = localMax === "" ? safeCeiling : localMax;

    if (currentMin > currentMax) {
      setError("Minimum price cannot be greater than maximum price.");
      return;
    }

    const clampedMin = Math.max(safeFloor, Math.min(currentMin, safeCeiling));
    const clampedMax = Math.max(safeFloor, Math.min(currentMax, safeCeiling));

    const isMinDefault = clampedMin === safeFloor;
    const isMaxDefault = clampedMax === safeCeiling;

    setLocalMin(clampedMin);
    setLocalMax(clampedMax);
    setInputMin(clampedMin.toLocaleString("en-IN"));
    setInputMax(clampedMax.toLocaleString("en-IN"));

    onApply(isMinDefault ? "" : clampedMin, isMaxDefault ? "" : clampedMax);
  };

  const getPercent = (value) => {
    const range = safeCeiling - safeFloor || 1;
    const clampedValue = Math.max(safeFloor, Math.min(value, safeCeiling));
    return ((clampedValue - safeFloor) / range) * 100;
  };

  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/20 p-4 dark:border-slate-800 dark:bg-slate-800/20">
      <h3 className="mb-4 text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-500 text-sm pointer-events-none">₹</span>
            <input
              type="text"
              placeholder="Min"
              value={inputMin}
              onChange={handleMinInputChange}
              onBlur={() => handleInputBlur("min")}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-7 pr-2 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 placeholder:text-slate-400"
            />
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-500 text-sm pointer-events-none">₹</span>
            <input
              type="text"
              placeholder="Max"
              value={inputMax}
              onChange={handleMaxInputChange}
              onBlur={() => handleInputBlur("max")}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-7 pr-2 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="relative h-6 pt-2">
          <div className="absolute top-1/2 left-0 right-0 h-1.5 -translate-y-1/2 rounded-full bg-slate-200 dark:bg-slate-700"></div>
          <div 
            className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-blue-600"
            style={{ 
              left: `${getPercent(localMin === "" ? safeFloor : localMin)}%`,
              right: `${100 - getPercent(localMax === "" ? safeCeiling : localMax)}%` 
            }}
          ></div>
          <input
            type="range"
            min={safeFloor}
            max={safeCeiling}
            step={step}
            value={localMin === "" ? safeFloor : localMin}
            onChange={handleMinSliderChange}
            className="absolute top-1/2 w-full -translate-y-1/2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:ring-2 [&::-webkit-slider-thumb]:ring-white"
          />
          <input
            type="range"
            min={safeFloor}
            max={safeCeiling}
            step={step}
            value={localMax === "" ? safeCeiling : localMax}
            onChange={handleMaxSliderChange}
            className="absolute top-1/2 w-full -translate-y-1/2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:ring-2 [&::-webkit-slider-thumb]:ring-white"
          />
        </div>

        {error && <div className="text-xs text-red-500">{error}</div>}

        <button
          type="button"
          onClick={handleApply}
          className="w-full rounded-xl border border-blue-200 bg-blue-50 py-2.5 text-sm font-bold text-blue-600 transition hover:bg-blue-100 hover:border-blue-300 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
