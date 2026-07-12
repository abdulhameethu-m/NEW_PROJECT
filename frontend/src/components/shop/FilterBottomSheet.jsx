import { X } from "lucide-react";

export function FilterBottomSheet({ open, title = "Filters", onClose, onReset, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/40 backdrop-blur-sm md:hidden">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0"
        aria-label="Close filters"
      />
      <div className="relative w-full max-h-[90vh] overflow-hidden rounded-t-3xl bg-white text-slate-900 shadow-2xl dark:bg-slate-950 dark:text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Smart filters in one swipe.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 text-xs dark:border-slate-800">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Reset filters
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex flex-1 items-center justify-center rounded-2xl bg-blue-600 px-3 py-2 font-semibold text-white transition hover:bg-blue-700"
          >
            Apply
          </button>
        </div>
        <div className="max-h-[calc(90vh-132px)] overflow-y-auto px-4 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
