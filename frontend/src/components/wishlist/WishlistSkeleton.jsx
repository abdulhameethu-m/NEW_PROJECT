import React from "react";

export default function WishlistSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl px-3">
      <div className="mt-3 h-24 w-full animate-pulse rounded-lg bg-slate-100" />
      <div className="mt-3 grid grid-cols-2 gap-[10px]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-44 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    </div>
  );
}
