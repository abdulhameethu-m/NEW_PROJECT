import { useEffect, useMemo, useState } from "react";
import { Filter, RefreshCw, SlidersHorizontal } from "lucide-react";
import { FinanceTabs } from "../components/finance/FinanceComponents";
import { VendorDataTable, VendorMetricCard, VendorSection } from "../components/VendorPanel";
import { getAdminCampaignFinance, getInfluencerCampaignEarnings, getVendorCampaignFinance } from "../services/campaignFinanceService";
import { formatCurrency } from "../utils/formatCurrency";

const vendorTabs = [
  { label: "Wallet", to: "/vendor/finance" },
  { label: "Commission", to: "/vendor/finance/commission" },
  { label: "Campaign Finance", to: "/vendor/finance/campaign-finance" },
  { label: "Payout History", to: "/vendor/finance/payouts" },
  { label: "Ledger", to: "/vendor/finance/ledger" },
  { label: "Payout Account", to: "/vendor/finance/account" },
];

const modelOptions = [
  ["all", "All Campaigns"],
  ["fixed", "Fixed Model"],
  ["commission", "Commission Model"],
  ["hybrid", "Hybrid Model"],
  ["free_product", "Free Product Promotion"],
];

const VENDOR_CAMPAIGN_FINANCE_COLUMNS_KEY = "vendor-campaign-finance-hidden-columns";

const metricSets = {
  vendor: {
    all: [["Total Campaign Revenue", "campaignRevenue"], ["Total Campaign Orders", "campaignOrders", "number"], ["Products Sold", "productsSold", "number"], ["Total Influencer Cost", "totalInfluencerCost"], ["Vendor Net Revenue", "vendorNetRevenue"], ["Campaign ROI", "campaignRoi", "percent"], ["Campaign Count", "campaignCount", "number"], ["Influencer Earnings", "totalInfluencerEarnings"]],
    fixed: [["Released Amount", "releasedAmount"], ["Unreleased Amount", "unreleasedAmount"], ["Escrow Balance", "escrowBalance"], ["Total Influencer Cost", "totalInfluencerCost"], ["Vendor Net Revenue", "vendorNetRevenue"], ["Completed Deliverables", "completedDeliverables", "number"], ["Pending Deliverables", "pendingDeliverables", "number"]],
    commission: [["Campaign Revenue", "campaignRevenue"], ["Commission Generated", "commissionGenerated"], ["Influencer Earnings", "commissionEarnings"], ["Vendor Net Revenue", "vendorNetRevenue"], ["Attributed Revenue", "attributedRevenue"], ["Orders Generated", "campaignOrders", "number"], ["Commission Cap Utilized", "commissionCapUtilized"], ["Remaining Commission Budget", "remainingCommissionBudget"], ["Campaign Count", "campaignCount", "number"]],
    hybrid: [["Fixed Reward Paid", "fixedReleasedAmount"], ["Fixed Unreleased Amount", "fixedUnreleasedAmount"], ["Commission Paid", "commissionPaid"], ["Total Campaign Cost", "totalInfluencerCost"], ["Campaign Revenue", "campaignRevenue"], ["Attributed Revenue", "attributedRevenue"], ["Orders Generated", "campaignOrders", "number"], ["Campaign ROI", "campaignRoi", "percent"], ["Commission Cap Utilized", "commissionCapUtilized"], ["Remaining Budget", "remainingCommissionBudget"]],
    free_product: [["Products Sent", "productsSent", "number"], ["Products Delivered", "productsDelivered", "number"], ["Product Value", "productValue"], ["Promotion Count", "promotionCount", "number"], ["Orders Generated", "campaignOrders", "number"], ["Attributed Revenue", "attributedRevenue"], ["Conversion Rate", "conversionRate", "percent"]],
  },
  influencer: {
    all: [["Available Earnings", "totalInfluencerEarnings"], ["Pending Earnings", "unreleasedAmount"], ["Withdrawn Earnings", "releasedAmount"], ["Total Earnings", "totalInfluencerEarnings"], ["Campaign Orders", "campaignOrders", "number"], ["Attributed Revenue", "attributedRevenue"], ["Campaign Count", "campaignCount", "number"], ["Products Promoted", "productsSold", "number"]],
    fixed: [["Released Earnings", "releasedAmount"], ["Unreleased Earnings", "unreleasedAmount"], ["Escrow Pending", "escrowBalance"], ["Withdrawable Balance", "totalInfluencerEarnings"]],
    commission: [["Commission Earned", "commissionEarnings"], ["Attributed Revenue", "attributedRevenue"], ["Orders Generated", "campaignOrders", "number"], ["Average Commission Per Order", "averageCommissionPerOrder"], ["Highest Commission Order", "commissionGenerated"]],
    hybrid: [["Fixed Released", "fixedReleasedAmount"], ["Fixed Unreleased", "fixedUnreleasedAmount"], ["Commission Earned", "commissionEarnings"], ["Pending Commission", "pendingCommission"], ["Withdrawable Balance", "totalInfluencerEarnings"], ["Total Earnings", "totalInfluencerEarnings"]],
    free_product: [["Products Received", "productsSent", "number"], ["Product Value", "productValue"], ["Promotion Count", "promotionCount", "number"], ["Orders Generated", "campaignOrders", "number"]],
  },
  admin: {
    all: [["Total Campaign Revenue", "campaignRevenue"], ["Total Platform Revenue", "platformRevenue"], ["Influencer Earnings", "totalInfluencerEarnings"], ["Vendor Revenue", "vendorNetRevenue"], ["Total Escrow Funds", "escrowFunds"], ["Released Funds", "releasedFunds"], ["Unreleased Funds", "unreleasedFunds"], ["Commission Revenue", "commissionRevenue"], ["Campaign Count", "campaignCount", "number"], ["Orders Generated", "campaignOrders", "number"]],
  },
};

function displayMetric(value, type) {
  if (type === "number") return Number(value || 0).toLocaleString();
  if (type === "percent") return `${Number(value || 0).toFixed(1)}%`;
  return formatCurrency(value || 0);
}

function isoDate(value) {
  return value.toISOString().slice(0, 10);
}

function rangeDates(range, customDates) {
  if (range === "custom") return customDates;
  const days = { "7d": 7, "30d": 30, "90d": 90, "12m": 365 }[range] || 30;
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  return { startDate: isoDate(start), endDate: isoDate(end) };
}

function cleanParams(params) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== "" && value !== null && value !== undefined));
}

function download(rows, format) {
  const headers = ["Order ID", "Campaign", "Model", "Product", "Gross", "Influencer Commission", "Vendor Net", "Order Status", "Payment Status", "Date"];
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const body = rows.map((row) => [row.orderNumber, row.campaignName, row.paymentModel, row.productName, row.grossAmount, row.influencerCommission, row.vendorNet, row.orderStatus, row.paymentStatus, row.orderDate].map(escape).join(format === "excel" ? "\t" : ","));
  const blob = new Blob([[headers.join(format === "excel" ? "\t" : ","), ...body].join("\n")], { type: format === "excel" ? "application/vnd.ms-excel" : "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `campaign-finance.${format === "excel" ? "xls" : "csv"}`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function CampaignFinancePage({ audience, title, description, loader }) {
  const [paymentModel, setPaymentModel] = useState("all");
  const [range, setRange] = useState("30d");
  const [dates, setDates] = useState({ startDate: "", endDate: "" });
  const [refreshKey, setRefreshKey] = useState(0);
  const [columnPickerOpen, setColumnPickerOpen] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState(() => {
    if (audience !== "vendor") return [];
    try {
      const saved = JSON.parse(window.localStorage.getItem(VENDOR_CAMPAIGN_FINANCE_COLUMNS_KEY) || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [state, setState] = useState({ loading: true, error: "", data: { metrics: {}, orders: [] } });
  const params = useMemo(
    () => cleanParams({ paymentModel, ...(audience === "influencer" ? rangeDates(range, dates) : dates), limit: 100 }),
    [audience, paymentModel, range, dates]
  );

  useEffect(() => {
    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: "" }));
    loader(params)
      .then((response) => {
        if (!cancelled) setState({ loading: false, error: "", data: response?.data || { metrics: {}, orders: [] } });
      })
      .catch((error) => {
        if (!cancelled) setState((current) => ({ ...current, loading: false, error: error?.response?.data?.message || error?.message || "Campaign finance could not be loaded." }));
      });
    return () => { cancelled = true; };
  }, [loader, params, refreshKey]);

  useEffect(() => {
    if (audience === "vendor") {
      window.localStorage.setItem(VENDOR_CAMPAIGN_FINANCE_COLUMNS_KEY, JSON.stringify(hiddenColumns));
    }
  }, [audience, hiddenColumns]);

  const metrics = state.data.metrics || {};
  const metricCards = metricSets[audience][paymentModel] || metricSets[audience].all;
  const orderRows = (state.data.orders || []).map((order) => ({
    id: order._id,
    orderNumber: order.orderNumber,
    campaignName: order.campaignName,
    paymentModel: order.paymentModel,
    productName: order.productName,
    customerName: order.customerName,
    grossAmount: formatCurrency(order.grossAmount),
    shippingFee: formatCurrency(order.shippingFee),
    platformFee: formatCurrency(order.platformFee),
    adminCommission: formatCurrency(order.adminCommission),
    influencerCommission: formatCurrency(order.influencerCommission),
    vendorNet: formatCurrency(order.vendorNet),
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    settlementStatus: order.settlementStatus,
    orderDate: order.orderDate ? new Date(order.orderDate).toLocaleDateString() : "-",
  }));
  const columns = audience === "influencer"
    ? [{ key: "orderNumber", label: "Order ID" }, { key: "campaignName", label: "Campaign" }, { key: "productName", label: "Product" }, { key: "grossAmount", label: "Gross Revenue" }, { key: "influencerCommission", label: "Commission Earned" }, { key: "vendorNet", label: "Vendor Net" }, { key: "orderDate", label: "Order Date" }, { key: "orderStatus", label: "Status" }]
    : [{ key: "orderNumber", label: "Order ID" }, { key: "campaignName", label: "Campaign Name" }, { key: "paymentModel", label: "Campaign Type" }, { key: "productName", label: "Product Name" }, { key: "customerName", label: "Customer" }, { key: "grossAmount", label: "Gross Amount" }, { key: "shippingFee", label: "Shipping Fee" }, { key: "platformFee", label: "Platform Fee" }, { key: "adminCommission", label: "Admin Commission" }, { key: "influencerCommission", label: "Influencer Commission" }, { key: "vendorNet", label: "Vendor Net" }, { key: "orderStatus", label: "Order Status" }, { key: "orderDate", label: "Order Date" }, { key: "paymentStatus", label: "Payment Status" }, { key: "settlementStatus", label: "Settlement Status" }];
  const visibleColumns = audience === "vendor" ? columns.filter((column) => !hiddenColumns.includes(column.key)) : columns;

  function toggleColumn(columnKey) {
    if (columnKey === "orderNumber") return;
    setHiddenColumns((current) => current.includes(columnKey)
      ? current.filter((key) => key !== columnKey)
      : [...current, columnKey]);
  }

  return (
    <div className="space-y-6">
      {audience === "vendor" ? <FinanceTabs items={vendorTabs} /> : null}
      {audience !== "influencer" ? <div>
        <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">{title}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div> : null}
      {audience === "influencer" ? (
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex min-h-14 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-950 dark:text-white">Campaign Earnings</h2>
            <button type="button" onClick={() => setRefreshKey((current) => current + 1)} disabled={state.loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              <RefreshCw className={`h-4 w-4 ${state.loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
          <div className="grid gap-3 p-4 md:grid-cols-5">
            <label className="md:col-span-2"><span className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-500"><Filter className="h-3.5 w-3.5" />Payment Model</span><select value={paymentModel} onChange={(event) => setPaymentModel(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white">{modelOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label><span className="mb-1 block text-xs font-semibold text-slate-500">Range</span><select value={range} onChange={(event) => setRange(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white">{["30d", "7d", "90d", "12m", "custom"].map((value) => <option key={value} value={value}>{value.toUpperCase()}</option>)}</select></label>
            <label><span className="mb-1 block text-xs font-semibold text-slate-500">Start</span><input type="date" value={dates.startDate} disabled={range !== "custom"} onChange={(event) => setDates((current) => ({ ...current, startDate: event.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
            <label><span className="mb-1 block text-xs font-semibold text-slate-500">End</span><input type="date" value={dates.endDate} disabled={range !== "custom"} onChange={(event) => setDates((current) => ({ ...current, endDate: event.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
          </div>
        </section>
      ) : <VendorSection title="Filters" description="Campaign finance is calculated from immutable order attribution, escrow, and commission records.">
        <div className="grid gap-3 md:grid-cols-4">
          <select value={paymentModel} onChange={(event) => setPaymentModel(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
            {modelOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <input type="date" value={dates.startDate} onChange={(event) => setDates((current) => ({ ...current, startDate: event.target.value }))} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
          <input type="date" value={dates.endDate} onChange={(event) => setDates((current) => ({ ...current, endDate: event.target.value }))} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
          <div className="flex gap-2"><button type="button" onClick={() => download(state.data.orders || [], "csv")} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold">CSV</button><button type="button" onClick={() => download(state.data.orders || [], "excel")} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold">Excel</button></div>
        </div>
      </VendorSection>}
      {state.error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</div> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map(([label, key, type]) => <VendorMetricCard key={key} label={label} value={displayMetric(metrics[key], type)} />)}
      </div>
      <VendorSection
        title="Campaign Orders"
        description="Only orders with campaign attribution are included. Financial values come from the order and earning snapshots."
        action={audience === "vendor" ? (
          <div className="relative">
            <button type="button" onClick={() => setColumnPickerOpen((open) => !open)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              <SlidersHorizontal className="h-4 w-4" />
              Columns
            </button>
            {columnPickerOpen ? (
              <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Visible columns</span>
                  <button type="button" onClick={() => setHiddenColumns([])} className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-300">Reset</button>
                </div>
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {columns.map((column) => {
                    const locked = column.key === "orderNumber";
                    return <label key={column.key} className={`flex items-center gap-2 text-sm ${locked ? "cursor-not-allowed opacity-60" : "cursor-pointer text-slate-700 dark:text-slate-200"}`}><input type="checkbox" checked={!hiddenColumns.includes(column.key)} disabled={locked} onChange={() => toggleColumn(column.key)} className="h-4 w-4 rounded border-slate-300" />{column.label}</label>;
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      >
        <VendorDataTable rows={orderRows} columns={visibleColumns} loading={state.loading} emptyMessage={state.loading ? "Loading campaign finance…" : "No campaign-generated orders found."} />
      </VendorSection>
    </div>
  );
}

export function VendorCampaignFinancePage() {
  return <CampaignFinancePage audience="vendor" title="Campaign Finance" description="Campaign-generated revenue, influencer costs, escrow and vendor net revenue." loader={getVendorCampaignFinance} />;
}

export function InfluencerCampaignEarningsPage() {
  return <CampaignFinancePage audience="influencer" title="Campaign Earnings" description="Fixed, commission, hybrid and free-product campaign earnings in one finance view." loader={getInfluencerCampaignEarnings} />;
}

export function AdminCampaignFinancePage() {
  return <CampaignFinancePage audience="admin" title="Campaign Finance" description="Cross-marketplace campaign revenue, escrow, platform revenue and influencer earnings." loader={getAdminCampaignFinance} />;
}
