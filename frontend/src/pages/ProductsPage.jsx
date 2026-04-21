import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import { useCategories } from "../hooks/useCategories";
import * as productService from "../services/productService";
import { formatCurrency } from "../utils/formatCurrency";

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");

  const category = searchParams.get("category") || "";
  const search = searchParams.get("search") || "";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") || "desc";
  const page = parseInt(searchParams.get("page")) || 1;

  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [showFilters, setShowFilters] = useState(false);
  const { categories } = useCategories();

  useEffect(() => {
    setLoading(true);
    setError("");

    (async () => {
      try {
        const params = {
          page,
          limit: 12,
          ...(category && { category }),
          ...(search && { search }),
          ...(minPrice && { minPrice: parseFloat(minPrice) }),
          ...(maxPrice && { maxPrice: parseFloat(maxPrice) }),
          sortBy,
          sortOrder,
        };

        const res = await productService.getPublicProducts(params);
        setProducts(res.data.products);
        setPagination(res.data.pagination);
      } catch (e) {
        setError(e?.response?.data?.message || "Failed to load products");
      } finally {
        setLoading(false);
      }
    })();
  }, [category, maxPrice, minPrice, page, search, sortBy, sortOrder]);

  const handleFilterChange = (newFilters) => {
    const params = new URLSearchParams();
    if (newFilters.category) params.set("category", newFilters.category);
    if (newFilters.search) params.set("search", newFilters.search);
    if (newFilters.minPrice) params.set("minPrice", newFilters.minPrice);
    if (newFilters.maxPrice) params.set("maxPrice", newFilters.maxPrice);
    params.set("sortBy", newFilters.sortBy || sortBy);
    params.set("sortOrder", newFilters.sortOrder || sortOrder);
    params.set("page", "1");
    setSearchParams(params);
  };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage);
    setSearchParams(params);
  };

  return (
    <div className="grid gap-4 sm:gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Shop Products</h1>
          <p className="mt-1 text-xs text-slate-600 sm:text-sm">
            Discover our curated selection of quality products
          </p>
        </div>
        <BackButton />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-400 sm:text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-4">
        <div className="hidden lg:block">
          <FilterSidebar
            category={category}
            search={search}
            minPrice={minPrice}
            maxPrice={maxPrice}
            sortBy={sortBy}
            sortOrder={sortOrder}
            categories={categories}
            onFilterChange={handleFilterChange}
          />
        </div>

        <div className="lg:hidden">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 sm:text-sm"
          >
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>
          {showFilters && (
            <div className="mt-3">
              <FilterSidebar
                category={category}
                search={search}
                minPrice={minPrice}
                maxPrice={maxPrice}
                sortBy={sortBy}
                sortOrder={sortOrder}
                categories={categories}
                onFilterChange={handleFilterChange}
              />
            </div>
          )}
        </div>

        <div className="lg:col-span-3">
          {loading && !products.length ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-800 sm:p-8">
              <div className="text-xs text-slate-600 dark:text-slate-400 sm:text-sm">Loading products...</div>
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-800 sm:p-8">
              <div className="text-xs text-slate-600 dark:text-slate-400 sm:text-sm">No products found. Try adjusting your filters.</div>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              <div className="text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
                Showing {products.length} of {pagination.total} products
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>

              {pagination.pages > 1 && (
                <div className="flex flex-col gap-3 border-t pt-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between sm:pt-6">
                  <div className="text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
                    Page {page} of {pagination.pages}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handlePageChange(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-800 sm:text-sm"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(Math.min(pagination.pages, page + 1))}
                      disabled={page === pagination.pages}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-800 sm:text-sm"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterSidebar({
  category,
  search,
  minPrice,
  maxPrice,
  sortBy,
  sortOrder,
  categories,
  onFilterChange,
}) {
  const [localSearch, setLocalSearch] = useState(search);
  const [localMinPrice, setLocalMinPrice] = useState(minPrice);
  const [localMaxPrice, setLocalMaxPrice] = useState(maxPrice);

  const handleSearch = (e) => {
    e.preventDefault();
    onFilterChange({
      category,
      search: localSearch,
      minPrice: localMinPrice,
      maxPrice: localMaxPrice,
      sortBy,
      sortOrder,
    });
  };

  const handleClearFilters = () => {
    setLocalSearch("");
    setLocalMinPrice("");
    setLocalMaxPrice("");
    onFilterChange({
      category: "",
      search: "",
      minPrice: "",
      maxPrice: "",
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-300 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-slate-950 sm:space-y-4 sm:p-4">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 sm:text-base">Filters</h2>

      <form onSubmit={handleSearch} className="space-y-2">
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Search</label>
        <input
          type="text"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 sm:text-sm"
        />
        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 sm:text-sm"
        >
          Search
        </button>
      </form>

      <div>
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Category</label>
        <select
          value={category}
          onChange={(e) =>
            onFilterChange({
              category: e.target.value,
              search,
              minPrice,
              maxPrice,
              sortBy,
              sortOrder,
            })
          }
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 sm:text-sm"
        >
          <option value="">All Categories</option>
          {categories.map((item) => (
            <option key={item._id || item.slug} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Price Range</label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">Min</label>
            <input
              type="number"
              value={localMinPrice}
              onChange={(e) => setLocalMinPrice(e.target.value)}
              placeholder="Min price"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 sm:text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">Max</label>
            <input
              type="number"
              value={localMaxPrice}
              onChange={(e) => setLocalMaxPrice(e.target.value)}
              placeholder="Max price"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 sm:text-sm"
            />
          </div>
        </div>
        <button
          onClick={handleSearch}
          className="mt-2 w-full rounded-lg bg-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 sm:text-sm"
        >
          Apply
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Sort By</label>
        <select
          value={sortBy}
          onChange={(e) =>
            onFilterChange({
              category,
              search,
              minPrice,
              maxPrice,
              sortBy: e.target.value,
              sortOrder,
            })
          }
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 sm:text-sm"
        >
          <option value="createdAt">Newest</option>
          <option value="price">Price (Low to High)</option>
          <option value="ratings.averageRating">Highest Rated</option>
        </select>
      </div>

      {(search || category || minPrice || maxPrice) && (
        <button
          onClick={handleClearFilters}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 sm:text-sm"
        >
          Clear All Filters
        </button>
      )}
    </div>
  );
}

function ProductCard({ product }) {
  const discountPercent = product.discountPrice
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0;

  return (
    <Link
      to={`/product/${product._id}`}
      className="block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:shadow-slate-950 dark:hover:shadow-slate-800/50"
    >
      <div className="relative overflow-hidden bg-slate-100 dark:bg-slate-800">
        {product.images?.[0]?.url ? (
          <img
            src={product.images[0].url}
            alt={product.name}
            className="h-40 w-full object-cover sm:h-48"
            onError={(e) => {
              e.target.src = "https://via.placeholder.com/300x200?text=Product";
            }}
          />
        ) : (
          <div className="h-40 bg-slate-200 dark:bg-slate-700 sm:h-48" />
        )}
        {discountPercent > 0 && (
          <div className="absolute top-2 right-2 rounded bg-red-600 px-2 py-1 text-xs font-bold text-white">
            -{discountPercent}%
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4">
        <div>
          <h3 className="line-clamp-2 text-sm font-medium text-slate-900 dark:text-slate-100 sm:text-base">{product.name}</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{product.category}</p>
        </div>

        {product.ratings?.averageRating > 0 && (
          <div className="mt-2 flex items-center gap-1">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={i < Math.round(product.ratings.averageRating) ? "text-yellow-400" : "text-slate-300 dark:text-slate-600"}
                >
                  *
                </span>
              ))}
            </div>
            <span className="text-xs text-slate-600 dark:text-slate-400">({product.ratings.totalReviews})</span>
          </div>
        )}

        <div className="mt-3">
          {product.discountPrice ? (
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">
                {formatCurrency(product.discountPrice)}
              </span>
              <span className="text-xs text-slate-500 line-through dark:text-slate-400 sm:text-sm">
                {formatCurrency(product.price)}
              </span>
            </div>
          ) : (
            <span className="text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">
              {formatCurrency(product.price)}
            </span>
          )}
        </div>

        <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
          {product.stock > 0 ? (
            <span className="text-green-600 dark:text-green-400">In Stock ({product.stock})</span>
          ) : (
            <span className="text-red-600 dark:text-red-400">Out of Stock</span>
          )}
        </div>

        <div className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-center text-xs font-medium text-white sm:text-sm">
          View Product
        </div>
      </div>
    </Link>
  );
}
