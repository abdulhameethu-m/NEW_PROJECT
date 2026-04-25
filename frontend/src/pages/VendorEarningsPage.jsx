import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PayoutCard } from "../components/PayoutCard";
import { StatusBadge } from "../components/StatusBadge";
import { VendorSection } from "../components/VendorPanel";
import { formatCurrency } from "../utils/formatCurrency";
import * as vendorDashboardService from "../services/vendorDashboardService";

export function VendorEarningsPage() {
  const [payouts, setPayouts] = useState(null);
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      vendorDashboardService.getVendorPayouts(),
      vendorDashboardService.getVendorOrders({ limit: 10 }),
    ])
      .then(([payoutResponse, orderResponse]) => {
        setPayouts(payoutResponse.data);
        setOrders(orderResponse.data);
      })
      .catch((err) => setError(err?.response?.data?.message || "Failed to load earnings."));
  }, []);

  if (error) {
    return <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>;
  }

  if (!payouts || !orders) {
    return <div className="text-sm text-slate-500">Loading earnings...</div>;
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <PayoutCard label="Total earnings" value={payouts.overview.totalEarnings} hint="Paid and pending vendor earnings" />
        <PayoutCard label="Pending payouts" value={payouts.overview.pendingAmount} hint="Awaiting release window" accent="bg-amber-100 text-amber-700" />
        <PayoutCard label="Paid out" value={payouts.overview.paidAmount} hint="Already transferred" accent="bg-emerald-100 text-emerald-700" />
      </div>

      <VendorSection title="Order payments" description="Recent order-level payment status for your storefront.">
        <div className="grid gap-3">
          {(orders.orders || []).map((order) => (
            <div key={order._id} className="flex flex-col gap-3 rounded-xl border border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-semibold text-slate-950 dark:text-white">{order.orderNumber}</div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatCurrency(order.totalAmount || 0)}</div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge value={order.paymentStatus} />
                <StatusBadge value={order.status} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Link to="/vendor/payouts" className="inline-flex rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
            View payout history
          </Link>
        </div>
      </VendorSection>
    </div>
  );
}
