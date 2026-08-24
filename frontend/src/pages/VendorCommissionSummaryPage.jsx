import { useEffect, useState } from "react";
import { FinanceTabs } from "../components/finance/FinanceComponents";
import { VendorDataTable, VendorMetricCard, VendorSection } from "../components/VendorPanel";
import { getVendorCommissionSummary, getVendorWallet } from "../services/vendorDashboardService";
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

function isShippingCharge(charge = {}) {
  const text = `${charge.key || ""} ${charge.label || ""}`.toLowerCase();
  return text.includes("shipping");
}

function buildSettlementColumns(chargeColumns = []) {
  const hasShipping = chargeColumns.some(isShippingCharge);
  const nonShippingColumns = chargeColumns.filter((column) => !isShippingCharge(column));
  return [
    ...(hasShipping ? [{ key: "shipping_fee", label: "Shipping fee", groupedShipping: true }] : []),
    ...nonShippingColumns.map((column) => ({
      key: `charge:${column.key}`,
      label: `${column.label} (${column.recipient === "VENDOR" ? "Vendor" : "Admin"})`,
      sourceKey: column.key,
    })),
  ];
}

function sumShippingCharges(order = {}, chargeColumns = []) {
  return chargeColumns.reduce((total, column) => {
    if (!isShippingCharge(column)) return total;
    return total + Number(order.settlement?.charges?.[column.key] || 0);
  }, 0);
}

function buildOverviewCharges(dynamicCharges = []) {
  const shippingTotal = dynamicCharges.reduce((total, charge) => {
    if (!isShippingCharge(charge)) return total;
    return total + Number(charge.total || 0);
  }, 0);
  const nonShippingCharges = dynamicCharges.filter((charge) => !isShippingCharge(charge));
  return [
    ...(shippingTotal > 0 ? [{ key: "shipping_fee", label: "Shipping fee", total: shippingTotal }] : []),
    ...nonShippingCharges.map((charge) => ({
      ...charge,
      label: `${charge.label} to ${charge.recipient === "VENDOR" ? "Vendor" : "Admin"}`,
    })),
  ];
}

export function VendorCommissionSummaryPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState({ overview: null, chargeColumns: [], orders: [] });
  const [wallet, setWallet] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getVendorCommissionSummary({ limit: 50 }),
      getVendorWallet()
    ])
      .then(([res, walletRes]) => {
        if (!cancelled) {
          setData(res.data || { overview: null, chargeColumns: [], orders: [] });
          setWallet(walletRes.data?.wallet || null);
        }
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
  const settlementColumns = buildSettlementColumns(chargeColumns);
  const overviewCharges = buildOverviewCharges(dynamicCharges);
  return (
    <div className="space-y-6">
      <FinanceTabs items={financeTabs} />
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <VendorMetricCard label="Gross Order Amount" value={formatCurrency(overview.totalGross)} />
        {overviewCharges.map((charge) => (
          <VendorMetricCard
            key={charge.key}
            label={charge.label}
            value={formatCurrency(charge.total)}
          />
        ))}
        <VendorMetricCard label="Remaining Amount" value={formatCurrency(overview.totalRemaining)} />
        <VendorMetricCard label="Commission to Admin" value={formatCurrency(overview.totalCommission)} />
        <VendorMetricCard label="Vendor Net" value={formatCurrency(overview.totalVendorNet)} />
        <VendorMetricCard 
          label="Total Refunds" 
          value={formatCurrency(
            (data.orders || []).reduce((sum, order) => {
              if (order.refundSummary?.status === 'REFUNDED' || order.paymentStatus === 'REFUNDED') {
                return sum + (order.settlement?.vendorNet || 0);
              }
              return sum;
            }, 0)
          )} 
          hint="Total vendor net amount deducted due to order refunds" 
        />
        <VendorMetricCard label="Orders" value={overview.orders || 0} />
      </div>
      <VendorSection title="Order-wise Settlement" description="Shipping charges are shown as one order-level fee. Other charges remain based on the immutable order snapshot.">
        <VendorDataTable
          rowClassName={(row) => {
            if (row.status === 'Refunded') return 'bg-yellow-50 hover:bg-yellow-100/80 transition-colors';
            if (row.isSettled) return 'bg-[#ecfdf5] hover:bg-[#d1fae5] transition-colors';
            return '';
          }}
          rows={(data.orders || []).map((order) => {
            const chargeCells = Object.fromEntries(
              settlementColumns.map((column) => {
                if (column.groupedShipping) {
                  return [column.key, formatCurrency(sumShippingCharges(order, chargeColumns))];
                }
                return [column.key, formatCurrency(order.settlement?.charges?.[column.sourceKey] || 0)];
              })
            );
            return {
              id: order._id,
              orderNumber: order.orderNumber,
              gross: formatCurrency(order.settlement?.grossOrderAmount),
              ...chargeCells,
              remaining: formatCurrency(order.settlement?.remainingAmount),
              commission: formatCurrency(order.settlement?.commissionToAdmin),
              vendorNet: formatCurrency(order.settlement?.vendorNet),
              status: order.refundSummary?.status === 'REFUNDED' || order.paymentStatus === 'REFUNDED' ? 'Refunded' : (order.status === 'DELIVERED' ? 'Delivered' : order.status),
              isSettled: order.vendorWalletReleasedAt != null || order.settlementStatus === 'Settled',
            };
          })}
          columns={[
            { key: "orderNumber", label: "Order" },
            { key: "gross", label: "Gross" },
            ...settlementColumns.map((column) => ({ key: column.key, label: column.label })),
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

