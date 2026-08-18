import { useEffect, useState } from "react";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatWeight } from "../../utils/weight";

function AnimatedAmount({ value, freeLabel = "", className = "" }) {
  const numericValue = Number(value || 0);
  const [isChanging, setIsChanging] = useState(false);

  useEffect(() => {
    setIsChanging(true);
    const timer = window.setTimeout(() => setIsChanging(false), 320);
    return () => window.clearTimeout(timer);
  }, [numericValue]);

  return (
    <span
      className={`${className} inline-block transition-all duration-300 ${
        isChanging ? "translate-y-[-1px] scale-[1.03] text-[color:var(--commerce-accent)]" : ""
      }`}
    >
      {numericValue === 0 && freeLabel ? freeLabel : formatCurrency(numericValue)}
    </span>
  );
}

function ChargeRuleTrace({ charge }) {
  const metadata = charge?.metadata || {};
  const rule = metadata.matchedRule || metadata.configuredWeightRule || {};
  const source = charge?.key === "shipping_cost" ? "Admin Shipping" : "Admin Pricing";
  const ruleName =
    charge?.key === "shipping_cost"
      ? [metadata.state || rule.state, metadata.district || rule.district, metadata.zone || rule.zone].filter(Boolean).join(" / ") || "Shipping slab"
      : charge?.displayName || charge?.key;
  const details = [
    ["Source", source],
    ["Rule", ruleName],
    ["Rule ID", rule.id || charge?.id],
    ["Method", metadata.calculationMethod || charge?.type],
    ["Priority", rule.priority ?? charge?.sortOrder],
    ["Status", "Active"],
    ["Weight", metadata.weight ? formatWeight(metadata.weight, "kg") : ""],
    ["Formula", metadata.costBreakdown?.dynamicExpansion?.formula || metadata.costBreakdown?.formula],
  ].filter(([, value]) => value !== undefined && value !== null && value !== "");

  if (!details.length) return null;

  // return (
  //   <div className="mt-2 grid gap-2 rounded-2xl bg-slate-50 p-3 text-xs dark:bg-slate-950/70 sm:grid-cols-2">
  //     {details.map(([label, value]) => (
  //       <div key={label}>
  //         <div className="font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</div>
  //         <div className="mt-1 break-words text-slate-700 dark:text-slate-200">{String(value)}</div>
  //       </div>
  //     ))}
  //   </div>
  // );
}

export function PriceBreakdown({ breakdown }) {
  if (!breakdown) return null;

  const hasDynamicCharges = Array.isArray(breakdown.charges);
  const codAdvance = breakdown.codAdvance || null;
  const hasCodAdvance = codAdvance?.enabled && Number(codAdvance?.advanceAmount || 0) > 0;
  const itemCount = breakdown.itemCount || 1;
  const shippingCharge = hasDynamicCharges
    ? breakdown.charges.find((charge) => charge.key === "shipping_cost")
    : null;
  const shippingCostBreakdown = shippingCharge?.metadata?.costBreakdown || null;
  const nonShippingCharges = hasDynamicCharges
    ? breakdown.charges.filter((charge) => charge.key !== "shipping_cost")
    : [];
  const shippingAmount = Number(shippingCharge?.amount || 0);
  const shippingDiscount = Number(shippingCostBreakdown?.freeShippingDiscount || 0);
  const baseShipping = Number(shippingCostBreakdown?.basePrice || 0);
  const extraShipping = Number(shippingCostBreakdown?.extraCost || 0);
  const isWeightSlabShipping = shippingCostBreakdown?.formula === "WEIGHT_SLAB";

  return (
    <div className="relative z-10 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100/50">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Price Details
        </h2>
      </div>

      <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
        <div className="flex items-center justify-between">
          <span>{hasDynamicCharges ? "Subtotal" : `MRP (${itemCount} ${itemCount === 1 ? "item" : "items"})`}</span>
          <AnimatedAmount
            value={hasDynamicCharges ? breakdown.subtotal || 0 : breakdown.mrp || 0}
            className="font-medium text-slate-950 dark:text-white"
          />
        </div>

        {!hasDynamicCharges && breakdown.discount > 0 ? (
          <div className="flex items-center justify-between">
            <span>Item Discount</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">- <AnimatedAmount value={breakdown.discount} /></span>
          </div>
        ) : null}

        {!hasDynamicCharges && breakdown.discount > 0 ? (
          <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-3 dark:border-slate-800">
            <span>Subtotal</span>
            <AnimatedAmount value={breakdown.subtotal || 0} className="font-medium text-slate-950 dark:text-white" />
          </div>
        ) : null}

        {hasDynamicCharges ? (
          <>
            {shippingCostBreakdown ? (
              <>
                {isWeightSlabShipping ? (
                  <div className="flex items-center justify-between">
                    <span>
                      Shipping slab{" "}
                      <span className="text-xs text-slate-400">
                        ({formatWeight(shippingCostBreakdown.weightFrom, "kg")} - {formatWeight(shippingCostBreakdown.weightTo, "kg")})
                      </span>
                    </span>
                    <AnimatedAmount value={shippingAmount} freeLabel="Free" className="font-medium text-slate-950 dark:text-white" />
                  </div>
                ) : extraShipping > 0 || shippingDiscount > 0 ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span>Base shipping</span>
                      <AnimatedAmount value={baseShipping} className="font-medium text-slate-950 dark:text-white" />
                    </div>

                    {extraShipping > 0 ? (
                      <div className="flex items-center justify-between">
                        <span>Extra weight charge</span>
                        <AnimatedAmount value={extraShipping} className="font-medium text-slate-950 dark:text-white" />
                      </div>
                    ) : null}

                    {shippingDiscount > 0 ? (
                      <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                        <span>Shipping discount</span>
                        <span className="font-medium">- <AnimatedAmount value={shippingDiscount} /></span>
                      </div>
                    ) : null}
                  </>
                ) : null}

                {!isWeightSlabShipping ? (
                  <div className="flex items-center justify-between">
                    <span>Shipping fee</span>
                    <AnimatedAmount value={shippingAmount} freeLabel="Free" className="font-medium text-slate-950 dark:text-white" />
                  </div>
                ) : null}
              </>
            ) : shippingCharge ? (
              <div className="flex items-center justify-between">
                <span>Shipping</span>
                <AnimatedAmount value={shippingAmount} freeLabel="Free" className="font-medium text-slate-950 dark:text-white" />
              </div>
            ) : null}

            {nonShippingCharges.map((charge) => (
              <div key={charge.id || charge.key}>
                <div className="flex items-center justify-between">
                  <span>{charge.displayName || charge.key}</span>
                  <AnimatedAmount value={charge.amount || 0} className="font-medium text-slate-950 dark:text-white" />
                </div>
                <ChargeRuleTrace charge={charge} />
              </div>
            ))}

            <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-3 dark:border-slate-800">
              <span>Total Charges</span>
              <AnimatedAmount value={breakdown.chargesTotal || 0} className="font-medium text-slate-950 dark:text-white" />
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
            <span>Delivery Fee</span>
              <AnimatedAmount value={breakdown.deliveryFee || 0} freeLabel="Free" className="font-medium text-slate-950 dark:text-white" />
            </div>

            {breakdown.platformFee > 0 ? (
              <div className="flex items-center justify-between">
                <span>Platform Fee</span>
                <span className="font-medium text-slate-950 dark:text-white">+ <AnimatedAmount value={breakdown.platformFee} /></span>
              </div>
            ) : null}

            {breakdown.handlingFee > 0 ? (
              <div className="flex items-center justify-between">
                <span>Handling Charge</span>
                <span className="font-medium text-slate-950 dark:text-white">+ <AnimatedAmount value={breakdown.handlingFee} /></span>
              </div>
            ) : null}

            <div className="flex items-center justify-between">
              <span>Taxes & Fees</span>
              <AnimatedAmount value={breakdown.taxAmount || 0} className="font-medium text-slate-950 dark:text-white" />
            </div>
          </>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-base font-bold text-slate-900 dark:border-slate-800 dark:text-white">
        <span>Total Amount</span>
        <AnimatedAmount value={breakdown.totalAmount || 0} className="text-xl tracking-tight" />
      </div>

      {!hasDynamicCharges && breakdown.totalSavings > 0 ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-green-50/80 px-4 py-3 text-sm font-semibold text-green-700 border border-green-100/50 dark:bg-green-500/10 dark:text-green-400">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          You are saving {formatCurrency(breakdown.totalSavings)} on this order
        </div>
      ) : null}

      {hasCodAdvance ? (
        <div className="mt-4 space-y-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
          <div className="flex items-center justify-between">
            <span className="font-semibold">COD Advance Pay Now</span>
            <AnimatedAmount value={codAdvance.advanceAmount || 0} className="font-bold" />
          </div>
          <div className="flex items-center justify-between">
            <span>Balance on Delivery</span>
            <AnimatedAmount value={codAdvance.remainingCODAmount || 0} className="font-semibold" />
          </div>
        </div>
      ) : null}

      {shippingCharge?.metadata?.weight ? (
        <div className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Shipment weight: {formatWeight(shippingCharge.metadata.weight, "kg")}
        </div>
      ) : null}

      {shippingCharge ? <ChargeRuleTrace charge={shippingCharge} /> : null}

      {!hasDynamicCharges && breakdown.deliveryFee === 0 && breakdown.mrp > 0 ? (
        <div className="mt-4 rounded-xl bg-blue-50/80 px-4 py-3 text-sm font-medium text-blue-700 border border-blue-100/50 dark:bg-blue-500/10 dark:text-blue-300">
          Qualified for free delivery!
        </div>
      ) : null}

      {shippingCharge?.metadata?.matchType?.startsWith("zone_fallback") ? (
        <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
          Shipping matched a fallback rule for {shippingCharge.metadata.state} because no exact {shippingCharge.metadata.zone} zone rule was found.
        </div>
      ) : null}

    </div>
  );
}
