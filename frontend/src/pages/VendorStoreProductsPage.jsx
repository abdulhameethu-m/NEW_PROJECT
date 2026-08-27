import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { VendorStoreHeader } from "../components/vendor-storefront/VendorStoreHeader";
import { VendorProductGrid } from "../components/vendor-storefront/VendorProductGrid";
import { getVendorStoreProducts } from "../services/vendorStorefrontService";
import { Search, LayoutGrid, Layers, ChevronDown, SlidersHorizontal, ChevronUp, ArrowUpDown } from "lucide-react";

const SORTS = [
  ["newest", "Newest"],
  ["best_selling", "Best Selling"],
  ["highest_rated", "Highest Rated"],
  ["discount", "Discount"],
  ["price_low", "Price Low"],
  ["price_high", "Price High"],
];

export function VendorStoreProductsPage() {
  const { vendorSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const [localSearch, setLocalSearch] = useState(searchParams.get("search") || "");
  const [isDesktopFilterOpen, setIsDesktopFilterOpen] = useState(true);

  const params = useMemo(() => Object.fromEntries(searchParams.entries()), [searchParams]);
  const page = Number(searchParams.get("page") || 1);

  useEffect(() => {
    let alive = true;
    setState((current) => ({ ...current, loading: true, error: "" }));
    getVendorStoreProducts(vendorSlug, { limit: 32, ...params })
      .then((response) => {
        if (alive) setState({ loading: false, error: "", data: response.data });
      })
      .catch((err) => {
        if (alive) setState({ loading: false, error: err?.response?.data?.message || "Failed to load vendor products.", data: null });
      });
    return () => {
      alive = false;
    };
  }, [vendorSlug, params]);

  function updateParam(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.set("page", "1");
    setSearchParams(next);
  }

  if (state.loading && !state.data) return <div className="rounded-2xl bg-white p-8 text-sm text-slate-500 dark:bg-slate-900">Loading products...</div>;
  if (state.error) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{state.error}</div>;

  const { vendor, products, pagination, isFollowing } = state.data;

  return (
    <div className="grid gap-6 min-h-screen" style={{ backgroundColor: "var(--theme-background)", color: "var(--theme-text)" }}>
      <VendorStoreHeader vendor={vendor} isFollowing={isFollowing} onFollowChange={(next) => setState((current) => ({ ...current, data: { ...current.data, ...next } }))} />

      <div className="px-3 pb-3">
        {/* Same header as Products page */}
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{pagination.total} Products</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Products from this vendor</p>
          </div>
          <button
            type="button"
            onClick={() => setIsDesktopFilterOpen((prev) => !prev)}
            className="hidden lg:inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
          >
            <SlidersHorizontal size={16} />
            Filters
          </button>
        </div>

        <div className="mt-4 lg:flex lg:items-start lg:gap-6">
          {isDesktopFilterOpen && (
            <div className="hidden lg:block lg:w-80 shrink-0">
              <aside className="relative overflow-hidden space-y-4 rounded-[1.5rem] border-0 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:bg-slate-900 sm:space-y-5 sm:p-6">
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 opacity-50 dark:opacity-20" style={{ background: "url('data:image/svg+xml;utf8,<svg viewBox=\"0 0 1440 320\" xmlns=\"http://www.w3.org/2000/svg\"><path fill=\"%23BFDBFE\" fill-opacity=\"1\" d=\"M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,224C672,245,768,267,864,261.3C960,256,1056,224,1152,197.3C1248,171,1344,149,1392,138.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z\"></path></svg>') no-repeat bottom", backgroundSize: 'cover' }}></div>
                
                <button 
                  type="button" 
                  onClick={() => setIsDesktopFilterOpen(false)}
                  className="relative z-10 flex w-full items-center justify-between cursor-pointer rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 p-1 -m-1 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-5 w-5 text-blue-600" />
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Filters</h2>
                  </div>
                  <ChevronUp className="h-5 w-5 text-slate-900 dark:text-slate-100" />
                </button>

                <form onSubmit={(e) => { e.preventDefault(); updateParam("search", localSearch.trim()); }} className="relative z-10 space-y-3">
                  <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={localSearch}
                      onChange={(e) => setLocalSearch(e.target.value)}
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
                      value={searchParams.get("category") || ""}
                      onChange={(e) => updateParam("category", e.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-12 pr-10 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <option value="">All Categories</option>
                      {searchParams.get("category") && <option value={searchParams.get("category")}>{searchParams.get("category")}</option>}
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
                      value={searchParams.get("subCategory") || ""}
                      onChange={(e) => updateParam("subCategory", e.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-12 pr-10 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <option value="">All Subcategories</option>
                      {searchParams.get("subCategory") && <option value={searchParams.get("subCategory")}>{searchParams.get("subCategory")}</option>}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none text-slate-900 dark:text-slate-100" />
                  </div>
                </div>

                <div className="relative z-10">
                  <RangeFacetCard
                    title="Price"
                    min={Number(searchParams.get("minPrice") || 0)}
                    max={Number(searchParams.get("maxPrice") || 100000)}
                    floor={0}
                    ceiling={100000}
                    step={1}
                    onApply={(nextMin, nextMax) => {
                      updateParam("minPrice", nextMin === "" ? "" : String(nextMin));
                      updateParam("maxPrice", nextMax === "" ? "" : String(nextMax));
                    }}
                    formatSuffix=""
                  />
                </div>

                <div className="relative z-10 pb-4">
                  <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Sort By</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-blue-600">
                      <ArrowUpDown className="w-4 h-4" />
                    </div>
                    <select
                      value={searchParams.get("sortBy") || "newest"}
                      onChange={(e) => updateParam("sortBy", e.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-900 bg-white py-2.5 pl-10 pr-10 text-sm font-medium transition focus:outline-none dark:border-slate-100 dark:bg-slate-800 dark:text-slate-100"
                    >
                      {SORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none text-slate-900 dark:text-slate-100" />
                  </div>
                </div>

                <div className="relative z-10 space-y-4 border-t border-slate-100 pt-5 dark:border-slate-800">
                  <div className="grid grid-cols-2 gap-3">
                    <input value={searchParams.get("brand") || ""} onChange={(e) => updateParam("brand", e.target.value)} placeholder="Brand" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
                    <input value={searchParams.get("color") || ""} onChange={(e) => updateParam("color", e.target.value)} placeholder="Color" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
                    <input value={searchParams.get("size") || ""} onChange={(e) => updateParam("size", e.target.value)} placeholder="Size" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
                    <select value={searchParams.get("rating") || ""} onChange={(e) => updateParam("rating", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
                      <option value="">Any rating</option>
                      <option value="4">4 stars & up</option>
                      <option value="3">3 stars & up</option>
                    </select>
                  </div>
                  <button type="button" onClick={() => { setSearchParams({ page: "1" }); setLocalSearch(""); }} className="w-full rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">Clear filters</button>
                </div>
              </aside>
            </div>
          )}

          <div className="flex-1">
            <div className="grid gap-4">
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Showing {products.length} of {pagination.total} vendor products only</span>
                <span>Page {pagination.page} of {pagination.pages}</span>
              </div>
              <VendorProductGrid 
                products={products} 
                loading={state.loading} 
                isDesktopFilterOpen={isDesktopFilterOpen} 
              />
              {pagination.pages > 1 ? (
                <div className="flex justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
                  <button disabled={page <= 1} onClick={() => updateParam("page", String(page - 1))} className="rounded-xl border border-slate-300 px-4 py-2 text-sm disabled:opacity-50">Previous</button>
                  <button disabled={page >= pagination.pages} onClick={() => updateParam("page", String(page + 1))} className="rounded-xl border border-slate-300 px-4 py-2 text-sm disabled:opacity-50">Next</button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
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
      setError("Min price cannot be > max.");
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
