/* eslint-disable no-unused-vars */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownToLine,
  Banknote,
  CheckCircle2,
  Clock3,
  CreditCard,
  Filter,
  RefreshCw,
  Send,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getInfluencerEarningsWithdrawals,
  requestInfluencerWithdrawal,
} from "../../services/influencerCommerceService";
import { formatCurrency } from "../../utils/formatCurrency";

const numberFormatter = new Intl.NumberFormat("en-IN");

function compactDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function valueLabel(value, format, unit = "") {
  if (format === "currency") return formatCurrency(value || 0);
  const next = numberFormatter.format(Number(value || 0));
  return unit ? `${next} ${unit}` : next;
}

function statusTone(status = "") {
  const value = String(status).toLowerCase();
  if (["completed", "settled", "released", "paid", "approved", "active"].includes(value)) return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  if (["requested", "under_review", "processing", "pending", "hold", "eligible", "generated"].includes(value)) return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
  if (["rejected", "failed", "cancelled", "reversed"].includes(value)) return "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300";
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
}

function Panel({ title, action, children, className = "" }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <h2 className="text-sm font-semibold text-slate-950 dark:text-white">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function EmptyState({ label }) {
  return (
    <div className="flex min-h-28 items-center justify-center rounded-lg border border-dashed border-slate-200 px-4 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
      {label}
    </div>
  );
}

function MetricCard({ item, loading }) {
  if (loading) return <div className="h-32 animate-pulse rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800" />;
  return (
    <div className="min-h-32 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{item.label}</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">{valueLabel(item.value, item.format, item.unit)}</p>
        </div>
        <Wallet className="h-5 w-5 shrink-0 text-indigo-500" />
      </div>
      {item.formula ? <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">{item.formula}</p> : null}
    </div>
  );
}

function Filters({ data, filters, onChange, onRefresh, loading }) {
  const paymentModels = data?.paymentModels?.length
    ? data.paymentModels
    : [
        { key: "all", label: "All" },
        { key: "fixed", label: "Fixed Payment" },
        { key: "commission", label: "Commission" },
        { key: "hybrid", label: "Hybrid" },
        { key: "free_product", label: "Free Product Promotion" },
      ];

  function update(key, value) {
    onChange((current) => ({ ...current, [key]: value, page: 1 }));
  }

  return (
    <Panel
      title="Earnings & Withdrawals"
      action={
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      }
    >
      <div className="grid gap-3 md:grid-cols-5">
        <label className="md:col-span-2">
          <span className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            Payment Model
          </span>
          <select value={filters.paymentModel} onChange={(event) => update("paymentModel", event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white">
            {paymentModels.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-semibold text-slate-500">Range</span>
          <select value={filters.range} onChange={(event) => update("range", event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white">
            {["30d", "7d", "90d", "12m", "custom"].map((range) => <option key={range} value={range}>{range.toUpperCase()}</option>)}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-semibold text-slate-500">Start</span>
          <input type="date" value={filters.startDate} disabled={filters.range !== "custom"} onChange={(event) => update("startDate", event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        </label>
        <label>
          <span className="mb-1 block text-xs font-semibold text-slate-500">End</span>
          <input type="date" value={filters.endDate} disabled={filters.range !== "custom"} onChange={(event) => update("endDate", event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        </label>
      </div>
    </Panel>
  );
}

function Breakdown({ rows = [] }) {
  return (
    <Panel title="Breakdown">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {rows.map((row) => (
          <div key={row.key} className="rounded-lg bg-slate-50 p-4 dark:bg-slate-950">
            <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{row.label}</p>
            <p className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">{valueLabel(row.value, row.format, row.unit)}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function DynamicView({ data, paymentModel }) {
  const viewKey = paymentModel === "free_product" ? "freeProduct" : paymentModel;
  const view = data?.views?.[viewKey] || null;
  if (!view || paymentModel === "all") return null;

  const rows = view.rows || [];
  const columns = {
    fixed: ["campaignName", "deliverable", "amount", "status", "releaseStatus", "releasedDate"],
    commission: ["campaign", "product", "saleAmount", "commissionPercent", "commissionAmount", "status"],
    hybrid: ["campaign", "fixedAmount", "commissionAmount", "totalEarnings", "status"],
    freeProduct: ["campaign", "product", "value", "shipmentStatus", "deliveryDate"],
  }[viewKey] || [];

  return (
    <Panel title={data?.paymentModels?.find((item) => item.key === paymentModel)?.label || "Details"}>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(view.cards || []).map((item) => <MetricCard key={item.key} item={item} />)}
      </div>
      <DataTable rows={rows} columns={columns} emptyLabel="No earnings details found for this filter." />
    </Panel>
  );
}

function WithdrawalPanel({ data, onSubmitted }) {
  const [amount, setAmount] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const withdrawal = data?.withdrawals || {};
  const accounts = useMemo(() => withdrawal.bankAccounts || [], [withdrawal.bankAccounts]);
  const eligibility = withdrawal.eligibility || {};

  useEffect(() => {
    if (!bankAccountId && accounts.length) setBankAccountId(accounts[0].id || "");
  }, [accounts, bankAccountId]);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setError("");
    try {
      await requestInfluencerWithdrawal({ amount: Number(amount), bankAccountId });
      setAmount("");
      setMessage("Withdrawal request submitted.");
      onSubmitted?.();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not submit withdrawal request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Panel title="Withdrawal Request" className="lg:col-span-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-emerald-50 p-4 dark:bg-emerald-950/30">
          <p className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-300">Available Balance</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{formatCurrency(withdrawal.availableBalance || 0)}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-950">
          <p className="text-xs font-semibold uppercase text-slate-500">Minimum Withdrawal</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{formatCurrency(withdrawal.minimumWithdrawalAmount || 0)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <span className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 ${eligibility.kycApproved ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"}`}>
          {eligibility.kycApproved ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
          KYC {withdrawal.kycStatus || "PENDING"}
        </span>
        <span className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 ${eligibility.bankAccountVerified ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"}`}>
          <CreditCard className="h-4 w-4" />
          Bank {eligibility.bankAccountVerified ? "Verified" : "Pending"}
        </span>
      </div>

      <form onSubmit={submit} className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-500">Withdrawal Amount</span>
          <input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min="0" step="0.01" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-500">Bank Account</span>
          <select value={bankAccountId} onChange={(event) => setBankAccountId(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white">
            {accounts.length ? accounts.map((account) => (
              <option key={`${account.id}-${account.label}`} value={account.id}>{account.label} {account.accountNumberMask ? `(${account.accountNumberMask})` : ""}</option>
            )) : <option value="">No verified account</option>}
          </select>
        </label>
        {error ? <div className="flex gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div> : null}
        {message ? <div className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"><CheckCircle2 className="h-4 w-4 shrink-0" />{message}</div> : null}
        <button type="submit" disabled={submitting || !eligibility.canWithdraw} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-400">
          {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Request Withdrawal
        </button>
      </form>
    </Panel>
  );
}

function AnalyticsPanel({ rows = [] }) {
  return (
    <Panel title="Earnings Analytics" className="lg:col-span-7">
      {rows.length ? (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart data={rows} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" width={64} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Area type="monotone" dataKey="total" name="Monthly Earnings" stroke="#4f46e5" fill="#c7d2fe" strokeWidth={2} />
              <Area type="monotone" dataKey="fixed" name="Fixed" stroke="#0891b2" fill="#bae6fd" strokeWidth={2} />
              <Area type="monotone" dataKey="commission" name="Commission" stroke="#16a34a" fill="#bbf7d0" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : <EmptyState label="No earnings trend available for this period." />}
    </Panel>
  );
}

function WithdrawalTrend({ rows = [] }) {
  return (
    <Panel title="Withdrawal Trend" className="lg:col-span-5">
      {rows.length ? (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <LineChart data={rows} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" width={64} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Line type="monotone" dataKey="withdrawals" stroke="#e11d48" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : <EmptyState label="No withdrawal trend available." />}
    </Panel>
  );
}

function DataTable({ rows = [], columns = [], emptyLabel = "No records found." }) {
  if (!rows.length) return <EmptyState label={emptyLabel} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] table-fixed text-left text-sm">
        <thead className="text-xs uppercase text-slate-500 dark:text-slate-400">
          <tr>
            {columns.map((column) => <th key={column} className="px-3 py-2 font-semibold">{column.replace(/([A-Z])/g, " $1")}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((row) => (
            <tr key={row.id || row.requestId || row.reference} className="text-slate-700 dark:text-slate-200">
              {columns.map((column) => {
                const value = row[column];
                const isMoney = ["amount", "saleAmount", "commissionAmount", "fixedAmount", "totalEarnings", "value", "credit", "debit", "balance"].includes(column);
                const isDate = /date|at/i.test(column);
                const isStatus = /status/i.test(column);
                return (
                  <td key={column} className="truncate px-3 py-3" title={String(value || "")}>
                    {isStatus ? <span className={`inline-flex max-w-full rounded-lg px-2 py-1 text-xs font-semibold ${statusTone(value)}`}>{String(value || "-").replace(/_/g, " ")}</span> : isMoney ? formatCurrency(value || 0) : isDate ? compactDate(value) : String(value ?? "-")}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function InfluencerEarningsWithdrawalsPage() {
  const [filters, setFilters] = useState({
    paymentModel: "all",
    range: "30d",
    startDate: "",
    endDate: "",
    page: 1,
    limit: 10,
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const params = useMemo(() => {
    const next = { ...filters };
    if (next.range !== "custom") {
      delete next.startDate;
      delete next.endDate;
    }
    Object.keys(next).forEach((key) => {
      if (next[key] === "") delete next[key];
    });
    return next;
  }, [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getInfluencerEarningsWithdrawals(params);
      setData(response?.data || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not load earnings and withdrawals.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  const withdrawalTrend = useMemo(() => (
    data?.analytics?.monthlyEarnings || []
  ).map((row) => ({ month: row.month, withdrawals: row.withdrawals })), [data?.analytics?.monthlyEarnings]);

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-5">
      <Filters data={data} filters={filters} onChange={setFilters} onRefresh={load} loading={loading} />

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100">
          {error}
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(data?.kpis || Array.from({ length: 4 })).map((item, index) => <MetricCard key={item?.key || index} item={item} loading={loading} />)}
      </section>

      {filters.paymentModel === "all" ? <Breakdown rows={data?.breakdown || []} /> : <DynamicView data={data} paymentModel={filters.paymentModel} />}

      <section className="grid gap-5 lg:grid-cols-12">
        <WithdrawalPanel data={data} onSubmitted={load} />
        <AnalyticsPanel rows={data?.analytics?.monthlyEarnings || []} />
      </section>

      <section className="grid gap-5 lg:grid-cols-12">
        <WithdrawalTrend rows={withdrawalTrend} />
        <Panel title="Withdrawal History" className="lg:col-span-7">
          <DataTable
            rows={data?.withdrawals?.history || []}
            columns={["requestId", "amount", "status", "requestedDate", "processedDate", "transactionReference"]}
            emptyLabel="No withdrawal requests yet."
          />
        </Panel>
      </section>

      <Panel
        title="Transaction Ledger"
        action={<ArrowDownToLine className="h-4 w-4 text-slate-400" />}
      >
        <DataTable
          rows={data?.transactionLedger?.rows || []}
          columns={["date", "description", "source", "credit", "debit", "balance", "reference"]}
          emptyLabel="No wallet ledger entries yet."
        />
        {data?.transactionLedger?.pagination?.pages > 1 ? (
          <div className="mt-4 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
            <span>Page {data.transactionLedger.pagination.page} of {data.transactionLedger.pagination.pages}</span>
            <div className="flex gap-2">
              <button disabled={filters.page <= 1} onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40 dark:border-slate-700">Previous</button>
              <button disabled={filters.page >= data.transactionLedger.pagination.pages} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40 dark:border-slate-700">Next</button>
            </div>
          </div>
        ) : null}
      </Panel>

      <Panel title="Source Integrity" action={<Banknote className="h-4 w-4 text-slate-400" />}>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
            <p className="text-xs font-semibold uppercase text-slate-500">Balance Source</p>
            <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{data?.wallet?.source || "influencer_ledgers"}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
            <p className="text-xs font-semibold uppercase text-slate-500">Stored Wallet</p>
            <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{formatCurrency(data?.wallet?.storedAvailableBalance || 0)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
            <p className="text-xs font-semibold uppercase text-slate-500">Calculated Wallet</p>
            <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{formatCurrency(data?.wallet?.calculatedAvailableBalance || 0)}</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
