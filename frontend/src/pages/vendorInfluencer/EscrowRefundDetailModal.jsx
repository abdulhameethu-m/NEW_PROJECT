import { formatCurrency } from "../../utils/formatCurrency";
import { formatDateTime } from "./VendorInfluencerShared";

function VendorEscrowStatusBadge({ value }) {
  const label = String(value || "unknown").replace(/_/g, " ");
  const key = label.toLowerCase();
  const tone = key.includes("completed") || key.includes("released") || key.includes("paid")
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : key.includes("failed") || key.includes("rejected")
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : key.includes("refund") || key.includes("pending")
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-sky-200 bg-sky-50 text-sky-700";
  return <span className={`inline-flex rounded-2xl border px-2.5 py-1 text-xs font-semibold capitalize leading-snug ${tone}`}>{label}</span>;
}
function VendorEscrowRefundDetailModal({ state, onClose }) {
  if (!state.open) return null;
  const data = state.data || {};
  const campaign = data.campaign || {};
  const escrow = data.escrow || {};
  const deliverables = data.deliverables || [];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Deliverable payment details</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Released and refunded amounts for each deliverable in this campaign.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200">x</button>
        </div>
        <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
          {state.loading ? (
            <div className="rounded-2xl border border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-800">Loading deliverables...</div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-950 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-100">
                <div className="font-semibold">{campaign.title || "Campaign"}</div>
                <div className="mt-1">Escrow {formatCurrency(escrow.escrowAmount || 0)} · Released {formatCurrency(escrow.releasedAmount || 0)} · Refunded {formatCurrency(escrow.refundedAmount || 0)} · Remaining {formatCurrency(escrow.remainingAmount || 0)}</div>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="min-w-[900px] divide-y divide-slate-200 text-sm dark:divide-slate-800">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Deliverable</th>
                      <th className="px-4 py-3">Due Date</th>
                      <th className="px-4 py-3">Rate</th>
                      <th className="px-4 py-3">Released</th>
                      <th className="px-4 py-3">Refunded</th>
                      <th className="px-4 py-3">Remaining</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {deliverables.length ? deliverables.map((deliverable) => (
                      <tr key={deliverable.id} className="align-top">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-950 dark:text-white">{deliverable.title || deliverable.type || "Deliverable"}</div>
                          <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">{deliverable.type || "deliverable"} · Qty {deliverable.quantity || 1}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDateTime(deliverable.dueDate)}</td>
                        <td className="px-4 py-3 font-semibold text-slate-950 dark:text-white">{formatCurrency(deliverable.rate || 0)}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-600">{formatCurrency(deliverable.allocation?.releasedAmount || 0)}</td>
                        <td className="px-4 py-3 font-semibold text-sky-600">{formatCurrency(deliverable.allocation?.refundedAmount || 0)}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatCurrency(deliverable.allocation?.remainingAmount || 0)}</td>
                        <td className="px-4 py-3"><VendorEscrowStatusBadge value={deliverable.refund?.statusLabel || deliverable.status || "pending"} /></td>
                      </tr>
                    )) : (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No deliverables found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">Close</button>
        </div>
      </div>
    </div>
  );
}

export default VendorEscrowRefundDetailModal;
