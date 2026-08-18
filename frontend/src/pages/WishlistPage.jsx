import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, ArrowRight } from "lucide-react";
import { useWishlist } from "../hooks/useWishlist";
import { useCart } from "../hooks/useCart";
import { getCartErrorMessage } from "../utils/cartErrors";
import WishlistHeader from "../components/wishlist/WishlistHeader";
import WishlistGrid from "../components/wishlist/WishlistGrid";
import WishlistSkeleton from "../components/wishlist/WishlistSkeleton";
import EmptyWishlist from "../components/wishlist/EmptyWishlist";

function normalizeError(err, fallback = "Failed to load wishlist.") {
  return getCartErrorMessage(err, fallback);
}

export function WishlistPage() {
  const [busyProductId, setBusyProductId] = useState("");
  const [error, setError] = useState("");
  const { wishlist, loading, removeItem: removeWishlistItem, validateWishlist } = useWishlist();
  const { addItem: addCartItem } = useCart();
  const wishlistItems = wishlist?.items || [];

  const loadWishlist = useCallback(async () => {
    try {
      await validateWishlist();
      setError("");
    } catch (err) {
      setError(normalizeError(err));
    }
  }, [validateWishlist]);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  async function removeItem(productId) {
    setBusyProductId(productId);
    try {
      await removeWishlistItem(productId);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setBusyProductId("");
    }
  }

  async function moveToCart(productId) {
    setBusyProductId(productId);
    try {
      const item = wishlistItems.find((wishlistItem) => {
        const itemProductId = wishlistItem.product?._id || wishlistItem.productId;
        return String(itemProductId) === String(productId);
      });
      await addCartItem(productId, 1, item?.variantId || "");
      await removeWishlistItem(productId);
      setError("");
    } catch (err) {
      setError(normalizeError(err, "Failed to move item to cart."));
    } finally {
      setBusyProductId("");
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
      <WishlistHeader count={wishlistItems.length} />

      {error ? <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      {loading ? (
        <WishlistSkeleton />
      ) : wishlistItems.length ? (
        <>
          <WishlistGrid items={wishlistItems} loading={loading} busyId={busyProductId} onMoveToCart={moveToCart} onRemove={removeItem} />
          <div className="mt-8 flex flex-col items-start gap-4 rounded-2xl bg-indigo-50/50 p-6 dark:bg-indigo-500/5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20">
                <Heart className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Can't find what you're looking for?</h3>
                <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400">Explore more products and add them to your wishlist.</p>
              </div>
            </div>
            <Link to="/" className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-5 text-[13px] font-bold text-indigo-600 shadow-sm transition hover:bg-slate-50 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-indigo-400 dark:hover:bg-slate-800 sm:shrink-0">
              Shop Now <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </>
      ) : (
        <EmptyWishlist />
      )}
    </div>
  );
}
