import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import * as productService from "../services/productService";
import { formatCurrency } from "../utils/formatCurrency";

export function ShopPage() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "createdAt");

  const search = searchParams.get("search") || "";
  const limit = 12;

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const params = {
          page,
          limit,
          sortBy,
          sortOrder: sortBy === "createdAt" ? "desc" : "asc",
        };

        if (search) {
          params.search = search;
        }

        const response = await productService.getPublicProducts(params);
        setProducts(response.data?.products || []);
        setTotalPages(response.data?.pages || 1);
      } catch (err) {
        setError("Failed to load products");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [search, page, sortBy]);

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
    setPage(1);
  };

  if (loading && page === 1) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          {search ? `Search Results for "${search}"` : "Shop"}
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          {products.length > 0
            ? `Showing ${products.length} product${products.length !== 1 ? "s" : ""}`
            : "No products found"}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Filters & Sorting */}
      <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Sort by:
          </label>
          <select
            value={sortBy}
            onChange={handleSortChange}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="createdAt">Newest</option>
            <option value="price">Price: Low to High</option>
            <option value="name">Name (A-Z)</option>
            <option value="ratings.averageRating">Rating</option>
          </select>
        </div>
      </div>

      {/* Products Grid */}
      {products.length > 0 ? (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <Link
                key={product._id}
                to={`/product/${product._id}`}
                className="group bg-white dark:bg-slate-800 rounded-lg shadow-sm hover:shadow-md transition border border-slate-200 dark:border-slate-700 overflow-hidden"
              >
                <div className="relative w-full h-48 bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  {product.images?.[0]?.url ? (
                    <img
                      src={product.images[0].url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      No image
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                    {product.name}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div className="space-y-1">
                      {product.discountedPrice ? (
                        <>
                          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {formatCurrency(product.discountedPrice)}
                          </p>
                          <p className="text-xs text-slate-500 line-through">
                            {formatCurrency(product.price)}
                          </p>
                        </>
                      ) : (
                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                          {formatCurrency(product.price)}
                        </p>
                      )}
                    </div>
                    {product.ratings?.averageRating && (
                      <div className="text-right">
                        <p className="text-sm font-semibold text-yellow-500">
                          ⭐ {product.ratings.averageRating.toFixed(1)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 dark:text-white"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .slice(Math.max(0, page - 2), Math.min(totalPages, page + 1))
                  .map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-3 py-2 rounded-lg ${
                        page === p
                          ? "bg-blue-600 text-white"
                          : "border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
              </div>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 dark:text-white"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-slate-600 dark:text-slate-400 text-lg mb-4">
            {search
              ? `No products found matching "${search}"`
              : "No products available"}
          </p>
          <Link
            to="/"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Browse all products
          </Link>
        </div>
      )}
    </div>
  );
}
