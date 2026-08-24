import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { getUserDashboard } from "../services/userService";
import { AccountSummary } from "../components/user/dashboard/AccountSummary";
import { DashboardGreeting } from "../components/user/dashboard/DashboardGreeting";
import { DashboardSkeleton } from "../components/user/dashboard/DashboardSkeleton";
import { ProductRail } from "../components/user/dashboard/ProductRail";
import { QuickActions } from "../components/user/dashboard/QuickActions";
import { RecentOrders } from "../components/user/dashboard/RecentOrders";

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

  if (loading) return <DashboardSkeleton />;

  const stats = dashboard?.stats || {};
  const recentOrders = dashboard?.recentOrders || [];
  const recentlyViewed = dashboard?.recentlyViewed || [];
  const recommendedProducts = dashboard?.recommendedProducts || dashboard?.recommendations || [];

  return (
    <div className="mx-auto grid grid-cols-1 w-full max-w-6xl gap-4 px-4 pb-4 sm:px-6 sm:pb-6 lg:px-8">
      <DashboardGreeting user={dashboard?.user} recentOrder={recentOrders[0]} />

      {error ? (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/20 dark:text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <QuickActions />
      <AccountSummary stats={stats} />

      <div className="grid grid-cols-1 gap-4 w-full min-w-0 xl:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
        <RecentOrders orders={recentOrders} />
        <div className="grid grid-cols-1 gap-4 min-w-0 overflow-hidden">
          <ProductRail title="Recently viewed" products={recentlyViewed} emptyTitle="No recently viewed products" />
          <ProductRail title="Recommended for you" products={recommendedProducts} emptyTitle="Recommended products will appear here" />
        </div>
      </div>
    </div>
  );
}
