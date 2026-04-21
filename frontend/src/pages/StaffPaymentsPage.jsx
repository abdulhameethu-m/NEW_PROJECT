import { useEffect, useState } from "react";
import { useStaffPermission, useRequirePermission } from "../hooks/useStaffAuth";

function normalizeError(error) {
  return error?.response?.data?.message || error?.message || "Request failed";
}

export function StaffPaymentsPage() {
  useRequirePermission("payments.read");
  const { hasPermission } = useStaffPermission();
  const [searchTerm, setSearchTerm] = useState("");
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPayments() {
      setLoading(true);
      setError("");
      try {
        // Placeholder API call - adjust based on actual payment endpoint
        const mockPayments = [
          {
            _id: "payment-1",
            orderId: "order-123",
            amount: 299.99,
            status: "Completed",
            method: "Card",
            createdAt: new Date(),
          },
        ];
        if (active) setPayments(mockPayments);
      } catch (err) {
        if (active) setError(normalizeError(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPayments();

    return () => {
      active = false;
    };
  }, [searchTerm]);

  const canRefund = hasPermission("payments.refund");

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Payments</h1>
          <p className="mt-1 text-sm text-slate-600">Manage and process payment transactions</p>
        </div>
      </section>

      {/* Search */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search by order ID, customer, or amount..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-amber-500 focus:outline-none"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Payments Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-amber-500" />
              <p className="mt-4 text-sm text-slate-600">Loading payments...</p>
            </div>
          </div>
        ) : payments.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-sm text-slate-600">No payments found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-950">Payment ID</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-950">Order</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-950">Amount</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-950">Status</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-950">Method</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-950">Date</th>
                {canRefund && <th className="px-6 py-3 text-left font-semibold text-slate-950">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {payments.map((payment) => (
                <tr key={payment._id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono text-xs text-slate-600">{payment._id?.slice(0, 12)}</td>
                  <td className="px-6 py-4 text-slate-950">{payment.orderId}</td>
                  <td className="px-6 py-4 font-semibold text-slate-950">${payment.amount?.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {payment.status || "Completed"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{payment.method || "Card"}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {new Date(payment.createdAt).toLocaleDateString()}
                  </td>
                  {canRefund && (
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        className="text-sm font-medium text-amber-700 hover:text-amber-900"
                      >
                        Refund
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
