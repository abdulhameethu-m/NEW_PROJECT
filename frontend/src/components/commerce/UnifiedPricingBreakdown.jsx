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

function BreakdownLine({ component, currency, showDiagnostics }) {
  if (!component) return null;
  return (
    <div className="flex flex-col gap-1 py-2">
      <div className="flex items-center justify-between gap-4">
        <span className="text-[14px] font-medium text-slate-500 dark:text-slate-400">{component.label}</span>
        <span className="text-[15px] font-medium text-slate-900 dark:text-white">{formatCurrency(component.amount || 0, { currency })}</span>
      </div>
      {showDiagnostics && <SourceDetails source={component.source} />}
    </div>
  );
}

export function UnifiedPricingBreakdown({ breakdown, title = "SUMMARY", compact = false, showDiagnostics = false }) {
  if (!breakdown) return null;

  const currency = breakdown.currency || "INR";
  const components = Array.isArray(breakdown.components) ? breakdown.components : [];
  const discounts = Array.isArray(breakdown.discounts) ? breakdown.discounts : [];
  const timeline = Array.isArray(breakdown.timeline) ? breakdown.timeline : [];

  return (
    <section className={`w-full rounded-[1.25rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${compact ? "p-5" : "p-6"}`}>
      <div className="mb-6">
        <h2 className="text-[13px] font-bold uppercase tracking-widest text-slate-900 dark:text-white">{title}</h2>
        {showDiagnostics && (
          <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            {breakdown.version || "pricing-breakdown"}{breakdown.calculatedAt ? ` - ${formatDateTime(breakdown.calculatedAt)}` : ""}
          </div>
        )}
      </div>

      <div className="grid gap-1">
        {components.map((component) => (
          <BreakdownLine key={component.key || component.label} component={component} currency={currency} showDiagnostics={showDiagnostics} />
        ))}

        {discounts.length > 0 && discounts.map((discount) => (
          <div key={discount.key || discount.label} className="flex flex-col gap-1 py-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[14px] font-medium text-emerald-600 dark:text-emerald-400">{discount.label}</span>
              <span className="text-[15px] font-medium text-emerald-600 dark:text-emerald-400">-{formatCurrency(discount.amount || 0, { currency })}</span>
            </div>
          </div>
        ))}

        {breakdown.codAdvance?.enabled && (
          <>
            <div className="flex flex-col gap-1 py-2">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[14px] font-medium text-slate-500 dark:text-slate-400">COD Advance Paid</span>
                <span className="text-[15px] font-medium text-slate-900 dark:text-white">{formatCurrency(breakdown.codAdvance.advanceAmount || 0, { currency })}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1 py-2">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[14px] font-medium text-slate-500 dark:text-slate-400">Balance Collectable</span>
                <span className="text-[15px] font-medium text-slate-900 dark:text-white">{formatCurrency(breakdown.codAdvance.remainingCODAmount || 0, { currency })}</span>
              </div>
              {showDiagnostics && <SourceDetails source={breakdown.codAdvance.source} />}
            </div>
          </>
        )}
      </div>

      <div className="mt-4 border-t border-slate-100 pt-5 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-bold text-slate-900 dark:text-white">Total</span>
          <span className="text-[19px] font-bold tracking-tight text-slate-900 dark:text-white">
            {formatCurrency(breakdown.grandTotal || 0, { currency })}
          </span>
        </div>
      </div>

      {showDiagnostics && timeline.length > 0 && (
        <div className="mt-6 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/70">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400">Pricing timeline</div>
          <div className="mt-3 grid gap-3">
            {timeline.map((event) => (
              <div key={event.key || `${event.label}-${event.timestamp}`} className="grid gap-1 text-sm">
                <div className="font-medium text-slate-950 dark:text-white">{event.label}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {[event.source, formatDateTime(event.timestamp)].filter(Boolean).join(" - ")}
                </div>
                {event.note ? <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{event.note}</div> : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}


