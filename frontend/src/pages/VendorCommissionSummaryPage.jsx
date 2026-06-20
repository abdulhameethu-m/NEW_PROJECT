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
  const [data, setData] = useState({ overview: null, chargeColumns: [], orders: [] });

  useEffect(() => {
    let cancelled = false;
    getVendorCommissionSummary({ limit: 50 })
      .then((res) => {
        if (!cancelled) setData(res.data || { overview: null, chargeColumns: [], orders: [] });
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
  const chargeColumns = Array.isArray(data.chargeColumns) ? data.chargeColumns : [];
  const dynamicCharges = Array.isArray(overview.dynamicCharges) ? overview.dynamicCharges : [];
  return (
    <div className="space-y-6">
      <FinanceTabs items={financeTabs} />
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <VendorMetricCard label="Gross Order Amount" value={formatCurrency(overview.totalGross)} />
        {dynamicCharges.map((charge) => (
          <VendorMetricCard
            key={charge.key}
            label={`${charge.label} to ${charge.recipient === "VENDOR" ? "Vendor" : "Admin"}`}
            value={formatCurrency(charge.total)}
          />
        ))}
        <VendorMetricCard label="Remaining Amount" value={formatCurrency(overview.totalRemaining)} />
        <VendorMetricCard label="Commission to Admin" value={formatCurrency(overview.totalCommission)} />
        <VendorMetricCard label="Vendor Net" value={formatCurrency(overview.totalVendorNet)} />
        <VendorMetricCard label="Orders" value={overview.orders || 0} />
      </div>
      <VendorSection title="Order-wise Settlement" description="Every active pricing and shipping rule becomes its own column. Amounts are immutable snapshots created with the order.">
        <VendorDataTable
          rows={(data.orders || []).map((order) => {
            const chargeCells = Object.fromEntries(
              chargeColumns.map((column) => [
                `charge:${column.key}`,
                formatCurrency(order.settlement?.charges?.[column.key] || 0),
              ])
            );
            return {
              id: order._id,
              orderNumber: order.orderNumber,
              gross: formatCurrency(order.settlement?.grossOrderAmount),
              ...chargeCells,
              remaining: formatCurrency(order.settlement?.remainingAmount),
              commission: formatCurrency(order.settlement?.commissionToAdmin),
              vendorNet: formatCurrency(order.settlement?.vendorNet),
              status: order.status,
            };
          })}
          columns={[
            { key: "orderNumber", label: "Order" },
            { key: "gross", label: "Gross" },
            ...chargeColumns.map((column) => ({
              key: `charge:${column.key}`,
              label: `${column.label} (${column.recipient === "VENDOR" ? "Vendor" : "Admin"})`,
            })),
            { key: "remaining", label: "Remaining" },
            { key: "commission", label: "Commission (Admin)" },
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

