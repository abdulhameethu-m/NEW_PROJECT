import { useEffect, useState } from "react";
import { formatCurrency } from "../utils/formatCurrency";

function TextRow({ label, value, tone = "default" }) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-600"
      : tone === "negative"
        ? "text-rose-600"
        : "text-slate-700";

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={`font-semibold ${toneClass}`}>{value}</span>
    </div>
  );
}

export function CancelOrderModal({
  open,
  loading = false,
  preview = null,
  onClose,
  onPreview,
  onConfirm,
}) {
  const [reason, setReason] = useState("Changed my mind");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) {
      setReason("Changed my mind");
      setNotes("");
    }
  }, [open]);

  if (!open) return null;

  const deductionRows = preview?.preview?.breakdown?.deductions || [];
  const amountCurrency = preview?.order?.currency || preview?.preview?.currency || "INR";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#0f172a,#1d4ed8)] px-6 py-5 text-white">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-200">Cancellation Preview</div>
          <h2 className="mt-2 text-2xl font-semibold">Review refund before cancelling</h2>
          <p className="mt-2 text-sm text-slate-200">
            We will calculate deductions and refund amount using the live marketplace policy. The finance team will process the refund after cancellation.
          </p>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-4">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Cancellation Reason</span>
              <select
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
              >
                <option value="Changed my mind">Changed my mind</option>
                <option value="Found a better price">Found a better price</option>
                <option value="Delivery taking too long">Delivery taking too long</option>
                <option value="Ordered by mistake">Ordered by mistake</option>
                <option value="Need to update address">Need to update address</option>
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Additional Note</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
                placeholder="Optional note for support and operations"
              />
            </label>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <div className="font-semibold text-slate-950">Policy behavior</div>
              <div className="mt-2">Refund processing: Finance team will choose the refund method after cancellation</div>
              <div className="mt-1">Approval: {preview?.preview?.approvalRequired ? "Manual review required" : "Auto approved"}</div>
              <div className="mt-1">Stage: {preview?.preview?.stage || "Not loaded yet"}</div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Refund Breakdown</div>
                <div className="mt-1 text-lg font-semibold text-slate-950">
                  {preview?.order?.orderNumber || "Load preview"}
                </div>
              </div>
            </div>

            {preview ? (
              <div className="space-y-3">
                <TextRow label="Order amount" value={formatCurrency(preview.preview.grossAmount || 0, { currency: amountCurrency })} />
                <TextRow label="Shipping" value={formatCurrency(preview.preview.breakdown?.shipping || 0, { currency: amountCurrency })} />
                <TextRow label="Taxes" value={formatCurrency(preview.preview.breakdown?.taxes || 0, { currency: amountCurrency })} />
                <TextRow label="Platform fee" value={formatCurrency(preview.preview.breakdown?.platformFee || 0, { currency: amountCurrency })} />
                <TextRow label="Gateway fee" value={formatCurrency(preview.preview.breakdown?.gatewayFee || 0, { currency: amountCurrency })} />
                {deductionRows.map((item) => (
                  <TextRow
                    key={`${item.type}-${item.label}`}
                    label={item.label}
                    value={`- ${formatCurrency(item.amount || 0, { currency: amountCurrency })}`}
                    tone="negative"
                  />
                ))}
                <div className="border-t border-dashed border-slate-300 pt-3">
                  <TextRow
                    label="Total deduction"
                    value={`- ${formatCurrency(preview.preview.deductionAmount || 0, { currency: amountCurrency })}`}
                    tone="negative"
                  />
                </div>
                <div className="rounded-2xl bg-emerald-50 p-4">
                  <TextRow
                    label="Refund payable"
                    value={formatCurrency(preview.preview.refundAmount || 0, { currency: amountCurrency })}
                    tone="positive"
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                Generate a live preview to see deductions and refund amount before cancelling.
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Close
          </button>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => onPreview({ reason, notes })}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              {loading && !preview ? "Loading preview..." : "Refresh Preview"}
            </button>
            <button
              type="button"
              disabled={loading || !preview}
              onClick={() => onConfirm({ reason, notes })}
              className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading && preview ? "Cancelling..." : "Confirm Cancellation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
