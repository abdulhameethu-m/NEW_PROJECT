import { Link } from "react-router-dom";
import { StatusBadge } from "./StatusBadge";
import { formatCurrency } from "../utils/formatCurrency";

export function PaymentTable({ rows = [], onRefund = null, detailsBasePath = "/admin/payment-details" }) {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-950">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Order</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">User</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Amount</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Method</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Created</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {rows.length ? (
              rows.map((payment) => (
                <tr key={payment._id}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-950 dark:text-white">{payment.orderIds?.[0]?.orderNumber || payment.razorpayOrderId || "Awaiting order"}</div>
                    <div className="mt-1 font-mono text-xs text-slate-500">{payment.razorpayPaymentId || payment.razorpayOrderId || payment._id}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    <div>{payment.userId?.name || "Customer"}</div>
                    <div className="mt-1 text-xs text-slate-500">{payment.userId?.email || payment.userId?.phone || "No contact"}</div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-950 dark:text-white">{formatCurrency(payment.amount || 0)}</td>
                  <td className="px-4 py-3"><StatusBadge value={payment.status} /></td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{payment.method}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{new Date(payment.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        to={`${detailsBasePath}/${payment._id}`}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                      >
                        View
                      </Link>
                      {onRefund ? (
                        <button
                          type="button"
                          onClick={() => onRefund(payment)}
                          className="rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-950"
                        >
                          Refund
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                  No payments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
