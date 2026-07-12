import React from "react";

export default function CollectionToolbar({ count }) {
  return (
    <div className="sticky top-0 z-20 bg-transparent">
      <div className="mx-auto w-full max-w-3xl px-3">
        <div className="flex h-12 items-center justify-between gap-2 rounded-b-lg bg-white/95 px-2 py-2 shadow-sm dark:bg-slate-900/80">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{count} products</div>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Sort" className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs bg-slate-100 dark:bg-slate-800">
              Sort
            </button>
            <button type="button" aria-label="Filter" className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs bg-slate-100 dark:bg-slate-800">
              Filter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
