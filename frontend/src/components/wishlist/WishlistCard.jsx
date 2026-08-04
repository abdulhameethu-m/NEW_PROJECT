import React from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { formatCurrency } from "../../utils/formatCurrency";
import { resolveApiAssetUrl } from "../../utils/resolveUrl";

export default function WishlistCard({ item, onMoveToCart, onRemove, busy }) {
  const product = item.product || item;
  const image = resolveApiAssetUrl(product?.images?.[0]?.url || item?.image || "");
  const basePrice = product?.discountPrice || product?.price || 0;

  return (
    <div className="rounded-xl bg-white p-2 shadow-sm dark:bg-slate-900">
      <div className="flex flex-col">
        <Link to={`/product/${product?._id || item.productId}`} className="block w-full">
          <div className="w-full overflow-hidden rounded-md bg-slate-100" style={{ aspectRatio: "3/4" }}>
            {image ? <img loading="lazy" decoding="async" src={image} alt={product?.name} className="h-full w-full object-contain p-2" /> : null}
          </div>
        </Link>
        <div className="mt-2 flex flex-col gap-1">
          <div className="text-[12px] font-medium text-slate-500 line-clamp-1">{product?.brand || product?.category || ""}</div>
          <div className="text-[14px] font-semibold text-slate-900 line-clamp-2">{product?.name}</div>
          <div className="mt-1 text-[14px] font-bold text-slate-900">{formatCurrency(basePrice)}</div>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onMoveToCart(product?._id || item.productId)}
              disabled={busy}
              className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Move to cart
            </button>
            <button
              type="button"
              onClick={() => onRemove(product?._id || item.productId)}
              disabled={busy}
              aria-label="Remove"
              className="inline-flex items-center justify-center rounded-md border border-slate-200 p-2 text-slate-700 dark:border-slate-700"
            >
              <Heart size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
