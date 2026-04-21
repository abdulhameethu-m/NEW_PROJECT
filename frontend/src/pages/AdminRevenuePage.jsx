import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminTable } from "../components/AdminTable";
import { DailyRevenueChart } from "../components/DailyRevenueChart";
import { ReportingToolbar } from "../components/ReportingToolbar";
import { InlineToast } from "../components/commerce/InlineToast";
import { useReporting } from "../hooks/useReporting";
import { exportRevenueReport, getRevenueSummary, getVendorRevenue } from "../services/adminApi";
import { formatCurrency } from "../utils/formatCurrency";

function normalizeError(error) {
  return error?.response?.data?.message || error?.message || "Request failed";
}

export function AdminRevenuePage() {
  const [summary, setSummary] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reporting = useReporting({
    module: "revenue",
    onApply: () => setPagination((current) => ({ ...current, page: 1 })),
    exporter: ({ format, startDate, endDate }) => exportRevenueReport({ format, startDate, endDate }),
  });

  const query = useMemo(
    () => ({
      page: pagination.page,
      limit: pagination.limit,
      ...reporting.appliedParams,
    }),
    [pagination.limit, pagination.page, reporting.appliedParams]
  );

  const loadRevenue = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [summaryRes, vendorsRes] = await Promise.all([getRevenueSummary(reporting.appliedParams), getVendorRevenue(query)]);
      setSummary(summaryRes.data);
      setVendors(vendorsRes.data.vendors || []);
      setPagination((current) => ({
        ...current,
        ...(vendorsRes.data.pagination || {}),
      }));
    } catch (loadError) {
      setError(normalizeError(loadError));
    } finally {
      setLoading(false);
    }
  }, [query, reporting.appliedParams]);

  useEffect(() => {
    loadRevenue();
  }, [loadRevenue]);

  return (
    <div className="grid gap-4">
      <ReportingToolbar
        startDate={reporting.startDate}
        endDate={reporting.endDate}
        onDateChange={reporting.setDateRange}
        onApply={reporting.applyDateRange}
        onExport={reporting.exportReport}
        exportingFormat={reporting.exportingFormat}
        isDirty={reporting.hasPendingChanges}
      />

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <RevenueCard label="Total Sales" value={loading ? "..." : formatCurrency(summary?.totalSales || 0)} tone="blue" />
        <RevenueCard label="Platform Revenue" value={loading ? "..." : formatCurrency(summary?.platformRevenue || 0)} tone="emerald" />
        <RevenueCard label="Vendor Payout" value={loading ? "..." : formatCurrency(summary?.totalVendorPayout || 0)} tone="amber" />
        <RevenueCard label="Valid Orders" value={loading ? "..." : summary?.totalOrders || 0} tone="slate" />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-950 dark:text-white sm:text-lg">Revenue Trend</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Paid and delivered orders only. Range: {summary?.dateRange || "All time"}
            </p>
          </div>
          <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Platform share: {formatCurrency(summary?.platformRevenue || 0)}
          </div>
        </div>
        <div className="mt-5">
          <DailyRevenueChart data={summary?.revenueTrend || []} loading={loading} type="combined" />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-950 dark:text-white sm:text-lg">Vendor-wise Revenue</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Commission, sales, and vendor earnings grouped by seller.
            </p>
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Total vendors: {pagination.total || 0}</div>
        </div>

        {loading ? (
          <div className="grid gap-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : vendors.length ? (
          <AdminTable
            columns={[
              { key: "vendorName", label: "Vendor" },
              { key: "totalOrders", label: "Orders", align: "right" },
              { key: "totalSales", label: "Total Sales", align: "right" },
              { key: "commission", label: "Commission", align: "right" },
              { key: "earnings", label: "Vendor Earnings", align: "right" },
            ]}
          >
            {vendors.map((vendor) => (
              <tr key={vendor.vendorId || vendor.vendorName} className="hover:bg-slate-50 dark:hover:bg-slate-950">
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-950 dark:text-white">{vendor.vendorName}</div>
                </td>
                <td className="px-4 py-3 text-right text-sm text-slate-700 dark:text-slate-200">{vendor.totalOrders}</td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-slate-950 dark:text-white">{formatCurrency(vendor.totalSales)}</td>
                <td className="px-4 py-3 text-right text-sm text-emerald-700 dark:text-emerald-300">{formatCurrency(vendor.commission)}</td>
                <td className="px-4 py-3 text-right text-sm text-slate-700 dark:text-slate-200">{formatCurrency(vendor.earnings)}</td>
              </tr>
            ))}
          </AdminTable>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No revenue data available for the selected date range.
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3 text-sm text-slate-500 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <div>
            Page {pagination.page || 1} of {pagination.pages || 1}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={(pagination.page || 1) === 1 || loading}
              onClick={() => setPagination((current) => ({ ...current, page: Math.max(1, (current.page || 1) - 1) }))}
              className="rounded-xl border border-slate-300 px-3 py-2 disabled:opacity-50 dark:border-slate-700"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={(pagination.page || 1) >= (pagination.pages || 1) || loading}
              onClick={() =>
                setPagination((current) => ({
                  ...current,
                  page: Math.min(current.pages || 1, (current.page || 1) + 1),
                }))
              }
              className="rounded-xl border border-slate-300 px-3 py-2 disabled:opacity-50 dark:border-slate-700"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <InlineToast toast={reporting.toast} onClose={reporting.clearToast} />
    </div>
  );
}

function RevenueCard({ label, value, tone }) {
  const tones = {
    slate: "from-slate-950 to-slate-700 text-white",
    blue: "from-blue-600 to-cyan-500 text-white",
    amber: "from-amber-500 to-orange-500 text-white",
    emerald: "from-emerald-500 to-green-500 text-white",
  };

  return (
    <div className={`rounded-3xl bg-gradient-to-br p-4 shadow-sm sm:p-5 ${tones[tone]}`}>
      <div className="text-sm font-medium opacity-90">{label}</div>
      <div className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{value}</div>
    </div>
  );
}
