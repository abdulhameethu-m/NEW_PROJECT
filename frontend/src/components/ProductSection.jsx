import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as productService from "../services/productService";
import { formatCurrency } from "../utils/formatCurrency";

export function ProductSection({ title, icon, sortBy = "createdAt", limit = 8 }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const res = await productService.getPublicProducts({
          limit,
          sortBy,
          sortOrder: sortBy === "createdAt" ? "desc" : "asc",
          page: 1,
        });
        setProducts(res.data.products);
      } catch (err) {
        setError("Failed to load products");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [sortBy, limit]);

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between px-4 sm:px-0">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
            {title}
          </h2>
        </div>
        <Link
          to={`/shop?sortBy=${sortBy}`}
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm sm:text-base font-medium"
        >
          View All →
        </Link>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 animate-pulse"
            >
              <div className="h-40 bg-slate-200 dark:bg-slate-700 rounded-lg mb-3" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Products Grid */}
      {!loading && products.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && products.length === 0 && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-8 text-center">
          <p className="text-slate-600 dark:text-slate-400">No products available</p>
        </div>
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
      className="group overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:scale-105"
    >
      {/* Image Container */}
      <div className="relative overflow-hidden bg-slate-100 dark:bg-slate-800 h-40 sm:h-48">
        {product.images?.[0]?.url ? (
          <img
            src={product.images[0].url}
            alt={product.name}
            className="h-full w-full object-cover group-hover:scale-110 transition duration-300"
          />
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400">No Image</div>
        )}

        {/* Discount Badge */}
        {discountPercent > 0 && (
          <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-md text-xs font-bold">
            -{discountPercent}%
          </div>
        )}

        {/* Stock Badge */}
        <div className="absolute top-2 left-2">
          {product.stock > 0 ? (
            <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">
              In Stock
            </span>
          ) : (
            <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-medium">
              Out of Stock
            </span>
          )}
        </div>
      </div>

      {/* Info Container */}
      <div className="p-3 sm:p-4 space-y-2">
        {/* Product Name */}
        <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">
          {product.name}
        </h3>

        {/* Category */}
        <p className="text-xs text-slate-500 dark:text-slate-400">{product.category}</p>

        {/* Rating */}
        {product.ratings?.averageRating > 0 && (
          <div className="flex items-center gap-1">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={i < Math.round(product.ratings.averageRating) ? "text-yellow-400" : "text-slate-300 dark:text-slate-600"}
                >
                  ★
                </span>
              ))}
            </div>
            <span className="text-xs text-slate-600 dark:text-slate-400">
              ({product.ratings.totalReviews})
            </span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center gap-2">
          <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
            {formatCurrency(product.discountPrice || product.price)}
          </span>
          {product.discountPrice && (
            <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-through">
              {formatCurrency(product.price)}
            </span>
          )}
        </div>

        {/* Quick Action Button */}
        <button className="mt-3 w-full bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white py-2 rounded-lg text-xs sm:text-sm font-medium transition disabled:opacity-50"
          disabled={product.stock === 0}
        >
          {product.stock > 0 ? "Add to Cart" : "Unavailable"}
        </button>
      </div>
    </Link>
  );
}
