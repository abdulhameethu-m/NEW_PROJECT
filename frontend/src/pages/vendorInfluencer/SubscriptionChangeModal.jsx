import { formatCurrency } from "../../utils/formatCurrency";

function SubscriptionChangeModal({ preview, busy, onClose, onConfirm }) {
  const amountPayable = Number(preview.amountPayable || 0);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
      <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Subscription Change Preview</h3>
            <p className="mt-1 text-sm text-slate-500">Review the server-calculated credit before payment.</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200">Close</button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current Plan</p>
            <p className="mt-2 text-base font-semibold text-slate-950 dark:text-white">{preview.currentPlan?.planName || "-"}</p>
            <p className="mt-1 text-sm capitalize text-slate-500">{String(preview.currentBillingCycle || "").replace(/_/g, " ")}</p>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Remaining days: <span className="font-semibold">{preview.remainingDays}</span></p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Remaining credit: <span className="font-semibold">{formatCurrency(preview.remainingCredit || 0)}</span></p>
          </div>
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/20">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">New Plan</p>
            <p className="mt-2 text-base font-semibold text-slate-950 dark:text-white">{preview.targetPlan?.planName || "-"}</p>
            <p className="mt-1 text-sm capitalize text-slate-500">{String(preview.targetBillingCycle || "").replace(/_/g, " ")}</p>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Plan price: <span className="font-semibold">{formatCurrency(preview.targetPrice || 0)}</span></p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Credit applied: <span className="font-semibold">{formatCurrency(preview.creditApplied || 0)}</span></p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Final Amount Payable</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">{formatCurrency(amountPayable)}</p>
              {Number(preview.creditToWallet || 0) > 0 ? <p className="mt-1 text-sm text-emerald-600">Wallet credit created: {formatCurrency(preview.creditToWallet)}</p> : null}
            </div>
            <button type="button" disabled={busy} onClick={onConfirm} className="h-11 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60">
              {busy ? "Processing..." : amountPayable > 0 ? `Pay ${formatCurrency(amountPayable)}` : "Confirm Change"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default SubscriptionChangeModal;
