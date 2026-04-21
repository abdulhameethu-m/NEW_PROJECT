import { useEffect, useState } from "react";
import { getDashboard } from "../services/adminApi";
import { useStaffPermission, useRequirePermission } from "../hooks/useStaffAuth";

function normalizeError(error) {
  return error?.response?.data?.message || error?.message || "Request failed";
}

export function StaffAnalyticsPage() {
  useRequirePermission("analytics.read");
  const { hasPermission } = useStaffPermission();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAnalytics() {
      setLoading(true);
      setError("");
      try {
        const response = await getDashboard();
        if (active) {
          setAnalytics(response.data?.totals || {});
        }
      } catch (err) {
        if (active) setError(normalizeError(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAnalytics();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <section>
        <h1 className="text-2xl font-semibold text-slate-950">Analytics</h1>
        <p className="mt-1 text-sm text-slate-600">Platform performance and metrics overview</p>
      </section>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-amber-500" />
            <p className="mt-4 text-sm text-slate-600">Loading analytics...</p>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="text-sm font-medium text-slate-600">Total Revenue</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">
                ${(analytics?.revenue || 0).toFixed(2)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="text-sm font-medium text-slate-600">Total Orders</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">
                {analytics?.orders || 0}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="text-sm font-medium text-slate-600">Total Users</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">
                {analytics?.users || 0}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="text-sm font-medium text-slate-600">Total Products</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">
                {analytics?.products || 0}
              </p>
            </div>
          </div>

          {/* Charts Placeholder */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-950">Revenue Trend</h2>
            <div className="mt-6 flex h-64 items-center justify-center bg-slate-50">
              <p className="text-sm text-slate-600">Chart visualization coming soon</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
