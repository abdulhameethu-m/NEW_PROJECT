import { Trash2 } from "lucide-react";
import { formatCurrency } from "../../utils/formatCurrency";
import { resolveApiAssetUrl } from "../../utils/resolveUrl";
import { formatWeight, getWeightUnit, getWeightValue } from "../../utils/weight";
import { SellerNameLink, VisitStoreButton } from "../seller/SellerNavigation";

export function OrderSummaryCard({
  item,
  onQuantityChange,
  onRemove,
  busy = false,
  editable = true,
}) {
  const itemTotal = Number(item?.price || 0) * Number(item?.quantity || 0);
  const unitWeight = getWeightValue(item);
  const weightUnit = getWeightUnit(item);
  const totalWeight = unitWeight * Number(item?.quantity || 0);

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col sm:flex-row gap-5">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
          {item?.image ? (
            <img loading="lazy" decoding="async" src={resolveApiAssetUrl(item.image)} alt={item?.name || "Product"} className="h-full w-full object-cover" />
          ) : null}
        </div>

        <div className="flex flex-1 flex-col justify-between min-w-0">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            <div>
              <div className="line-clamp-2 text-lg font-bold text-slate-900 dark:text-white">{item?.name}</div>
              {item?.variantTitle ? <div className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Variant: {item.variantTitle}</div> : null}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <SellerNameLink seller={item?.seller || item?.sellerId} />
                <VisitStoreButton seller={item?.seller || item?.sellerId}>View Seller</VisitStoreButton>
              </div>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-4 shrink-0">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Unit Price</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(item?.price || 0)}</div>
                  </div>
                </div>
                
                {unitWeight > 0 ? (
                  <>
                    <div className="hidden sm:block h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Weight</div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">{formatWeight(unitWeight, weightUnit)}</div>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>

              <div className="flex items-center gap-4">
                {editable ? (
                  <div className="inline-flex items-center rounded-2xl border border-indigo-100 bg-white dark:border-slate-700 dark:bg-slate-900">
                    <button
                      type="button"
                      onClick={() => onQuantityChange?.(Math.max(1, Number(item?.quantity || 1) - 1))}
                      disabled={busy || Number(item?.quantity || 1) <= 1}
                      className="flex h-10 w-10 items-center justify-center text-lg font-medium text-indigo-600 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-indigo-400 dark:hover:bg-slate-800 rounded-l-2xl transition-colors"
                    >
                      -
                    </button>
                    <span className="min-w-[2rem] text-center text-sm font-bold text-slate-900 dark:text-white">{item?.quantity || 1}</span>
                    <button
                      type="button"
                      onClick={() => onQuantityChange?.(Number(item?.quantity || 1) + 1)}
                      disabled={busy}
                      className="flex h-10 w-10 items-center justify-center text-lg font-medium text-indigo-600 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-indigo-400 dark:hover:bg-slate-800 rounded-r-2xl transition-colors"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-indigo-100 bg-white px-4 py-2 text-sm font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                    Qty: {item?.quantity || 1}
                  </div>
                )}

                {editable ? (
                  <button
                    type="button"
                    onClick={() => onRemove?.()}
                    disabled={busy}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-900/50"
                    aria-label={`Remove ${item?.name || "item"} from checkout`}
                    title="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}

                <div className="text-lg font-black tracking-tight text-slate-900 dark:text-white min-w-[5rem] text-right">
                  {formatCurrency(itemTotal)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
