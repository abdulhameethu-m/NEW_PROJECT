import { useEffect, useState } from "react";
import { listPayouts } from "../services/adminApi";
import { useStaffPermission } from "../hooks/useStaffAuth";

function normalizeError(error) {
  return error?.response?.data?.message || error?.message || "Request failed";
}

export function StaffPayoutsPage() {
  const { hasPermission } = useStaffPermission();
  const [statusFilter, setStatusFilter] = useState("all");
  const [overview, setOverview] = useState({ totalAmount: 0, pendingAmount: 0, paidAmount: 0, failedAmount: 0 });
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPayouts() {
      setLoading(true);
      setError("");
      try {
        const response = await listPayouts(statusFilter === "all" ? {} : { status: statusFilter });
        if (active) {
          setOverview(response.data?.overview || {});
          setPayouts(response.data?.payouts || []);
        }
      } catch (err) {
        if (active) setError(normalizeError(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPayouts();

    return () => {
      active = false;
    };
  }, [statusFilter]);

  const stats = [
    { label: "Total payout volume", value: overview.totalAmount || 0, icon: DownloadIcon, accent: "bg-slate-900 text-white" },
    { label: "Pending", value: overview.pendingAmount || 0, icon: ClockIcon, accent: "bg-amber-50 text-amber-700" },
    { label: "Paid", value: overview.paidAmount || 0, icon: CheckCircleIcon, accent: "bg-emerald-50 text-emerald-700" },
    { label: "Failed", value: overview.failedAmount || 0, icon: XCircleIcon, accent: "bg-rose-50 text-rose-700" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payouts</h1>
          <p className="mt-1 text-slate-600">Vendor payout visibility and finance operations based on payout permissions.</p>
        </div>
        {hasPermission("payouts.process") ? (
          <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
            Payout processing enabled
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-500">{stat.label}</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-950">${Number(stat.value || 0).toFixed(2)}</div>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.accent}`}>
                  <Icon size={18} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-[1.25rem] border border-slate-200 px-4 py-3 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PAID">Paid</option>
          <option value="FAILED">Failed</option>
        </select>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <DownloadIcon className="h-4 w-4" />
          Export report
        </button>
      </div>

      {error ? (
        <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="grid gap-3 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : payouts.length ? (
          <div className="divide-y divide-slate-200">
            {payouts.map((payout) => (
              <div key={payout._id} className="grid gap-4 px-4 py-4 lg:grid-cols-[1fr_1fr_.8fr_.8fr] lg:items-center lg:px-5">
                <div>
                  <div className="font-semibold text-slate-950">{payout.orderId?.orderNumber || payout._id}</div>
                  <div className="mt-1 text-xs text-slate-500">{new Date(payout.createdAt).toLocaleString()}</div>
                </div>
                <div className="text-sm text-slate-600">{payout.sellerId?.companyName || "Unknown vendor"}</div>
                <div className="font-semibold text-slate-950">${Number(payout.amount || 0).toFixed(2)}</div>
                <div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {payout.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-12 text-center text-sm text-slate-500">No payouts found.</div>
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

function DownloadIcon({ className = "h-4 w-4" }) {
  return (
    <IconBase className={className}>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </IconBase>
  );
}

function ClockIcon({ className = "h-4 w-4" }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </IconBase>
  );
}

function CheckCircleIcon({ className = "h-4 w-4" }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </IconBase>
  );
}

function XCircleIcon({ className = "h-4 w-4" }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6" />
      <path d="m15 9-6 6" />
    </IconBase>
  );
}
