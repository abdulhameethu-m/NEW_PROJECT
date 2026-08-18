import React from "react";
import { Link } from "react-router-dom";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { formatCurrency } from "../../utils/formatCurrency";
import { resolveApiAssetUrl } from "../../utils/resolveUrl";

export default function WishlistCard({ item, onMoveToCart, onRemove, busy }) {
  const product = item.product || item;
  const image = resolveApiAssetUrl(product?.images?.[0]?.url || item?.image || "");
  const basePrice = product?.discountPrice || product?.price || 0;

  return (
    <div className="group relative flex flex-col rounded-[1.25rem] border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <button
        type="button"
        onClick={() => onRemove(product?._id || item.productId)}
        disabled={busy}
        className="absolute right-5 top-5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm transition hover:scale-110 dark:bg-slate-800"
      >
        <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
      </button>

      <Link to={`/product/${product?._id || item.productId}`} className="block w-full overflow-hidden rounded-xl bg-[#f8f9fa] dark:bg-slate-800" style={{ aspectRatio: "1/1" }}>
        {image ? <img loading="lazy" decoding="async" src={image} alt={product?.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /> : null}
      </Link>

      <div className="mt-4 flex flex-1 flex-col px-1">
        <div className="text-[12px] font-medium text-slate-500 line-clamp-1">{product?.brand || product?.category || "Category"}</div>
        <div className="mt-1 text-[14px] font-bold text-slate-900 line-clamp-1 dark:text-white">{product?.name}</div>
        <div className="mt-1.5 text-[14px] font-bold text-slate-900 dark:text-white">{formatCurrency(basePrice)}</div>
      </div>

      <div className="mt-4 flex items-center gap-2 px-1 pb-1">
        <button
          type="button"
          onClick={() => onMoveToCart(product?._id || item.productId)}
          disabled={busy}
          className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-[13px] font-bold text-white transition hover:bg-indigo-700 active:scale-95 disabled:opacity-60 dark:bg-indigo-500"
        >
          <ShoppingCart className="h-4 w-4" />
          Move to cart
        </button>
        <button
          type="button"
          onClick={() => onRemove(product?._id || item.productId)}
          disabled={busy}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-500 transition hover:bg-rose-50 active:scale-95 disabled:opacity-60 dark:border-rose-900/30 dark:bg-slate-900 dark:hover:bg-rose-900/20"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
