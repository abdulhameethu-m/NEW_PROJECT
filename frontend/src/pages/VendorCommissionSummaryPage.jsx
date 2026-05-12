import { useEffect, useState } from "react";
import { FinanceTabs } from "../components/finance/FinanceComponents";
import { VendorDataTable, VendorMetricCard, VendorSection } from "../components/VendorPanel";
import { getVendorCommissionSummary } from "../services/vendorDashboardService";
import { formatCurrency } from "../utils/formatCurrency";

const financeTabs = [
  { label: "Wallet", to: "/vendor/finance" },
  { label: "Commission", to: "/vendor/finance/commission" },
  { label: "Payout History", to: "/vendor/finance/payouts" },
  { label: "Ledger", to: "/vendor/finance/ledger" },
  { label: "Payout Account", to: "/vendor/finance/account" },
  { label: "Invoices", to: "/vendor/finance/invoices" },
];

function normalizeError(error) {
  return error?.response?.data?.message || error?.message || "Request failed";
}

export function VendorCommissionSummaryPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState({ overview: null, orders: [] });

  useEffect(() => {
    let cancelled = false;
    getVendorCommissionSummary({ limit: 50 })
      .then((res) => {
        if (!cancelled) setData(res.data || { overview: null, orders: [] });
      })
      .catch((err) => {
        if (!cancelled) setError(normalizeError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const overview = data.overview || {};
  return (
    <div className="space-y-6">
      <FinanceTabs items={financeTabs} />
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      <div className="grid gap-4 md:grid-cols-4">
        <VendorMetricCard label="Gross Order Amount" value={formatCurrency(overview.totalGross)} />
        <VendorMetricCard label="Commission Deducted" value={formatCurrency(overview.totalCommission)} />
        <VendorMetricCard label="Vendor Net" value={formatCurrency(overview.totalVendorNet)} />
        <VendorMetricCard label="Orders" value={overview.orders || 0} />
      </div>
      <VendorSection title="Order-wise Commission" description="Commission snapshots are immutable and locked at order creation.">
        <VendorDataTable
          rows={(data.orders || []).map((order) => ({
            id: order._id,
            orderNumber: order.orderNumber,
            gross: formatCurrency(order.totalAmount || order.subtotal || 0),
            commission: formatCurrency(order.platformCommissionAmount || 0),
            vendorNet: formatCurrency(order.vendorEarning || 0),
            status: order.status,
          }))}
          columns={[
            { key: "orderNumber", label: "Order" },
            { key: "gross", label: "Gross" },
            { key: "commission", label: "Commission" },
            { key: "vendorNet", label: "Vendor Net" },
            { key: "status", label: "Status" },
          ]}
          loading={loading}
          emptyMessage="No commission data yet."
        />
      </VendorSection>
    </div>
  );
}

