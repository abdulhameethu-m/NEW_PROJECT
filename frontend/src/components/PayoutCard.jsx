import { formatCurrency } from "../utils/formatCurrency";

export function PayoutCard({ label, value, hint, accent = "bg-slate-900 text-white" }) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className={`inline-flex rounded-xl px-3 py-1 text-xs font-semibold ${accent}`}>{label}</div>
      <div className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">{formatCurrency(value || 0)}</div>
      {hint ? <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{hint}</div> : null}
    </div>
  );
}
