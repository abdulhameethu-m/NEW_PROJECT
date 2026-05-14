import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import { ReportingToolbar } from "../components/ReportingToolbar";
import { VendorSection } from "../components/VendorPanel";
import { useReporting } from "../hooks/useReporting";
import { formatCurrency } from "../utils/formatCurrency";
import * as vendorDashboardService from "../services/vendorDashboardService";

function normalizeError(error) {
  return error?.response?.data?.message || error?.message || "Failed to load product detail analytics.";
}

export function VendorProductAnalyticsDetailPage() {
  const { productId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const reporting = useReporting({
    module: "analytics",
  });

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    vendorDashboardService
      .getVendorProductAnalyticsDetail(productId, reporting.appliedParams)
      .then((response) => {
        if (!active) return;
        setData(response.data);
      })
      .catch((err) => {
        if (!active) return;
        setError(normalizeError(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [productId, reporting.appliedParams]);

  async function handleExport(format) {
    try {
      await reporting.exportReport(format);
    } catch (err) {
      setError(normalizeError(err));
    }
  }

  const product = data?.product || {};
  const summary = data?.summary || {};
  const trends = data?.trends || {};

  return (
    <div className="space-y-6">
      <Link to="/vendor/analytics" className="text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300">
        Back to analytics
      </Link>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <ReportingToolbar
        startDate={reporting.startDate}
        endDate={reporting.endDate}
        onDateChange={reporting.setDateRange}
        onApply={reporting.applyDateRange}
        onExport={handleExport}
        exportingFormat={reporting.exportingFormat}
        isDirty={reporting.hasPendingChanges}
      />

      <VendorSection title={product.productName || "Product detail"} description={`${product.categoryName || "Uncategorized"} ${product.sku ? `• SKU ${product.sku}` : ""}`}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Revenue" value={formatCurrency(summary.totalRevenue)} />
          <MetricCard label="Net Revenue" value={formatCurrency(summary.totalNetRevenue)} />
          <MetricCard label="Units Sold" value={summary.totalUnitsSold || 0} />
          <MetricCard label="Returns" value={summary.totalReturns || 0} />
          <MetricCard label="Stock Left" value={summary.availableStock || 0} />
        </div>
      </VendorSection>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <VendorSection title="Revenue trend" description="Product-level trend for sales and net earnings.">
          {loading ? (
            <Skeleton />
          ) : trends.daily?.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.35} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Line type="monotone" dataKey="grossRevenue" stroke="#0f172a" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="netRevenue" stroke="#1d4ed8" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </VendorSection>

        <VendorSection title="Operational exceptions" description="Returns, refunds, and cancellations for this product.">
          {loading ? (
            <Skeleton />
          ) : trends.daily?.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trends.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.35} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="returnCount" fill="#dc2626" radius={[8, 8, 0, 0]} />
                <Bar dataKey="refundCount" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                <Bar dataKey="cancelledCount" fill="#64748b" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </VendorSection>
      </div>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-slate-950 dark:text-white">{value}</div>
    </div>
  );
}

function EmptyState() {
  return <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">No product trend data for this period.</div>;
}

function Skeleton() {
  return <div className="h-72 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />;
}
