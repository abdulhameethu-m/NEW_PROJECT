import { useEffect, useState } from "react";
import { listOrders, updateOrderStatus } from "../services/adminApi";
import { useStaffPermission } from "../hooks/useStaffAuth";

function normalizeError(error) {
  return error?.response?.data?.message || error?.message || "Request failed";
}

const ORDER_STATUSES = ["Placed", "Packed", "Shipped", "Out for Delivery", "Delivered", "Cancelled", "Returned"];

export function StaffOrdersPage() {
  const { hasPermission } = useStaffPermission();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      setLoading(true);
      setError("");
      try {
        const response = await listOrders({
          page: 1,
          limit: 50,
          ...(statusFilter !== "all" ? { status: statusFilter } : {}),
          ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
        });
        if (active) setOrders(response.data?.orders || []);
      } catch (err) {
        if (active) setError(normalizeError(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadOrders();

    return () => {
      active = false;
    };
  }, [searchTerm, statusFilter]);

  async function handleStatusChange(orderId, nextStatus) {
    setBusyId(orderId);
    setError("");
    try {
      const response = await updateOrderStatus(orderId, nextStatus);
      setOrders((current) => current.map((order) => (order._id === orderId ? response.data : order)));
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="mt-1 text-slate-600">View and manage platform orders with permission-aware actions.</p>
        </div>
        <div className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
          {orders.length} order{orders.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search orders"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-[1.25rem] border border-slate-200 py-3 pl-10 pr-4 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-[1.25rem] border border-slate-200 px-4 py-3 text-sm"
        >
          <option value="all">All statuses</option>
          {ORDER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="grid gap-3 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : orders.length ? (
          <div className="divide-y divide-slate-200">
            {orders.map((order) => (
              <div key={order._id} className="grid gap-4 px-4 py-4 lg:grid-cols-[1.1fr_1fr_.8fr_1fr] lg:items-center lg:px-5">
                <div>
                  <div className="font-semibold text-slate-950">{order.orderNumber || order._id}</div>
                  <div className="mt-1 text-xs text-slate-500">{new Date(order.createdAt).toLocaleString()}</div>
                </div>
                <div className="text-sm text-slate-600">
                  <div>{order.userId?.name || "Unknown customer"}</div>
                  <div className="mt-1 text-xs text-slate-500">{order.userId?.email || ""}</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-950">${Number(order.totalAmount || 0).toFixed(2)}</div>
                  <div className="mt-1 text-xs text-slate-500">{order.paymentStatus || "Pending payment"}</div>
                </div>
                <div>
                  {hasPermission("orders.update") ? (
                    <select
                      value={order.status}
                      disabled={busyId === order._id}
                      onChange={(event) => handleStatusChange(order._id, event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    >
                      {ORDER_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {order.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-12 text-center text-sm text-slate-500">No orders match the current filters.</div>
        )}
      </div>
    </div>
  );
}

function IconBase({ className = "h-4 w-4", children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function SearchIcon({ className = "h-4 w-4" }) {
  return (
    <IconBase className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </IconBase>
  );
}
