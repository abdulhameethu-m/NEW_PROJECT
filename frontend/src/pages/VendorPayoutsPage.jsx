import { useEffect, useState } from "react";
import { formatCurrency } from "../utils/formatCurrency";
import { StatusBadge } from "../components/StatusBadge";
import { VendorDataTable, VendorMetricCard, VendorSection } from "../components/VendorPanel";
import * as vendorDashboardService from "../services/vendorDashboardService";

export function VendorPayoutsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    vendorDashboardService
      .getVendorPayouts()
      .then((response) => {
        setData(response.data);
        setError("");
      })
      .catch((err) => setError(err?.response?.data?.message || "Failed to load payouts."));
  }, []);

  if (error) return <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>;
  if (!data) return <div className="text-sm text-slate-500 dark:text-slate-400">Loading payouts...</div>;

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <VendorMetricCard label="Pending" value={formatCurrency(data.overview.pendingAmount)} hint="Ready for payout processing" />
        <VendorMetricCard label="Paid" value={formatCurrency(data.overview.paidAmount)} hint="Transferred to seller account" />
        <VendorMetricCard label="Failed" value={formatCurrency(data.overview.failedAmount)} hint="Requires payout investigation" />
      </div>

      <VendorSection title="Pending Payouts" description="Expected payout transfers tied to seller orders.">
        <VendorDataTable
          rows={(data.pending || []).map((item) => ({
            id: item._id,
            order: item.orderId?.orderNumber || "Order",
            amount: formatCurrency(item.amount),
            commission: formatCurrency(item.commission),
            status: item.status,
            createdAt: new Date(item.createdAt).toLocaleDateString(),
          }))}
          columns={[
            { key: "order", label: "Order" },
            { key: "amount", label: "Amount" },
            { key: "commission", label: "Commission" },
            { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> },
            { key: "createdAt", label: "Date" },
          ]}
        />
      </VendorSection>

      <VendorSection title="Payment History" description="Most recent payout activity.">
        <VendorDataTable
          rows={(data.history || []).map((item) => ({
            id: item._id,
            order: item.orderId?.orderNumber || "Order",
            amount: formatCurrency(item.amount),
            status: item.status,
            transferId: item.transferId || "Awaiting transfer",
            createdAt: new Date(item.createdAt).toLocaleString(),
          }))}
          columns={[
            { key: "order", label: "Order" },
            { key: "amount", label: "Amount" },
            { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> },
            { key: "transferId", label: "Transfer" },
            { key: "createdAt", label: "Created" },
          ]}
        />
      </VendorSection>
    </div>
  );
}
