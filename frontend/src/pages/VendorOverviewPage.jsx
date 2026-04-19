import { useEffect, useState } from "react";
import { formatCurrency } from "../utils/formatCurrency";
import { StatusBadge } from "../components/StatusBadge";
import { VendorDataTable, VendorMetricCard, VendorMiniBarChart, VendorSection } from "../components/VendorPanel";
import { useVendorDashboardStore } from "../context/vendorDashboardStore";

export function VendorOverviewPage() {
  const { dashboard, fetchDashboard } = useVendorDashboardStore();
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboard().catch((err) => {
      setError(err?.response?.data?.message || "Failed to load vendor dashboard.");
    });
  }, [fetchDashboard]);

  if (error) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>;
  }

  if (!dashboard) {
    return <div className="text-sm text-slate-500 dark:text-slate-400">Loading dashboard...</div>;
  }

  const statCards = [
    { label: "Revenue", value: formatCurrency(dashboard.stats.totalRevenue), hint: "Delivered + shipped revenue" },
    { label: "Orders Today", value: dashboard.stats.ordersToday, hint: "Orders created today" },
    { label: "Pending Orders", value: dashboard.stats.pendingOrders, hint: "Needs fulfillment action" },
    { label: "Unread Alerts", value: dashboard.stats.unreadNotifications, hint: "Operational notifications pending" },
  ];

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <VendorMetricCard key={card.label} {...card} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <VendorSection
          title={dashboard.vendor.shopName || "Your Store"}
          description="Store status, payout cadence, and fulfillment pulse."
          action={<StatusBadge value={dashboard.vendor.status} />}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 px-4 py-4 dark:bg-slate-800/60">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Payout schedule</div>
              <div className="mt-2 text-lg font-semibold capitalize text-slate-950 dark:text-white">{dashboard.vendor.payoutSchedule}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4 dark:bg-slate-800/60">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Low stock</div>
              <div className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">{dashboard.stats.lowStockProducts}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4 dark:bg-slate-800/60">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Shipped</div>
              <div className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">{dashboard.stats.shippedOrders}</div>
            </div>
          </div>
        </VendorSection>

        <VendorSection title="Top Products" description="Revenue-leading products this cycle.">
          <VendorMiniBarChart
            points={(dashboard.topProducts || []).map((product) => ({
              label: product.name,
              value: Math.round(product.analytics?.totalRevenue || 0),
            }))}
          />
        </VendorSection>
      </div>

      <VendorSection title="Recent Orders" description="Latest seller-facing orders entering your fulfillment queue.">
        <VendorDataTable
          rows={(dashboard.recentOrders || []).map((order) => ({
            id: order._id,
            orderNumber: order.orderNumber,
            totalAmount: formatCurrency(order.totalAmount),
            status: order.status,
            paymentStatus: order.paymentStatus,
            createdAt: new Date(order.createdAt).toLocaleString(),
          }))}
          columns={[
            { key: "orderNumber", label: "Order" },
            { key: "totalAmount", label: "Total" },
            { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> },
            { key: "paymentStatus", label: "Payment", render: (row) => <StatusBadge value={row.paymentStatus} /> },
            { key: "createdAt", label: "Created" },
          ]}
        />
      </VendorSection>
    </div>
  );
}
