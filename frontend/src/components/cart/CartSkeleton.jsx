import React from "react";

export default function CartSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl px-3">
      <div className="mt-3 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg bg-slate-100 p-3 animate-pulse">
            <div className="h-[90px] w-[90px] rounded-md bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-slate-200" />
              <div className="h-4 w-1/2 rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
