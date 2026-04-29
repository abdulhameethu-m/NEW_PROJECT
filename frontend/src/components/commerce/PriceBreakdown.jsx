import { formatCurrency } from "../../utils/formatCurrency";

export function PriceBreakdown({ breakdown }) {
  if (!breakdown) return null;

  const hasDynamicCharges = Array.isArray(breakdown.charges);
  const itemCount = breakdown.itemCount || 1;

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        Price Breakdown
      </div>

      <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
        <div className="flex items-center justify-between">
          <span>{hasDynamicCharges ? "Subtotal" : `MRP (${itemCount} ${itemCount === 1 ? "item" : "items"})`}</span>
          <span className="font-medium text-slate-950 dark:text-white">
            {formatCurrency(hasDynamicCharges ? breakdown.subtotal || 0 : breakdown.mrp || 0)}
          </span>
        </div>

        {!hasDynamicCharges && breakdown.discount > 0 ? (
          <div className="flex items-center justify-between">
            <span>Item Discount</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">- {formatCurrency(breakdown.discount)}</span>
          </div>
        ) : null}

        {!hasDynamicCharges && breakdown.discount > 0 ? (
          <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-3 dark:border-slate-800">
            <span>Subtotal</span>
            <span className="font-medium text-slate-950 dark:text-white">{formatCurrency(breakdown.subtotal || 0)}</span>
          </div>
        ) : null}

        {hasDynamicCharges ? (
          breakdown.charges.length > 0 ? (
            breakdown.charges.map((charge) => (
              <div key={charge.id || charge.key} className="flex items-center justify-between">
                <span>{charge.displayName || charge.key}</span>
                <span className="font-medium text-slate-950 dark:text-white">{formatCurrency(charge.amount || 0)}</span>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-between">
              <span>Additional Charges</span>
              <span className="font-medium text-slate-950 dark:text-white">Free</span>
            </div>
          )
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span>Delivery Fee</span>
              <span className="font-medium text-slate-950 dark:text-white">
                {breakdown.deliveryFee > 0 ? formatCurrency(breakdown.deliveryFee) : "Free"}
              </span>
            </div>

            {breakdown.platformFee > 0 ? (
              <div className="flex items-center justify-between">
                <span>Platform Fee</span>
                <span className="font-medium text-slate-950 dark:text-white">+ {formatCurrency(breakdown.platformFee)}</span>
              </div>
            ) : null}

            {breakdown.handlingFee > 0 ? (
              <div className="flex items-center justify-between">
                <span>Handling Charge</span>
                <span className="font-medium text-slate-950 dark:text-white">+ {formatCurrency(breakdown.handlingFee)}</span>
              </div>
            ) : null}

            <div className="flex items-center justify-between">
              <span>Taxes & Fees</span>
              <span className="font-medium text-slate-950 dark:text-white">{formatCurrency(breakdown.taxAmount || 0)}</span>
            </div>
          </>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-dashed border-slate-200 pt-4 text-base font-semibold text-slate-950 dark:border-slate-800 dark:text-white">
        <span>Total Amount</span>
        <span className="text-lg">{formatCurrency(breakdown.totalAmount || 0)}</span>
      </div>

      {!hasDynamicCharges && breakdown.totalSavings > 0 ? (
        <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          You save {formatCurrency(breakdown.totalSavings)} on this order!
        </div>
      ) : null}

      {!hasDynamicCharges && breakdown.deliveryFee === 0 && breakdown.mrp > 0 ? (
        <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
          Qualified for free delivery!
        </div>
      ) : null}
    </div>
  );
}
