import React from "react";
import { formatCurrency } from "../../utils/formatCurrency";

export default function CartSummary({ total, onCheckout, onContinue }) {
  return (
    <div className="sticky bottom-0 z-30 mx-auto w-full max-w-3xl px-3 pb-3">
      <div className="rounded-lg bg-white p-3 shadow-md dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500">Total</div>
          <div className="text-lg font-bold">{formatCurrency(total)}</div>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={onCheckout} className="flex-1 rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white">Checkout</button>
          <button onClick={onContinue} className="rounded-md border border-slate-300 px-4 py-3 text-sm font-semibold">Continue</button>
        </div>
      </div>
    </div>
  );
}
