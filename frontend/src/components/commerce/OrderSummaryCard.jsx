import { formatCurrency } from "../../utils/formatCurrency";
import { resolveApiAssetUrl } from "../../utils/resolveUrl";

export function OrderSummaryCard({ item, onQuantityChange, busy = false, editable = true }) {
  const itemTotal = Number(item?.price || 0) * Number(item?.quantity || 0);

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex gap-4">
        <div className="h-24 w-24 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
          {item?.image ? (
            <img src={resolveApiAssetUrl(item.image)} alt={item?.name || "Product"} className="h-full w-full object-cover" />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-sm font-semibold text-slate-950 dark:text-white">{item?.name}</div>
          <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Unit price: {formatCurrency(item?.price || 0)}</div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {editable ? (
              <div className="inline-flex items-center rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-950">
                <button
                  type="button"
                  onClick={() => onQuantityChange?.(Math.max(1, Number(item?.quantity || 1) - 1))}
                  disabled={busy || Number(item?.quantity || 1) <= 1}
                  className="h-9 w-9 rounded-xl text-sm font-semibold text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  -
                </button>
                <span className="min-w-10 text-center text-sm font-semibold text-slate-950 dark:text-white">{item?.quantity || 1}</span>
                <button
                  type="button"
                  onClick={() => onQuantityChange?.(Number(item?.quantity || 1) + 1)}
                  disabled={busy}
                  className="h-9 w-9 rounded-xl text-sm font-semibold text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  +
                </button>
              </div>
            ) : (
              <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                Qty: {item?.quantity || 1}
              </div>
            )}

            <div className="text-base font-semibold text-slate-950 dark:text-white">{formatCurrency(itemTotal)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
