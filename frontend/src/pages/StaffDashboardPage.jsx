import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Package, Receipt, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { getDashboard, listOrders, listProducts, listUsers } from "../services/adminApi";
import { getAccessibleModules } from "../config/staffModules";
import { useStaffPermission, useStaffUser } from "../hooks/useStaffAuth";

const FALLBACK_STATS = {
  users: { label: "Users", value: "Access granted", icon: Users, accent: "bg-sky-50 text-sky-700" },
  orders: { label: "Orders", value: "Access granted", icon: Receipt, accent: "bg-emerald-50 text-emerald-700" },
  products: { label: "Products", value: "Access granted", icon: Package, accent: "bg-amber-50 text-amber-700" },
  payouts: { label: "Payouts", value: "Access granted", icon: TrendingUp, accent: "bg-violet-50 text-violet-700" },
};

function formatCompact(value) {
  if (typeof value !== "number") return value;
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function StaffDashboardPage() {
  const { user } = useStaffUser();
  const { hasPermission, permissions } = useStaffPermission();
  const accessibleModules = useMemo(() => getAccessibleModules(permissions), [permissions]);

  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadStats() {
      setLoading(true);
      const tasks = [];

      if (hasPermission("analytics.read")) {
        tasks.push(getDashboard().then((response) => ({ type: "dashboard", payload: response.data })));
      }
      if (hasPermission("users.read")) {
        tasks.push(listUsers().then((response) => ({ type: "users", payload: response.data })));
      }
      if (hasPermission("orders.read")) {
        tasks.push(listOrders({ page: 1, limit: 1 }).then((response) => ({ type: "orders", payload: response.data })));
      }
      if (hasPermission("products.read")) {
        tasks.push(listProducts({ page: 1, limit: 1 }).then((response) => ({ type: "products", payload: response.data })));
      }

      const results = await Promise.allSettled(tasks);
      if (!active) return;

      const nextStats = [];

      for (const result of results) {
        if (result.status !== "fulfilled") continue;

        if (result.value.type === "dashboard") {
          const totals = result.value.payload?.totals || {};
          nextStats.push({
            key: "revenue",
            label: "Platform Revenue",
            value: typeof totals.revenue === "number" ? `$${formatCompact(totals.revenue)}` : "Available",
            icon: ShieldCheck,
            accent: "bg-slate-900 text-white",
          });
        }

        if (result.value.type === "users") {
          nextStats.push({
            key: "users",
            ...FALLBACK_STATS.users,
            value: Array.isArray(result.value.payload) ? formatCompact(result.value.payload.length) : FALLBACK_STATS.users.value,
          });
        }

        if (result.value.type === "orders") {
          nextStats.push({
            key: "orders",
            ...FALLBACK_STATS.orders,
            value: formatCompact(result.value.payload?.pagination?.total || 0),
          });
        }

        if (result.value.type === "products") {
          nextStats.push({
            key: "products",
            ...FALLBACK_STATS.products,
            value: formatCompact(result.value.payload?.pagination?.total || 0),
          });
        }
      }

      if (hasPermission("payouts.read")) {
        nextStats.push({ key: "payouts", ...FALLBACK_STATS.payouts });
      }

      setStats(nextStats);
      setLoading(false);
    }

    loadStats();

    return () => {
      active = false;
    };
  }, [hasPermission]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-6 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.16),_transparent_42%),linear-gradient(135deg,_#0f172a,_#1e293b)] px-6 py-8 text-white lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,.9fr)] lg:px-8">
          <div>
            <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-amber-200">
              Staff Access
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">Welcome back, {user?.name || "Staff"}.</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-200">
              This dashboard is generated from your live role permissions. When an admin changes your role,
              the workspace refreshes from the latest `/api/staff/auth/me` response.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-5 backdrop-blur">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Current access</div>
            <div className="mt-4 text-4xl font-semibold">{accessibleModules.length}</div>
            <div className="mt-1 text-sm text-slate-300">
              module{accessibleModules.length === 1 ? "" : "s"} available in your workspace
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-36 animate-pulse rounded-[1.5rem] bg-slate-100" />
            ))
          : stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <article key={stat.key} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                      <p className="mt-3 text-3xl font-semibold text-slate-950">{stat.value}</p>
                    </div>
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${stat.accent}`}>
                      <Icon size={20} />
                    </div>
                  </div>
                </article>
              );
            })}
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-950">Modules you can access</h2>
        <p className="mt-1 text-sm text-slate-500">Every card below is generated from the shared staff module config.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {accessibleModules
            .filter((module) => module.key !== "dashboard")
            .map((module) => (
              <Link
                key={module.key}
                to={module.route}
                className="group rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-white hover:shadow-lg"
              >
                <div className="text-sm font-semibold text-slate-950">{module.name}</div>
                <p className="mt-2 text-sm text-slate-500">{module.description}</p>
                <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-amber-700">
                  Open module
                  <ArrowRight size={16} className="transition group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-950">Permission matrix</h2>
        <p className="mt-1 text-sm text-slate-500">Actions available to your current role.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(permissions)
            .filter(([, actions]) => Object.values(actions || {}).some(Boolean))
            .map(([moduleName, actions]) => (
              <div key={moduleName} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold capitalize text-slate-950">{moduleName}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(actions)
                    .filter(([, enabled]) => enabled)
                    .map(([action]) => (
                      <span
                        key={action}
                        className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800"
                      >
                        {action}
                      </span>
                    ))}
                </div>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}
