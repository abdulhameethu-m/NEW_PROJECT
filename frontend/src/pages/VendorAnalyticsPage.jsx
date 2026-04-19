import { useEffect, useState } from "react";
import { formatCurrency } from "../utils/formatCurrency";
import { StatusBadge } from "../components/StatusBadge";
import { VendorDataTable, VendorMiniBarChart, VendorSection } from "../components/VendorPanel";
import * as vendorDashboardService from "../services/vendorDashboardService";

export function VendorAnalyticsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    vendorDashboardService
      .getVendorAnalytics()
      .then((response) => {
        setData(response.data);
        setError("");
      })
      .catch((err) => setError(err?.response?.data?.message || "Failed to load analytics."));
  }, []);

  if (error) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>;
  }

  if (!data) {
    return <div className="text-sm text-slate-500 dark:text-slate-400">Loading analytics...</div>;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <VendorSection title="Revenue Trend" description="Monthly order and revenue trendline expressed as a simple ops chart.">
        <VendorMiniBarChart
          points={(data.salesTrend || []).map((entry) => ({
            label: entry.label,
            displayValue: formatCurrency(entry.revenue),
            revenue: Math.round(entry.revenue),
          }))}
          valueKey="revenue"
        />
      </VendorSection>

      <VendorSection title="Status Mix" description="Distribution of orders by operational stage.">
        <VendorMiniBarChart
          points={(data.statusBreakdown || []).map((entry) => ({
            label: entry._id,
            value: entry.count,
          }))}
        />
      </VendorSection>

      <div className="xl:col-span-2">
        <VendorSection title="Top Products" description="Products contributing the most revenue and unit movement.">
          <VendorDataTable
            rows={(data.topProducts || []).map((product) => ({
              id: product._id,
              name: product.name,
              revenue: formatCurrency(product.analytics?.totalRevenue || 0),
              sales: product.analytics?.salesCount || 0,
              stock: product.stock,
              status: product.status,
            }))}
            columns={[
              { key: "name", label: "Product" },
              { key: "revenue", label: "Revenue" },
              { key: "sales", label: "Units Sold" },
              { key: "stock", label: "Stock" },
              { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> },
            ]}
          />
        </VendorSection>
      </div>
    </div>
  );
}
