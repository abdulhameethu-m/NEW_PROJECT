import { logger } from "../services/logger/logger.js";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, X, ArrowRight } from "lucide-react";
import * as productService from "../services/productService";
import { formatCurrency } from "../utils/formatCurrency";
import { resolveApiAssetUrl } from "../utils/resolveUrl";

export function SearchBar({ className = "", autoFocus = false, onSearchSubmit }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const debounceTimer = useRef(null);

  // Auto-focus input if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Debounced live search
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    const query = searchQuery.trim();
    if (query.length < 1) {
      setResults([]);
      setShowResults(false);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      try {
        setLoading(true);
        const response = await productService.getPublicProducts({
          search: query,
          limit: 6,
        });
        const items = response?.data?.products || response?.products || [];
        setResults(items);
        setShowResults(true);
      } catch (error) {
        logger.error("Search error:", { error });
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(debounceTimer.current);
  }, [searchQuery]);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (query) {
      navigate(`/shop?search=${encodeURIComponent(query)}`);
      setShowResults(false);
      onSearchSubmit?.();
    } else {
      if (inputRef.current) inputRef.current.focus();
    }
  };

  const handleSelectProduct = () => {
    setSearchQuery("");
    setShowResults(false);
    onSearchSubmit?.();
  };

  return (
    <div ref={searchRef} className={`group relative mx-auto w-full max-w-3xl ${className}`.trim()}>
      <form onSubmit={handleSearchSubmit} className="relative flex items-center">
        {/* Clickable Search Icon Button */}
        <button
          type="submit"
          aria-label="Submit search"
          className="absolute left-2.5 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition active:scale-95 cursor-pointer z-10"
        >
          <Search className="h-4 w-4" />
        </button>

        <input
          ref={inputRef}
          type="text"
          placeholder="Search products, brands and essentials..."
          value={searchQuery}
          onChange={(e) => {
            const val = e.target.value;
            setSearchQuery(val);
            if (val.trim().length > 0) {
              setShowResults(true);
            }
          }}
          onFocus={() => {
            if (searchQuery.trim().length > 0) {
              setShowResults(true);
            }
          }}
          className="w-full rounded-full border border-slate-200/90 bg-slate-50/70 py-2 sm:py-2.5 pl-10 pr-10 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none transition duration-150 hover:border-slate-300 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-slate-500 dark:focus:bg-slate-800 dark:focus:ring-slate-700/50"
        />

        {searchQuery ? (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setResults([]);
              setShowResults(false);
              if (inputRef.current) inputRef.current.focus();
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition z-10 cursor-pointer"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </form>

      {/* Solid Search Popover - Only displays when active query exists */}
      {showResults && searchQuery.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-80 sm:max-h-96 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900 dark:shadow-slate-950/50 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700">
          {loading && (
            <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
              <span>Searching...</span>
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="py-5 px-3 text-center">
              <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
                No products found for &ldquo;<span className="font-semibold text-slate-900 dark:text-white">{searchQuery}</span>&rdquo;
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Press Enter to search the entire store
              </p>
              <button
                type="button"
                onClick={handleSearchSubmit}
                className="mt-3 inline-flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
              >
                <span>Search in shop</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-2 pb-1.5 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {results.length} result{results.length > 1 ? "s" : ""} matching &ldquo;{searchQuery}&rdquo;
                </span>
                <button
                  type="button"
                  onClick={handleSearchSubmit}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-0.5"
                >
                  View all <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/50 mt-1">
                {results.map((product) => {
                  const imgUrl = product.images?.[0]?.url ? resolveApiAssetUrl(product.images[0].url) : "";
                  return (
                    <Link
                      key={product._id}
                      to={`/product/${product._id}`}
                      onClick={handleSelectProduct}
                      className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-slate-50 dark:hover:bg-slate-800/60 group"
                    >
                      <div className="h-11 w-11 flex-none overflow-hidden rounded-lg border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800">
                        {imgUrl ? (
                          <img
                            loading="lazy"
                            decoding="async"
                            src={imgUrl}
                            alt={product.name}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[9px] text-slate-400">No img</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-blue-600 transition-colors">
                          {product.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            {formatCurrency(product.discountPrice || product.price)}
                          </span>
                          {product.discountPrice && (
                            <span className="text-[10px] text-slate-400 line-through">
                              {formatCurrency(product.price)}
                            </span>
                          )}
                          {product.category && (
                            <span className="text-[9px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 px-1.5 py-0.5 rounded">
                              {product.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleSearchSubmit}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white px-3 py-2 text-center text-xs font-semibold transition active:scale-98 cursor-pointer shadow-xs"
              >
                <span>View all results for &ldquo;{searchQuery}&rdquo;</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
