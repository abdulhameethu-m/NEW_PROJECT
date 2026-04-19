import { formatCurrency } from "../../utils/formatCurrency";

export function PriceBreakdown({ breakdown }) {
  if (!breakdown) return null;

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Price Details</div>

      <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
        <div className="flex items-center justify-between">
          <span>MRP ({breakdown.itemCount} items)</span>
          <span className="font-medium text-slate-950 dark:text-white">{formatCurrency(breakdown.mrp)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Discount</span>
          <span className="font-medium text-emerald-600 dark:text-emerald-400">- {formatCurrency(breakdown.discount)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Delivery fee</span>
          <span className="font-medium text-slate-950 dark:text-white">
            {breakdown.shippingFee > 0 ? formatCurrency(breakdown.shippingFee) : "Free"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Taxes</span>
          <span className="font-medium text-slate-950 dark:text-white">{formatCurrency(breakdown.taxAmount)}</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-dashed border-slate-200 pt-4 text-base font-semibold text-slate-950 dark:border-slate-800 dark:text-white">
        <span>Total amount</span>
        <span>{formatCurrency(breakdown.totalAmount)}</span>
      </div>

      {breakdown.totalSavings > 0 ? (
        <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          You save {formatCurrency(breakdown.totalSavings)} on this order.
        </div>
      ) : null}
    </div>
  );
}
