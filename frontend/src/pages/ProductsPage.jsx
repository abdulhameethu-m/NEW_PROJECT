import { logger } from "../services/logger/logger.js";
import { useEffect, useMemo, useState, memo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronDown, Heart, ShoppingCart, ChevronLeft, ChevronRight, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { BackButton } from "../components/BackButton";
import { CategoryChips } from "../components/shop/CategoryChips";
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
          ...(minPrice && { minPrice: Number(minPrice) }),
          ...(maxPrice && { maxPrice: Number(maxPrice) }),
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
  }, [category, categoryId, subCategoryId, search, minPrice, maxPrice, dynamicParams]);

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
        setFacetMap(
          Object.fromEntries(
            (response?.data?.facets || []).map((facet) => [facet.key, facet])
          )
        );
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
    if (minPrice || maxPrice) chips.push({ key: "price", label: `Price: ${minPrice || 0} - ${maxPrice || "Any"}` });

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
      clearDynamicFilters(next);
      next.set("page", "1");
    });
  }

  function onSubcategoryChange(value) {
    updateParams((next) => {
      if (value) next.set("subCategoryId", value);
      else next.delete("subCategoryId");
      next.set("page", "1");
    });
  }

  function onSearchChange(value) {
    updateParams((next) => {
      if (value) next.set("search", value);
      else next.delete("search");
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
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="px-3 pb-3">
        <CategoryChips
          categories={categories}
          selectedCategoryId={categoryId}
          selectedCategoryName={category}
          onSelectCategory={(categoryIdValue) =>
            updateParams((next) => {
              if (categoryIdValue) {
                const selectedCategory = categories.find((item) => item._id === categoryIdValue);
                next.set("categoryId", categoryIdValue);
                next.set("category", selectedCategory?.name || "");
              } else {
                next.delete("categoryId");
                next.delete("category");
              }
              next.delete("subCategoryId");
              clearDynamicFilters(next);
              next.set("page", "1");
            })
          }
        />

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
              step={Number(facetMap.price?.step || 100)}
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
                            className={`rounded-2xl border px-3 py-3 text-left text-sm transition ${
                              values.includes(option.value)
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
                          className={`rounded-2xl border px-3 py-3 text-left text-sm transition ${
                            searchParams.get(def.key) === option.value
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
              />
            </div>
          )}

          <div className={`flex-1 grid gap-3 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 ${isDesktopFilterOpen ? "lg:grid-cols-4 xl:grid-cols-4" : "lg:grid-cols-8 xl:grid-cols-8"}`}>
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
        </div>

        {!loading && products.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto mb-4 h-32 w-32 rounded-full bg-slate-100 dark:bg-slate-800" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">No products found</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Try clearing your filters or searching for another category.</p>
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
              className="mt-4 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Reset filters
            </button>
          </div>
        ) : null}
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
    <div className="space-y-3 rounded-xl border border-slate-300 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-slate-950 sm:space-y-4 sm:p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 sm:text-base">Filters</h2>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSearchChange(localSearch.trim());
        }}
        className="space-y-2"
      >
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Search</label>
        <input
          type="text"
          value={localSearch}
          onChange={(event) => setLocalSearch(event.target.value)}
          placeholder="Search products..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 sm:text-sm"
        />
        <button type="submit" className="w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 sm:text-sm">
          Apply search
        </button>
      </form>

      <div>
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Category</label>
        <select
          value={categoryId}
          onChange={(event) => onCategoryChange(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 sm:text-sm"
        >
          <option value="">All Categories</option>
          {categories.map((item) => (
            <option key={item._id} value={item._id}>{item.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Subcategory</label>
        <select
          value={subCategoryId}
          onChange={(event) => onSubcategoryChange(event.target.value)}
          disabled={!categoryId}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 sm:text-sm"
        >
          <option value="">All Subcategories</option>
          {subcategories.map((item) => (
            <option key={item._id} value={item._id}>{item.name}</option>
          ))}
        </select>
      </div>

      <RangeFacetCard
        title="Price"
        min={Number(minPrice || facetMap.price?.min || 0)}
        max={Number(maxPrice || facetMap.price?.max || 100000)}
        floor={Number(facetMap.price?.min || 0)}
        ceiling={Number(facetMap.price?.max || 100000)}
        step={Number(facetMap.price?.step || 100)}
        onApply={onPriceChange}
        formatSuffix=""
      />

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
                  className={`rounded-xl border px-3 py-2 text-left text-sm ${
                    !searchParams.get(def.key) ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200"
                  }`}
                >
                  All
                </button>
                {(facet?.options || def.options?.map((option) => ({ value: option, count: 0 })) || []).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onFilterChange(def.key, option.value, def.type)}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm ${
                      searchParams.get(def.key) === option.value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200"
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

      <div>
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Sort By</label>
        <select
          value={sortBy}
          onChange={(event) => onSortChange(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 sm:text-sm"
        >
          <option value="createdAt">Newest</option>
          <option value="price">Price (Low to High)</option>
          <option value="ratings.averageRating">Highest Rated</option>
          <option value="name">Name (A-Z)</option>
        </select>
      </div>
    </div>
  );
}

function RangeFacetCard({ title, min, max, floor, ceiling, step, onApply, formatSuffix = "" }) {
  const [localMin, setLocalMin] = useState(min);
  const [localMax, setLocalMax] = useState(max);

  useEffect(() => {
    setLocalMin(min);
    setLocalMax(max);
  }, [min, max]);

  const safeFloor = Number.isFinite(floor) ? floor : 0;
  const safeCeiling = Number.isFinite(ceiling) && ceiling >= safeFloor ? ceiling : Math.max(safeFloor, 100);

  return (
    <details open className="rounded-2xl border border-slate-200 px-3 py-3 dark:border-slate-800">
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </summary>
      <div className="mt-3 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            value={localMin}
            min={safeFloor}
            max={localMax || safeCeiling}
            step={step}
            onChange={(event) => setLocalMin(event.target.value === "" ? "" : Number(event.target.value))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            value={localMax}
            min={localMin || safeFloor}
            max={safeCeiling}
            step={step}
            onChange={(event) => setLocalMax(event.target.value === "" ? "" : Number(event.target.value))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <input
            type="range"
            min={safeFloor}
            max={safeCeiling}
            step={step}
            value={localMin === "" ? safeFloor : localMin}
            onChange={(event) => setLocalMin(Number(event.target.value))}
            className="w-full"
          />
          <input
            type="range"
            min={safeFloor}
            max={safeCeiling}
            step={step}
            value={localMax === "" ? safeCeiling : localMax}
            onChange={(event) => setLocalMax(Number(event.target.value))}
            className="w-full"
          />
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{safeFloor}{formatSuffix}</span>
          <span>{safeCeiling}{formatSuffix}</span>
        </div>
        <button
          type="button"
          onClick={() => onApply(localMin, localMax)}
          className="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
        >
          Apply
        </button>
      </div>
    </details>
  );
}

const ProductCard = memo(function ProductCard({ product }) {
  const { cart, addItem: addCartItem } = useCart();
  const { openDrawer, showToast } = useCartDrawer();
  const { addItem: addWishlistItem, removeItem: removeWishlistItem, isInWishlist: checkWishlistStatus } = useWishlist();
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const productId = useMemo(() => extractProductId(product), [product]);

  // Get all product images
  const allImages = useMemo(() => product?.images?.filter((img) => img?.url) || [], [product?.images]);
  const hasMultipleImages = allImages.length > 1;
  const currentImageUrl = allImages[currentImageIndex]?.url || product.images?.[0]?.url;

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

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const status = await checkWishlistStatus(productId);
        if (active) setIsInWishlist(Boolean(status));
      } catch {
        if (active) setIsInWishlist(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [productId, checkWishlistStatus]);

  const hasAvailableVariants = product?.isActive !== false && product?.status !== "REJECTED";
  const availableStock = 999;

  const discountPercent = product.discountPrice
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0;

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setCurrentImageIndex(0);
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
      logger.error("Failed to update wishlist:", { error: err });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddToCart = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (isSubmitting || !hasAvailableVariants) return;

    try {
      setIsSubmitting(true);
      const result = await addCartItem(productId, 1, "");
      if (result) {
        if (result.message && typeof showToast === "function") {
          showToast(result.message, result.action === "NEXT_VARIANT_ALLOCATED" ? "info" : "success");
        }
        const allocatedVariant = result.addedItem?.variant || result.addedItem || null;
        openDrawer(product, allocatedVariant, result.addedItem?.quantity || 1);
      }
    } catch (err) {
      logger.error("Failed to add to cart:", { error: err });
      showToast(getCartErrorMessage(err, "Failed to add item to cart."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Link
      to={`/product/${productId}`}
      className="group/card flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white transition-all duration-200 hover:border-slate-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600 dark:hover:shadow-slate-950/50"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div 
        className="group relative w-full overflow-hidden bg-slate-100 dark:bg-slate-800" 
        style={{ aspectRatio: "3/4" }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {currentImageUrl ? (
          <img
            key={`${product._id}-${currentImageIndex}`}
            src={currentImageUrl}
            alt={product.name}
            className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(event) => {
              event.target.src = "https://via.placeholder.com/300x300?text=Product";
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-400 text-xs">No Image</div>
        )}

        {/* Image Navigation - Visible on Hover */}
        {hasMultipleImages && isHovering && shouldScroll && (
          <>
            {/* Previous Button */}
            <button
              onClick={handlePrevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-50 flex items-center justify-center w-8 h-8 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-lg hover:bg-white dark:hover:bg-slate-700 transition-all duration-200 hover:scale-110"
              aria-label="Previous image"
              tabIndex={-1}
              type="button"
            >
              <ChevronLeft size={16} className="text-slate-700 dark:text-slate-200" />
            </button>

            {/* Next Button */}
            <button
              onClick={handleNextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-50 flex items-center justify-center w-8 h-8 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-lg hover:bg-white dark:hover:bg-slate-700 transition-all duration-200 hover:scale-110"
              aria-label="Next image"
              tabIndex={-1}
              type="button"
            >
              <ChevronRight size={16} className="text-slate-700 dark:text-slate-200" />
            </button>
          </>
        )}
        <div className="absolute top-2 right-2 z-10 flex flex-col gap-2 opacity-100 translate-y-0 sm:opacity-0 sm:group-hover:opacity-100 sm:translate-y-2 sm:group-hover:translate-y-0 transition-all duration-300 ease-out">
          <button
            onClick={handleWishlist}
            disabled={isSubmitting}
            className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            title={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
            aria-label={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart
              size={13}
              strokeWidth={1.5}
              className={`transition-all duration-300 ${
                isInWishlist
                  ? "fill-red-500 text-red-500"
                  : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            />
          </button>

          <button
            onClick={handleAddToCart}
            disabled={isSubmitting || !hasAvailableVariants || availableStock <= 0}
            className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            title={hasAvailableVariants ? "Add to cart" : "Out of stock"}
            aria-label="Add to cart"
          >
            <ShoppingCart size={12} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-2 sm:p-2.5">
        <div className="flex-1">
          <div className="flex items-start justify-between gap-1.5">
            <h3 className="line-clamp-2 text-xs font-medium text-slate-900 dark:text-slate-100 sm:text-xs leading-tight flex-1">
              {product.name}
            </h3>
            {discountPercent > 0 ? (
              <div className="shrink-0 rounded bg-gradient-to-br from-orange-500 to-red-500 px-1 py-0.5 shadow-sm mt-0.5">
                <div className="text-[9px] font-bold text-white leading-none tracking-wider">{discountPercent}% OFF</div>
              </div>
            ) : null}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
            {product.category}
          </p>
          <SellerNameLink seller={product?.sellerId} className="mt-1 text-[11px]" disableLink={true} />
        </div>

        {product.ratings?.averageRating > 0 && (
          <div className="flex items-center gap-0.5">
            <span className="text-xs font-semibold text-yellow-500">★ {product.ratings.averageRating.toFixed(1)}</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">({product.ratings.totalReviews})</span>
          </div>
        )}

        <div className="space-y-0.5 border-t border-slate-100 pt-1 dark:border-slate-800">
          {product.discountPrice ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 sm:text-sm">
                {formatCurrency(product.discountPrice)}
              </span>
              <span className="text-[10px] text-slate-500 line-through dark:text-slate-400">
                {formatCurrency(product.price)}
              </span>
            </div>
          ) : (
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 sm:text-sm">
              {formatCurrency(product.price)}
            </span>
          )}
          
          <div className="text-[10px] font-medium">
            {product.stock > 0 ? (
              <span className="text-green-600 dark:text-green-400">In Stock</span>
            ) : (
              <span className="text-red-600 dark:text-red-400">Out of Stock</span>
            )}
          </div>
        </div>

        <button className="mt-auto w-full rounded-md bg-blue-600 px-2 py-1.5 text-center text-[11px] font-semibold text-white transition-all duration-200 hover:bg-blue-700 active:scale-95 dark:hover:bg-blue-500 sm:text-xs">
          View
        </button>
      </div>
    </Link>
  );
});
