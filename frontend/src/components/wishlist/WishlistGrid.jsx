import React from "react";
import WishlistCard from "./WishlistCard";

export default function WishlistGrid({ items, loading, busyId, onMoveToCart, onRemove }) {
  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-3">
        <div className="mt-3 grid grid-cols-2 gap-[10px]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-3">
      <div className="mt-3 grid grid-cols-2 gap-[10px]">
        {items.map((item) => (
          <WishlistCard
            key={item._id || item.productId}
            item={item}
            onMoveToCart={onMoveToCart}
            onRemove={onRemove}
            busy={String(busyId) === String(item._id || item.productId)}
          />
        ))}
      </div>
    </div>
  );
}
