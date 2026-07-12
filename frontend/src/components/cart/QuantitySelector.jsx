import React from "react";

export default function QuantitySelector({ qty, onDecrease, onIncrease, busy }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onDecrease}
        disabled={busy || qty <= 1}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-sm disabled:opacity-50"
        aria-label="Decrease quantity"
      >
        −
      </button>
      <div className="w-10 text-center text-sm font-semibold">{qty}</div>
      <button
        type="button"
        onClick={onIncrease}
        disabled={busy}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-sm disabled:opacity-50"
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
