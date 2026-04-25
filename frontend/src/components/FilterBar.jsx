export function FilterBar({ children, actions = null }) {
  return (
    <div className="flex flex-col gap-3 rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">{children}</div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
