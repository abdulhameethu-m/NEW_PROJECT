import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge";
import { getUserDashboard } from "../services/userService";
import { formatCurrency } from "../utils/formatCurrency";

function normalizeError(err) {
  return err?.response?.data?.message || err?.message || "Failed to load dashboard.";
}

export function UserDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    getUserDashboard()
      .then((response) => {
        if (!cancelled) {
          setDashboard(response.data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(normalizeError(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = dashboard?.stats || {};

  return (
    <div className="grid gap-6">
      <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-900 px-6 py-8 text-white shadow-sm">
        <div className="max-w-3xl">
          <div className="text-xs uppercase tracking-[0.28em] text-slate-300">Customer dashboard</div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Welcome back, {dashboard?.user?.name || "there"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-200 sm:text-base">
            Track your orders, manage your profile, save favorite products, and stay on top of deliveries from one place.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/orders" className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950">
              View orders
            </Link>
            <Link to="/shop" className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white">
              Continue shopping
            </Link>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total orders", value: stats.totalOrders || 0, tone: "slate" },
          { label: "Pending orders", value: stats.pendingOrders || 0, tone: "amber" },
          { label: "Wishlist", value: stats.wishlistCount || 0, tone: "rose" },
          { label: "Unread alerts", value: stats.unreadNotifications || 0, tone: "blue" },
        ].map((item) => (
          <div
            key={item.label}
            className={`rounded-3xl border p-5 shadow-sm ${
              item.tone === "slate"
                ? "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                : item.tone === "amber"
                  ? "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20"
                  : item.tone === "rose"
                    ? "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/20"
                    : "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20"
            }`}
          >
            <div className="text-sm text-slate-500 dark:text-slate-400">{item.label}</div>
            <div className="mt-3 text-3xl font-bold text-slate-950 dark:text-white">{loading ? "..." : item.value}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Recent orders</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Your latest order activity</p>
            </div>
            <Link to="/orders" className="text-sm font-medium text-blue-600 hover:underline">
              View all
            </Link>
          </div>

          <div className="mt-5 grid gap-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
              ))
            ) : (dashboard?.recentOrders || []).length ? (
              dashboard.recentOrders.map((order) => (
                <Link
                  key={order._id}
                  to={`/orders/${order._id}`}
                  className="rounded-2xl border border-slate-200 p-4 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-950 dark:text-white">{order.orderNumber}</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {new Date(order.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge value={order.status} />
                      <StatusBadge value={order.paymentStatus} />
                    </div>
                  </div>
                  <div className="mt-3 text-sm font-semibold text-slate-950 dark:text-white">
                    {formatCurrency(order.totalAmount || 0)}
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No recent orders yet.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Quick actions</h2>
          <div className="mt-5 grid gap-3">
            {(dashboard?.quickActions || []).map((action) => (
              <Link
                key={action.href}
                to={action.href}
                className="rounded-2xl border border-slate-200 px-4 py-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {action.label}
              </Link>
            ))}
            <Link
              to="/notifications"
              className="rounded-2xl border border-slate-200 px-4 py-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              View notifications
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
