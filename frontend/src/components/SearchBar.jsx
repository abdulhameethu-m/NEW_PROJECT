import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import * as productService from "../services/productService";
import { formatCurrency } from "../utils/formatCurrency";
import { resolveApiAssetUrl } from "../utils/resolveUrl";

export function SearchBar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);
  const debounceTimer = useRef(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (searchQuery.trim().length < 1) {
      setResults([]);
      setShowResults(false);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      try {
        setLoading(true);
        const response = await productService.getPublicProducts({
          search: searchQuery.trim(),
          limit: 8,
        });
        setResults(response.data?.products || []);
        setShowResults(true);
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer.current);
  }, [searchQuery]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={searchRef}>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="9" cy="9" r="5.5" />
            <path strokeLinecap="round" d="m14 14 3.5 3.5" />
          </svg>
        </span>
        <input
          type="text"
          placeholder="Search products by first letter or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchQuery.trim().length > 0 && setShowResults(true)}
          className="w-full rounded-xl border border-slate-300 bg-white py-2 sm:py-2.5 pl-9 pr-10 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setResults([]);
              setShowResults(false);
            }}
            className="absolute right-2 top-1/2 inline-flex h-7 w-7 sm:h-8 sm:w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 flex-shrink-0"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path strokeLinecap="round" d="M5 5l10 10M15 5 5 15" />
            </svg>
          </button>
        )}
      </div>

      {showResults && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 max-h-80 sm:max-h-96 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
          {loading && (
            <div className="p-3 sm:p-4 text-center text-xs sm:text-sm text-slate-500">
              Searching...
            </div>
          )}

          {!loading && results.length === 0 && searchQuery.trim().length > 0 && (
            <div className="p-3 sm:p-4 text-center text-xs sm:text-sm text-slate-500">
              No products found
            </div>
          )}

          {!loading && results.length > 0 && (
            <>
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {results.map((product) => (
                  <Link
                    key={product._id}
                    to={`/product/${product._id}`}
                    onClick={() => {
                      setSearchQuery("");
                      setResults([]);
                      setShowResults(false);
                    }}
                    className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 transition hover:bg-slate-50 dark:hover:bg-slate-700 min-h-12"
                  >
                    <div className="h-12 w-12 flex-none overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                      {product.images?.[0]?.url ? (
                        <img
                          src={resolveApiAssetUrl(product.images[0].url)}
                          alt={product.images?.[0]?.altText || product.name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="truncate text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {product.name}
                      </h4>
                      <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                        {formatCurrency(product.price)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>

              <Link
                to={`/shop?search=${encodeURIComponent(searchQuery)}`}
                onClick={() => {
                  setSearchQuery("");
                  setResults([]);
                  setShowResults(false);
                }}
                className="block border-t border-slate-200 p-3 sm:p-4 text-center text-xs sm:text-sm font-semibold text-blue-600 hover:bg-slate-50 dark:border-slate-700 dark:text-blue-400 dark:hover:bg-slate-700"
              >
                View all results
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
