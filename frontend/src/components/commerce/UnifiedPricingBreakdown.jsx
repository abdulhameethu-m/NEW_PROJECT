import { formatCurrency } from "../../utils/formatCurrency";

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function DetailPill({ label, value }) {
  if (value === undefined || value === null || value === "") return null;
  const display = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950">
      <div className="font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className="mt-1 break-words text-slate-700 dark:text-slate-200">{display}</div>
    </div>
  );
}

function SourceDetails({ source }) {
  if (!source || !Object.keys(source).length) return null;
  return (
    <div className="mt-2 grid gap-2 rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/70 sm:grid-cols-2">
      <DetailPill label="Configured by" value={source.configuredBy} />
      <DetailPill label="Source" value={source.configurationSource} />
      <DetailPill label="Rule" value={source.ruleName} />
      <DetailPill label="Rule ID" value={source.ruleId} />
      <DetailPill label="Method" value={source.calculationMethod} />
      <DetailPill label="Priority" value={source.priority} />
      <DetailPill label="Status" value={source.status} />
      <DetailPill label="Category" value={source.category} />
      <DetailPill label="Payment method" value={source.paymentMethod} />
      <DetailPill label="State" value={source.state} />
      <DetailPill label="District" value={source.district} />
      <DetailPill label="Shipping zone" value={source.shippingZone} />
      <DetailPill label="Shipment weight" value={source.shipmentWeight} />
      <DetailPill label="Weight slab" value={source.matchedWeightSlab} />
      <DetailPill label="Fallback" value={source.fallbackApplied} />
      <DetailPill label="Dynamic expansion" value={source.dynamicExpansionApplied} />
      <DetailPill label="Formula" value={source.expansionFormula || source.costFormula} />
    </div>
  );
}

function BreakdownLine({ component, currency }) {
  if (!component) return null;
  return (
    <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium text-slate-950 dark:text-white">{component.label}</div>
          <div className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">{component.type}</div>
        </div>
        <div className="text-right font-semibold text-slate-950 dark:text-white">
          {formatCurrency(component.amount || 0, { currency })}
        </div>
      </div>
      <SourceDetails source={component.source} />
    </div>
  );
}

export function UnifiedPricingBreakdown({ breakdown, title = "Pricing Breakdown", compact = false }) {
  if (!breakdown) return null;

  const currency = breakdown.currency || "INR";
  const components = Array.isArray(breakdown.components) ? breakdown.components : [];
  const discounts = Array.isArray(breakdown.discounts) ? breakdown.discounts : [];
  const timeline = Array.isArray(breakdown.timeline) ? breakdown.timeline : [];

  return (
    <section className={`rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${compact ? "p-4" : "p-5"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950 dark:text-white">{title}</h2>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {breakdown.version || "pricing-breakdown"}{breakdown.calculatedAt ? ` - ${formatDateTime(breakdown.calculatedAt)}` : ""}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Grand total</div>
          <div className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
            {formatCurrency(breakdown.grandTotal || 0, { currency })}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {components.map((component) => (
          <BreakdownLine key={component.key || component.label} component={component} currency={currency} />
        ))}
      </div>

      {discounts.length ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
          {discounts.map((discount) => (
            <div key={discount.key || discount.label} className="flex items-center justify-between gap-3">
              <span>{discount.label}</span>
              <span>-{formatCurrency(discount.amount || 0, { currency })}</span>
            </div>
          ))}
        </div>
      ) : null}

      {breakdown.codAdvance?.enabled ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <div className="flex items-center justify-between gap-3 font-semibold">
            <span>COD Advance Paid</span>
            <span>{formatCurrency(breakdown.codAdvance.advanceAmount || 0, { currency })}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span>Balance Collectable</span>
            <span>{formatCurrency(breakdown.codAdvance.remainingCODAmount || 0, { currency })}</span>
          </div>
          <SourceDetails source={breakdown.codAdvance.source} />
        </div>
      ) : null}

      <div className="mt-4 grid gap-2 border-t border-slate-200 pt-4 text-sm dark:border-slate-800">
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
          <span>Total charges</span>
          <span>{formatCurrency(breakdown.totalCharges || 0, { currency })}</span>
        </div>
        <div className="flex items-center justify-between font-semibold text-slate-950 dark:text-white">
          <span>Grand total</span>
          <span>{formatCurrency(breakdown.grandTotal || 0, { currency })}</span>
        </div>
      </div>

      {timeline.length ? (
        <div className="mt-4 rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/70">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Pricing timeline</div>
          <div className="mt-3 grid gap-3">
            {timeline.map((event) => (
              <div key={event.key || `${event.label}-${event.timestamp}`} className="grid gap-1 text-sm">
                <div className="font-medium text-slate-950 dark:text-white">{event.label}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {[event.source, formatDateTime(event.timestamp)].filter(Boolean).join(" - ")}
                </div>
                {event.note ? <div className="text-slate-600 dark:text-slate-300">{event.note}</div> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}


