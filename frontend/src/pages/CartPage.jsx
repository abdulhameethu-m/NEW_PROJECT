import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import * as cartService from "../services/cartService";
import { formatCurrency } from "../utils/formatCurrency";

function normalizeError(err) {
  return err?.response?.data?.message || err?.message || "Request failed";
}

export function CartPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [cart, setCart] = useState(null);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const res = await cartService.getCart();
      setCart(res.data);
    } catch (e) {
      setError(normalizeError(e));
      setCart(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const items = useMemo(() => (Array.isArray(cart?.items) ? cart.items : []), [cart]);
  const total = Number(cart?.totalAmount || 0);

  async function changeQty(productId, variantId, nextQty) {
    setBusyId(`${productId}:${variantId || ""}`);
    setError("");
    try {
      const res = await cartService.updateCartItem(productId, nextQty, variantId);
      setCart(res.data);
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setBusyId("");
    }
  }

  async function remove(productId, variantId) {
    setBusyId(`${productId}:${variantId || ""}`);
    setError("");
    try {
      const res = await cartService.removeCartItem(productId, variantId);
      setCart(res.data);
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="grid gap-4 sm:gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Cart</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300">Review items from multiple sellers in one place</p>
        </div>
        <div className="flex-shrink-0">
          <BackButton fallbackTo="/shop" />
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-20 sm:h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 sm:p-8 text-center">
          <div className="text-3xl sm:text-4xl">🛒</div>
          <h3 className="mt-2 text-base sm:text-lg font-semibold text-slate-900 dark:text-white">Your cart is empty</h3>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300">Browse products and add something to your cart</p>
          <Link
            to="/shop"
            className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-blue-700"
          >
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_minmax(300px,380px)]">
          <div className="grid gap-3 sm:gap-4">
            {items.map((item) => {
              const p = item?.productId;
              const id = p?._id || item.productId;
              const name = p?.name || "Product";
              const img = item.image || (Array.isArray(p?.images) && p.images.length ? p.images[0]?.url : "");
              const qty = Number(item.quantity || 1);
              const price = Number(item.price || 0);
              const sellerName = item?.sellerId?.companyName || "";
              const variantLabel = item?.variantTitle || "";
              const variantId = item?.variantId || "";
              const busyKey = `${id}:${variantId}`;
              return (
                <div key={`${String(id)}:${variantId}`} className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex gap-3 sm:gap-4">
                    <div className="h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                      {img ? <img src={img} alt={name} className="h-full w-full object-cover" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="truncate text-sm sm:text-base font-semibold text-slate-950 dark:text-white">{name}</div>
                          {variantLabel ? <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">Variant: {variantLabel}</div> : null}
                          {sellerName ? (
                            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">Seller: {sellerName}</div>
                          ) : null}
                        </div>
                        <div className="text-xs sm:text-sm font-semibold text-slate-950 dark:text-white flex-shrink-0">
                          {formatCurrency(price * qty)}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={busyId === busyKey || qty <= 1}
                          onClick={() => changeQty(String(id), variantId, qty - 1)}
                          className="rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-medium disabled:opacity-50 dark:border-slate-700"
                        >
                          −
                        </button>
                        <div className="min-w-10 sm:min-w-12 rounded-lg border border-slate-200 bg-slate-50 px-2.5 sm:px-3 py-1.5 sm:py-2 text-center text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                          {qty}
                        </div>
                        <button
                          type="button"
                          disabled={busyId === busyKey}
                          onClick={() => changeQty(String(id), variantId, qty + 1)}
                          className="rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-medium disabled:opacity-50 dark:border-slate-700"
                        >
                          +
                        </button>

                        <button
                          type="button"
                          disabled={busyId === busyKey}
                          onClick={() => remove(String(id), variantId)}
                          className="ml-auto rounded-lg border border-rose-200 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900 dark:text-rose-200 dark:hover:bg-rose-950/30"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="h-fit rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:sticky lg:top-4">
            <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">Summary</div>
            <div className="mt-3 flex items-center justify-between text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <span>Total</span>
              <span className="font-semibold text-slate-950 dark:text-white">{formatCurrency(total)}</span>
            </div>
            <button
              type="button"
              onClick={() => navigate("/checkout")}
              className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white hover:bg-blue-700"
            >
              Proceed to Checkout
            </button>
            <button
              type="button"
              onClick={() => navigate("/shop")}
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

