import { Link } from "react-router-dom";

export function EmptyState({ title, actionLabel, actionTo, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
      {Icon ? (
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Icon className="h-5 w-5" />
        </div>
      ) : null}
      <p className="text-sm font-semibold text-slate-950 dark:text-white">{title}</p>
      {actionTo ? (
        <Link
          to={actionTo}
          className="mt-3 inline-flex min-h-10 items-center rounded-full bg-slate-950 px-4 text-sm font-semibold text-white transition active:scale-95 dark:bg-white dark:text-slate-950"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
