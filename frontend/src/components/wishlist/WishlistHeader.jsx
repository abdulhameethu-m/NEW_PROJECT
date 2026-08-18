import React from "react";
import { Heart, ShoppingBag } from "lucide-react";

export default function WishlistHeader({ count }) {
  return (
    <div className="mb-8 flex items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Wishlist</h1>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-500/10">
            <Heart className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
        <p className="mt-1 text-[15px] font-medium text-slate-500 dark:text-slate-400">
          Your saved favorites, ready when you are.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
        <ShoppingBag className="h-4 w-4" />
        {count} items
      </div>
    </div>
  );
}
