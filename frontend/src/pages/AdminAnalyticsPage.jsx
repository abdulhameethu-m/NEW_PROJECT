import { useEffect, useState } from "react";
import { getAnalytics } from "../services/adminApi";
import { StatusBadge } from "../components/StatusBadge";
import { formatCurrency } from "../utils/formatCurrency";

function normalizeError(err) {
  return err?.response?.data?.message || err?.message || "Request failed";
}

export function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getAnalytics();
        if (alive) setAnalytics(res.data);
      } catch (err) {
        if (alive) setError(normalizeError(err));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const stats = analytics?.stats || {};
  const overview = analytics?.salesOverview || [];
  const topProducts = analytics?.topProducts || [];

  return (
    <div className="grid min-w-0 max-w-full gap-4">
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="grid min-w-0 max-w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Revenue" value={formatCurrency(stats.revenue || 0)} />
        <StatTile label="Delivered Orders" value={stats.deliveredOrders || 0} />
        <StatTile label="Approved Products" value={stats.approvedProducts || 0} />
        <StatTile label="Approved Sellers" value={stats.sellers || 0} />
      </div>

      <div className="grid min-w-0 max-w-full gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,1fr)]">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <h2 className="text-base font-semibold text-slate-950 dark:text-white sm:text-lg">Revenue timeline</h2>
          <div className="mt-4 grid gap-3">
            {loading ? (
              <div className="h-56 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
            ) : overview.length ? (
              overview.map((entry) => (
                <div key={entry.label} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-950 dark:text-white">{entry.label}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{entry.orders} orders</div>
                    </div>
                    <div className="text-sm font-semibold text-slate-950 dark:text-white">
                      {formatCurrency(entry.revenue || 0)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No sales data available yet.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <h2 className="text-base font-semibold text-slate-950 dark:text-white sm:text-lg">Top products</h2>
          <div className="mt-4 grid gap-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
              ))
            ) : topProducts.length ? (
              topProducts.map((product) => (
                <div key={product._id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">{product.name}</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{product.category}</div>
                    </div>
                    <StatusBadge value={product.status} />
                  </div>
                  <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                    Revenue {formatCurrency(product.analytics?.totalRevenue || 0)} • Sales {product.analytics?.salesCount || 0}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No product analytics available.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-2 break-words text-2xl font-bold text-slate-950 dark:text-white sm:text-3xl">{value}</div>
    </div>
  );
}
