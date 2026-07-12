import React from "react";

export default function CollectionSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl px-3 pb-8">
      <div className="animate-pulse">
        <div className="h-24 w-full rounded-lg bg-slate-100" />
        <div className="mt-3 grid grid-cols-2 gap-[10px]">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-44 rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
