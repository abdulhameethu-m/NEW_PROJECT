import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatCurrency } from "../utils/formatCurrency";
import { resolveApiAssetUrl } from "../utils/resolveUrl";
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <WishlistHeader count={wishlistItems.length} />

      {error ? <div className="mx-auto w-full max-w-3xl px-3 pt-3"> <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div></div> : null}

      {loading ? (
        <WishlistSkeleton />
      ) : wishlistItems.length ? (
        <WishlistGrid items={wishlistItems} loading={loading} busyId={busyProductId} onMoveToCart={moveToCart} onRemove={removeItem} />
      ) : (
        <EmptyWishlist />
      )}
    </div>
  );
}
