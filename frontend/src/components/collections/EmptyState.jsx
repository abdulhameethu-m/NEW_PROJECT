import React from "react";
import { Link } from "react-router-dom";

export default function EmptyState({ title = "No products available" }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-3 py-8">
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto mb-4 h-24 w-24 rounded-full bg-slate-100 dark:bg-slate-800" />
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Try browsing other collections or categories.</p>
        <div className="mt-4">
          <Link to="/shop" className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Browse Collections
          </Link>
        </div>
      </div>
    </div>
  );
}
