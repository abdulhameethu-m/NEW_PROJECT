import { createElement } from "react";
import { BarChart3, Calculator, Link as LinkIcon, Package, Percent, Search, Settings, SlidersHorizontal, Users, WalletCards } from "lucide-react";

const MODULES = {
  dashboard: { label: "Dashboard", icon: BarChart3, path: "/admin/influencer-commerce" },
  influencers: { label: "Influencers", icon: Users, path: "/admin/influencer-commerce/influencers" },
  vendors: { label: "Vendors", icon: Users, path: "/admin/influencer-commerce/vendors" },
  campaigns: { label: "Campaign Management", icon: BarChart3, path: "/admin/influencer-commerce/campaigns" },
  "vendor-campaign-commission": { label: "Vendor Campaign Commission", icon: Calculator, path: "/admin/influencer-commerce/vendor-campaign-commission" },
  matching: { label: "Influencer-Vendor Matching", icon: Search, path: "/admin/influencer-commerce/matching" },
  "affiliate-links": { label: "Affiliate Links", icon: LinkIcon, path: "/admin/influencer-commerce/affiliate-links" },
  tracking: { label: "Affiliate Tracking", icon: LinkIcon, path: "/admin/influencer-commerce/tracking" },
  promotions: { label: "Product Promotions", icon: Package, path: "/admin/influencer-commerce/promotions" },
  settlements: { label: "Escrow & Settlements", icon: WalletCards, path: "/admin/influencer-commerce/settlements" },
  revenue: { label: "Revenue Dashboard", icon: Percent, path: "/admin/influencer-commerce/revenue" },
  payouts: { label: "Payout Management", icon: WalletCards, path: "/admin/influencer-commerce/payouts" },
  configuration: { label: "Tier & Score", icon: SlidersHorizontal, path: "/admin/influencer-commerce/configuration" },
  settings: { label: "Settings", icon: Settings, path: "/admin/influencer-commerce/settings" },
};

const MODULE_IDS = new Set(Object.keys(MODULES));
const defaultFilters = {
  search: "",
  vendorId: "",
  influencerId: "",
  campaignId: "",
  productId: "",
  paymentModel: "all",
  category: "",
  status: "",
  trackingStatus: "",
  startDate: "",
  endDate: "",
  page: 1,
  limit: 20,
};

function unwrap(response) {
  return response?.data ?? response ?? {};
}

function idOf(row) {
  if (typeof row === "string" || typeof row === "number") return String(row);
  return row?.id || row?._id;
}

function text(value, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function numberValue(value) {
  return Number(value || 0).toLocaleString();
}

function percentValue(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function dateValue(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}

function shortText(value, max = 42) {
  const next = text(value);
  if (next === "-") return next;
  return next.length > max ? `${next.slice(0, max - 3)}...` : next;
}

function statusText(value = "") {
  return String(value || "pending").replace(/_/g, " ");
}

function pickUserName(value) {
  return value?.name || value?.displayName || value?.userId?.name || value?.profile?.name || value?.username || value?.userId?.email || "Creator";
}

function pickVendorName(value) {
  return value?.name || value?.shopName || value?.companyName || value?.vendor?.shopName || value?.vendorId?.shopName || "Vendor";
}

function Section({ title, icon: Icon, action, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          {createElement(Icon, { className: "h-4 w-4 text-indigo-500", "aria-hidden": "true" })}
          <h2 className="text-sm font-semibold text-slate-950 dark:text-white">{title}</h2>
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Metric({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </div>
  );
}

function StatusBadge({ value }) {
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-700 dark:bg-slate-800 dark:text-slate-200">
      {statusText(value)}
    </span>
  );
}

function campaignActionState(row = {}) {
  const state = String(row.state || row.status || "").toLowerCase();
  return {
    cancelled: state === "cancelled",
    completed: state === "completed",
    published: Boolean(row.marketplace?.public),
  };
}

function FieldShell({ label, children, className = "" }) {
  return (
    <label className={`grid min-w-0 gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 ${className}`}>
      <span className="block min-w-0 truncate">{label}</span>
      {children}
    </label>
  );
}

function ActionButton({ children, icon: Icon, tone = "indigo", disabled, onClick, type = "button" }) {
  const tones = {
    indigo: "bg-indigo-600 text-white hover:bg-indigo-500",
    slate: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200",
    green: "bg-emerald-600 text-white hover:bg-emerald-500",
    red: "bg-rose-600 text-white hover:bg-rose-500",
    amber: "bg-amber-500 text-white hover:bg-amber-400",
  };
  return (
    <button
      type={type}
      onClick={(event) => {
        if (type !== "submit") {
          event.preventDefault();
        }
        if (onClick) {
          onClick(event);
        }
      }}
      disabled={disabled}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-xl px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]}`}
    >
      {Icon ? createElement(Icon, { className: "h-4 w-4", "aria-hidden": "true" }) : null}
      {children}
    </button>
  );
}

function Filters({ filters, setFilters, compact = false }) {
  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-6">
      <label className="relative block md:col-span-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          value={filters.search}
          onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value, page: 1 }))}
          placeholder="Search influencer commerce"
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          aria-label="Search influencer commerce"
        />
      </label>
      <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value, page: 1 }))} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" aria-label="Status filter">
        <option value="">All statuses</option>
        <option value="active">Active</option>
        <option value="pending">Pending</option>
        <option value="pending_content">Pending Content</option>
        <option value="disabled">Disabled</option>
        <option value="expired">Expired</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
        <option value="paid">Paid</option>
        <option value="hold">Hold</option>
      </select>
      <select value={filters.trackingStatus} onChange={(event) => setFilters((current) => ({ ...current, trackingStatus: event.target.value, page: 1 }))} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" aria-label="Tracking status filter">
        <option value="">All tracking</option>
        <option value="active">Tracking active</option>
        <option value="inactive">Tracking inactive</option>
        <option value="expired">Tracking expired</option>
      </select>
      {!compact ? (
        <>
          <input type="date" value={filters.startDate} onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value, page: 1 }))} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" aria-label="Start date" />
          <input type="date" value={filters.endDate} onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value, page: 1 }))} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" aria-label="End date" />
          <input value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value, page: 1 }))} placeholder="Category" className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" aria-label="Category filter" />
        </>
      ) : null}
    </div>
  );
}

function ResponsiveTable({ headers, rows, renderRow }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[980px] w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <tr>
            {headers.map((header) => (
              <th key={header} className="whitespace-nowrap px-3 py-3 font-semibold">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows?.length ? rows.map(renderRow) : (
            <tr>
              <td colSpan={headers.length} className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No records found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SimpleBars({ rows = [], valueKey = "revenue", labelKey = "date" }) {
  const max = Math.max(...rows.map((row) => Number(row[valueKey] || 0)), 1);
  return (
    <div className="flex h-52 items-end gap-2 overflow-x-auto rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
      {rows.map((row, index) => (
        <div key={`${row[labelKey] || index}-${index}`} className="flex min-w-8 flex-1 flex-col items-center gap-2">
          <div className="w-full rounded-t-lg bg-indigo-500" style={{ height: `${Math.max(6, (Number(row[valueKey] || 0) / max) * 170)}px` }} />
          <span className="max-w-16 truncate text-[10px] text-slate-500 dark:text-slate-400">{String(row[labelKey] || index).slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

function Pagination({ pagination, setFilters }) {
  if (!pagination?.total) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
      <span>{numberValue(pagination.total)} records</span>
      <div className="flex items-center gap-2">
        <ActionButton tone="slate" disabled={pagination.page <= 1} onClick={() => setFilters((current) => ({ ...current, page: Math.max(1, Number(current.page || 1) - 1) }))}>Previous</ActionButton>
        <span>Page {pagination.page || 1} of {pagination.pages || 1}</span>
        <ActionButton tone="slate" disabled={(pagination.page || 1) >= (pagination.pages || 1)} onClick={() => setFilters((current) => ({ ...current, page: Number(current.page || 1) + 1 }))}>Next</ActionButton>
      </div>
    </div>
  );
}


export { MODULES, MODULE_IDS, defaultFilters, unwrap, idOf, text, numberValue, percentValue, dateValue, shortText, statusText, pickUserName, pickVendorName, Section, Metric, StatusBadge, campaignActionState, FieldShell, ActionButton, Filters, ResponsiveTable, SimpleBars, Pagination };
