import { useEffect, useState } from "react";

export function RefundModal({ open, loading = false, payment = null, onClose, onSubmit }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) return;
    setAmount(payment?.amount ? String(payment.amount) : "");
    setReason("");
  }, [open, payment]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
      <div className="w-full max-w-md rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Initiate refund</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Refunds are validated on the backend against captured payment value.</p>

        <div className="mt-4 grid gap-3">
          <label className="grid gap-1">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Amount</span>
            <input
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Reason</span>
            <textarea
              rows={4}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"
              placeholder="Customer return approved, payment anomaly, duplicate charge..."
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading || !amount || !reason.trim()}
            onClick={() => onSubmit({ amount: Number(amount), reason })}
            className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950"
          >
            {loading ? "Processing..." : "Submit refund"}
          </button>
        </div>
      </div>
    </div>
  );
}
