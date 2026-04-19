import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getUserWishlist,
  moveWishlistItemToCart,
  removeUserWishlist,
} from "../services/userService";
import { formatCurrency } from "../utils/formatCurrency";
import { resolveApiAssetUrl } from "../utils/resolveUrl";

function normalizeError(err) {
  return err?.response?.data?.message || err?.message || "Failed to load wishlist.";
}

export function WishlistPage() {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyProductId, setBusyProductId] = useState("");
  const [error, setError] = useState("");

  async function loadWishlist() {
    setLoading(true);
    try {
      const response = await getUserWishlist();
      setWishlistItems(response.data || []);
      setError("");
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWishlist();
  }, []);

  async function removeItem(productId) {
    setBusyProductId(productId);
    try {
      await removeUserWishlist(productId);
      setWishlistItems((current) => current.filter((item) => item.product?._id !== productId));
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setBusyProductId("");
    }
  }

  async function moveToCart(productId) {
    setBusyProductId(productId);
    try {
      const response = await moveWishlistItemToCart(productId);
      setWishlistItems(response.data || []);
      setError("");
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setBusyProductId("");
    }
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">Wishlist</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Save products for later and move them back into your cart when you are ready.</p>
      </div>

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-80 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : wishlistItems.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {wishlistItems.map((item) => {
            const product = item.product;
            const image = resolveApiAssetUrl(product?.images?.[0]?.url);
            return (
              <div key={item._id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <Link to={`/product/${product?._id}`} className="block aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
                  {image ? <img src={image} alt={product?.name || "Wishlist item"} className="h-full w-full object-cover" /> : null}
                </Link>
                <div className="grid gap-3 p-5">
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{product?.category || "Product"}</div>
                    <div className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">{product?.name}</div>
                    <div className="mt-2 text-base font-bold text-slate-950 dark:text-white">
                      {formatCurrency(product?.discountPrice || product?.price || 0)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busyProductId === product?._id || product?.stock <= 0}
                      onClick={() => moveToCart(product?._id)}
                      className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {product?.stock <= 0 ? "Out of stock" : "Move to cart"}
                    </button>
                    <button
                      type="button"
                      disabled={busyProductId === product?._id}
                      onClick={() => removeItem(product?._id)}
                      className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          Your wishlist is empty. Save products from the storefront to see them here.
        </div>
      )}
    </div>
  );
}
