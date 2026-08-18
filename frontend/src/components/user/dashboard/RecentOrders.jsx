import { Link } from "react-router-dom";
import { PackageOpen, ArrowRight } from "lucide-react";
import { StatusBadge } from "../../StatusBadge";
import { formatCurrency } from "../../../utils/formatCurrency";
import { EmptyState } from "./EmptyState";
import { formatDateTime } from "./dashboardUtils";

export function RecentOrders({ orders = [] }) {
  const visibleOrders = orders.slice(0, 3);

  return (
    <section aria-labelledby="recent-orders-title" className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="recent-orders-title" className="text-[15px] font-black text-slate-950 dark:text-white">
            Recent orders
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Latest purchase activity</p>
        </div>
        <Link to="/orders" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline dark:text-indigo-400">
          View all orders
        </Link>
      </div>

      {visibleOrders.length ? (
        <div className="grid gap-3">
          {visibleOrders.map((order) => (
            <article
              key={order._id}
              className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
            >
              <div className="flex gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <PackageOpen className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-black text-slate-950 dark:text-white">
                        {order.orderNumber || "Order"}
                      </h3>
                      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{formatDateTime(order.createdAt)}</p>
                    </div>
                    <p className="shrink-0 text-sm font-black text-slate-950 dark:text-white">
                      {formatCurrency(order.totalAmount || 0)}
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <StatusBadge value={order.status} />
                    <StatusBadge value={order.paymentStatus} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      to={`/orders/${order._id}`}
                      className="inline-flex h-8 items-center justify-center rounded-lg bg-indigo-600 px-4 text-[11px] font-bold text-white transition hover:bg-indigo-700 active:scale-95 dark:bg-indigo-500"
                    >
                      View details
                    </Link>
                    <Link
                      to={`/orders/${order._id}`}
                      className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 px-4 text-[11px] font-bold text-slate-700 transition hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Track order
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}
          {orders.length > 3 && (
            <div className="mt-2 flex justify-center">
              <Link to="/orders" className="group inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 transition hover:text-indigo-700 dark:text-indigo-400">
                View all orders
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          )}
        </div>
      ) : (
        <EmptyState title="No orders yet" actionLabel="Browse products" actionTo="/shop" icon={PackageOpen} />
      )}
    </section>
  );
}
