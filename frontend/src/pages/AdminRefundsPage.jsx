import { useEffect, useState } from "react";
import { FilterBar } from "../components/FilterBar";
import { StatusBadge } from "../components/StatusBadge";
import { formatCurrency } from "../utils/formatCurrency";
import * as paymentService from "../services/paymentService";

function normalizeError(error) {
  return error?.response?.data?.message || error?.message || "Request failed";
}

export function AdminRefundsPage() {
  const [refunds, setRefunds] = useState([]);
  const [overview, setOverview] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadRefunds() {
    setLoading(true);
    setError("");
    try {
      const response = await paymentService.listRefunds(status ? { status } : {});
      setRefunds(response.data?.refunds || []);
      setOverview(response.data?.overview || null);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRefunds();
  }, [status]);

  async function handleReview(refundId, action) {
    try {
      await paymentService.reviewRefund(refundId, { action });
      await loadRefunds();
    } catch (err) {
      setError(normalizeError(err));
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold text-slate-950">Refunds</h1>
        <p className="mt-1 text-sm text-slate-600">Review refund requests, processed refunds, and operational exceptions.</p>
      </section>

      <FilterBar>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm">
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PROCESSED">Processed</option>
          <option value="FAILED">Failed</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </FilterBar>

      {overview ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Total", value: overview.totalAmount },
            { label: "Processed", value: overview.processedAmount },
            { label: "Pending", value: overview.pendingAmount },
            { label: "Failed", value: overview.failedAmount },
          ].map((item) => (
            <div key={item.label} className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">{item.label}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrency(item.value || 0)}</div>
            </div>
          ))}
        </div>
      ) : null}

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Order</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Amount</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Reason</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Loading refunds...</td></tr>
              ) : refunds.length ? (
                refunds.map((refund) => (
                  <tr key={refund._id}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-950">{refund.orderId?.orderNumber || refund.orderId?._id}</div>
                      <div className="mt-1 text-xs text-slate-500">{new Date(refund.createdAt).toLocaleString()}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-950">{formatCurrency(refund.amount || 0)}</td>
                    <td className="px-4 py-3"><StatusBadge value={refund.status} /></td>
                    <td className="px-4 py-3 text-slate-600">{refund.reason}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {refund.status === "PENDING" ? (
                          <>
                            <button type="button" onClick={() => handleReview(refund._id, "approve")} className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white">Approve</button>
                            <button type="button" onClick={() => handleReview(refund._id, "reject")} className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700">Reject</button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">No actions</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No refunds found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
