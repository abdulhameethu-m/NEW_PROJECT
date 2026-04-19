import { StatusBadge } from "./StatusBadge";

export function VendorSection({ title, description, action, children }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function VendorMetricCard({ label, value, hint }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{value}</div>
      {hint ? <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{hint}</div> : null}
    </div>
  );
}

export function VendorDataTable({ columns, rows, emptyMessage = "No records found." }) {
  if (!rows?.length) {
    return <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{emptyMessage}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((row) => (
            <tr key={row.id} className="align-top">
              {columns.map((column) => (
                <td key={column.key} className="px-3 py-3 text-slate-700 dark:text-slate-200">
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function VendorMiniBarChart({ points = [], valueKey = "value" }) {
  const max = Math.max(...points.map((point) => Number(point[valueKey] || 0)), 1);
  return (
    <div className="space-y-3">
      {points.map((point) => (
        <div key={point.label} className="space-y-1">
          <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span>{point.label}</span>
            <span>{point.displayValue ?? point[valueKey]}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-slate-900 dark:bg-white"
              style={{ width: `${Math.max((Number(point[valueKey] || 0) / max) * 100, 4)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function VendorList({ items, renderItem, emptyMessage = "Nothing here yet." }) {
  if (!items?.length) {
    return <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{emptyMessage}</div>;
  }

  return <div className="space-y-3">{items.map(renderItem)}</div>;
}

export function VendorEntityHeader({ title, subtitle, badge }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div>
        <div className="text-sm font-semibold text-slate-950 dark:text-white">{title}</div>
        {subtitle ? <div className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</div> : null}
      </div>
      {badge ? <StatusBadge value={badge} /> : null}
    </div>
  );
}
