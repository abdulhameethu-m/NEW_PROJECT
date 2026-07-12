import React from "react";

export default function WishlistHeader({ count }) {
  return (
    <div className="sticky top-0 z-20 bg-transparent">
      <div className="mx-auto w-full max-w-3xl px-3">
        <div className="flex h-14 items-center justify-between gap-2 rounded-b-lg bg-white/95 px-2 py-2 shadow-sm dark:bg-slate-900/80">
          <div className="text-base font-semibold text-slate-900 dark:text-slate-100">Wishlist</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">{count} items</div>
        </div>
      </div>
    </div>
  );
}
