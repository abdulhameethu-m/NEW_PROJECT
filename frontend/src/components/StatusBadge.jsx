const STATUS_STYLES = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  delivered: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  disabled: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  shipped: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  admin: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  vendor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  user: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export function StatusBadge({ value }) {
  const label = String(value || "unknown");
  const key = label.toLowerCase();
  const tone = STATUS_STYLES[key] || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {label}
    </span>
  );
}
