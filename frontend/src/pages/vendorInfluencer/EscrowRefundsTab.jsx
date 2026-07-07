import { CheckCircle2, CreditCard, Eye, Megaphone, RotateCcw, ShieldCheck } from "lucide-react";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDateTime, numberValue, VendorFinanceMetric } from "./VendorInfluencerShared";

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

function VendorEscrowRefundsView({ data = {}, onView }) {
  const cards = data.cards || {};
  const rows = data.rows || [];
  const metrics = [
    { label: "Campaigns", value: numberValue(cards.campaigns || 0), hint: "Fixed/Hybrid escrow campaigns", icon: Megaphone },
    { label: "Escrow Funded", value: formatCurrency(cards.escrowFunded || 0), hint: "Total fixed reward escrow", icon: CreditCard },
    { label: "Amount Released", value: formatCurrency(cards.releasedAmount || 0), hint: "Paid to influencers", icon: CheckCircle2 },
    { label: "Amount Refunded", value: formatCurrency(cards.refundedAmount || 0), hint: "Returned to vendor", icon: RotateCcw },
    { label: "Remaining Escrow", value: formatCurrency(cards.remainingEscrow || 0), hint: "Unreleased balance", icon: ShieldCheck },
  ];

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-500">Vendor Finance</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">Campaign Escrow & Refunds</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Track how much was released to influencers and how much was refunded back to you for each campaign and deliverable.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => <VendorFinanceMetric key={metric.label} {...metric} />)}
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Campaign Refund Summary</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Open a campaign to view deliverable-wise released and refunded amounts.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Influencer</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Escrow</th>
                <th className="px-4 py-3">Released</th>
                <th className="px-4 py-3">Refunded</th>
                <th className="px-4 py-3">Remaining</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Deadline</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.length ? rows.map((row) => {
                const remaining = Math.max(0, Number(row.escrowAmount || 0) - Number(row.releasedAmount || 0) - Number(row.alreadyRefunded || 0));
                return (
                  <tr key={row.id || row.campaignId} className="align-top">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-950 dark:text-white">{row.campaignTitle}</div>
                      <div className="mt-1 max-w-36 truncate text-xs text-slate-500">{row.campaignId}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.influencer?.displayName || row.influencer?.username || row.influencer?.name || "Influencer"}</td>
                    <td className="px-4 py-3 font-semibold uppercase text-slate-700 dark:text-slate-200">{row.paymentModel}</td>
                    <td className="px-4 py-3 font-semibold text-slate-950 dark:text-white">{formatCurrency(row.escrowAmount || 0)}</td>
                    <td className="px-4 py-3 text-emerald-600 font-semibold">{formatCurrency(row.releasedAmount || 0)}</td>
                    <td className="px-4 py-3 text-sky-600 font-semibold">{formatCurrency(row.alreadyRefunded || 0)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatCurrency(remaining)}</td>
                    <td className="px-4 py-3"><VendorEscrowStatusBadge value={row.statusLabel || row.status} /></td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDateTime(row.deadline)}</td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => onView(row)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                        <Eye className="h-3.5 w-3.5" /> View Deliverables
                      </button>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-slate-500">No fixed/hybrid escrow records found yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default VendorEscrowRefundsView;
