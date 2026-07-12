import React from "react";
import { formatCurrency } from "../../utils/formatCurrency";
import { resolveApiAssetUrl } from "../../utils/resolveUrl";
import QuantitySelector from "./QuantitySelector";
import { Trash2 } from "lucide-react";

export default function CartCard({ item, busyId, onIncrease, onDecrease, onRemove }) {
  const p = item?.productId || item;
  const id = p?._id || item.productId;
  const name = p?.name || item?.name || "Product";
  const img = item.image || (Array.isArray(p?.images) && p.images.length ? p.images[0]?.url : "");
  const qty = Number(item.quantity || 1);
  const price = Number(item.price || 0);
  const variantLabel = item?.variantTitle || "";
  const busyKey = `${id}:${item?.variantId || ""}`;

  return (
    <div className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
      <div className="h-[90px] w-[90px] flex-shrink-0 overflow-hidden rounded-md bg-slate-100">
        {img ? <img src={resolveApiAssetUrl(img)} alt={name} className="h-full w-full object-contain p-2" /> : null}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] text-slate-500">{p?.brand || p?.category || ''}</div>
        <div className="mt-1 text-[14px] font-semibold line-clamp-2">{name}</div>
        {variantLabel ? <div className="mt-1 text-[12px] text-slate-500">{variantLabel}</div> : null}
        <div className="mt-2 flex items-center justify-between">
          <div>
            <div className="text-[18px] font-bold">{formatCurrency(price * qty)}</div>
            <div className="text-[12px] text-slate-500">{formatCurrency(price)} each</div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <QuantitySelector
              qty={qty}
              busy={String(busyId) === busyKey}
              onDecrease={() => onDecrease(String(id), item?.variantId || "", qty - 1)}
              onIncrease={() => onIncrease(String(id), item?.variantId || "", qty + 1)}
            />
            <button
              onClick={() => onRemove(String(id), item?.variantId || "")}
              aria-label="Remove item"
              className="inline-flex items-center justify-center rounded-md border border-slate-200 p-2 text-slate-700 dark:border-slate-700"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
