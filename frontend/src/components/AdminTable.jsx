export function AdminTable({ columns, children }) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl lg:rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <table className="min-w-full border-separate border-spacing-0">
        <thead className="bg-slate-50 text-left dark:bg-slate-950">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`whitespace-nowrap px-3 py-2 sm:px-4 sm:py-3 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 ${
                  col.align === "right" ? "text-right" : ""
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">{children}</tbody>
      </table>
    </div>
  );
}

