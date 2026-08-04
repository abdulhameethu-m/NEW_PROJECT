import React from "react";
import { Link } from "react-router-dom";

export default function CollectionHeader({ title, description, count, imageUrl }) {
  return (
    <header className="mx-auto w-full max-w-3xl px-3 py-3">
      <div className="flex items-center gap-3 rounded-xl bg-white/95 p-3 shadow-sm dark:bg-slate-900/80">
        {imageUrl ? (
          <img loading="lazy" decoding="async" src={imageUrl} alt={title} className="h-16 w-16 flex-shrink-0 rounded-md object-cover" />
        ) : (
          <div className="h-16 w-16 flex-shrink-0 rounded-md bg-slate-100 dark:bg-slate-800" />
        )}

        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold leading-5 text-slate-900 dark:text-slate-100 truncate">{title}</div>
          {description ? (
            <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400 truncate">{description}</p>
          ) : null}
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{count} products</div>
        </div>

        <Link
          to="/shop"
          className="ml-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100"
        >
          Browse
        </Link>
      </div>
    </header>
  );
}
