import { createElement, useCallback, useMemo } from "react";
import { BarChart3, CreditCard, FileCheck2, Images, LineChart, Megaphone, RotateCcw, Search, Users } from "lucide-react";

const TABS = [
  ["dashboard", "Dashboard", BarChart3],
  ["discover", "Discover Influencers", Search],
  ["subscription", "Subscription", CreditCard],
  ["relationships", "My Influencers", Users],
  ["campaigns", "Campaign Management", Megaphone],
  ["media-library", "Media Library", Images],
  ["content", "Content Approvals", FileCheck2],
  ["performance", "Influencer Performance", LineChart],
  ["escrow-refunds", "Escrow Refunds", RotateCcw],
];

const CAMPAIGN_TYPES = [
  ["affiliate", "Affiliate"],
  ["sponsored", "Sponsored"],
  ["product_review", "Product Review"],
  ["ugc", "UGC"],
  ["video", "Video"],
  ["live_commerce", "Live Commerce"],
  ["brand_ambassador", "Brand Ambassador"],
  ["custom", "Custom"],
];

const TAB_IDS = new Set(TABS.map(([id]) => id));
const TAB_PATHS = {
  dashboard: "/vendor/influencer-commerce",
  discover: "/vendor/influencer-commerce/discover",
  subscription: "/vendor/influencer-commerce/subscription",
  relationships: "/vendor/influencer-commerce/relationships",
  campaigns: "/vendor/influencer-commerce/campaigns",
  "media-library": "/vendor/influencer-commerce/media-library",
  content: "/vendor/influencer-commerce/content",
  performance: "/vendor/influencer-commerce/performance",
  "escrow-refunds": "/vendor/influencer-commerce/escrow-refunds",
};

function campaignBuilderPath({ influencerId = "", productId = "" } = {}) {
  const params = new URLSearchParams();
  if (influencerId) params.set("influencerId", influencerId);
  if (productId) params.set("productId", productId);
  const search = params.toString();
  return search ? `${TAB_PATHS.campaigns}?${search}` : TAB_PATHS.campaigns;
}

const defaultFilters = {
  search: "",
  status: "",
  paymentModel: "all",
  category: "",
  campaignId: "",
  productId: "",
  influencerId: "",
  contentType: "",
  startDate: "",
  endDate: "",
  serviceType: "",
  minPrice: "",
  maxPrice: "",
  language: "",
  ratingMin: "",
  scoreMin: "",
  completionMin: "",
  sort: "trending",
  page: 1,
};

const PAYMENT_MODEL_FILTER_OPTIONS = [
  { value: "all", label: "All payment models" },
  { value: "fixed", label: "Fixed Payment model" },
  { value: "commission", label: "Commission Payment model" },
  { value: "hybrid", label: "Hybrid model" },
  { value: "free_product", label: "Free Product model" },
];

const FOUNDATION_REFRESH_TTL_MS = 60_000;
const ACTIVE_TAB_REFRESH_INTERVAL_MS = 60_000;

function numberValue(value) {
  return Number(value || 0).toLocaleString();
}

function percentValue(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function statusText(value = "") {
  return String(value || "open").replace(/_/g, " ");
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function getId(row) {
  return row?.id || row?._id || row?.productId || row?.influencerId;
}

function arrayValue(value) {
  return Array.isArray(value) ? value : [];
}

function shortText(value = "", limit = 54) {
  const text = String(value || "");
  return text.length > limit ? `${text.slice(0, limit - 3)}...` : text;
}

function servicePackages(service = {}) {
  const rows = Array.isArray(service.packages) && service.packages.length
    ? service.packages
    : [{
      packageName: service.serviceName || service.label || "Package",
      quantity: 1,
      price: service.price || 0,
      currency: service.currency || "INR",
      deliveryDays: service.deliveryDays || 0,
      revisionCount: service.revisionCount || 0,
      status: service.status || "active",
    }];
  return rows.filter((pkg) => String(pkg.status || "active") === "active");
}

function packagePrice(pkg = {}, service = {}) {
  return Number(pkg.price ?? service.price ?? 0);
}

function packageQuantity(pkg = {}) {
  return Math.max(1, Number(pkg.quantity ?? pkg.packageQuantity ?? 1) || 1);
}

function packageUnitPrice(pkg = {}, service = {}) {
  const quantity = packageQuantity(pkg);
  return quantity ? packagePrice(pkg, service) / quantity : packagePrice(pkg, service);
}

function selectedPackageQuantity(item = {}) {
  return Math.max(1, Number(item.packageQuantity ?? item.snapshot?.package?.packageQuantity ?? 1) || 1);
}

function serviceStartingPrice(service = {}) {
  const packages = servicePackages(service);
  if (!packages.length) return Number(service.price || 0);
  return Math.min(...packages.map((pkg) => packagePrice(pkg, service)));
}

function packageKey(service = {}, pkg = {}) {
  const serviceId = String(service._id || service.id || service.serviceId || service.serviceTypeKey || "");
  const pkgId = String(pkg._id || pkg.id || pkg.packageId || pkg.packageName || "");
  return `${serviceId}:${pkgId}`;
}

function productRow(row = {}) {
  const source = row && typeof row === "object" ? row : {};
  return source.product || source;
}

function productRowId(row = {}) {
  const source = row && typeof row === "object" ? row : {};
  const product = productRow(source);
  return String(source.id || source.productId || product.id || product._id || product.productId || "");
}

function influencerRowId(row = {}) {
  const source = row && typeof row === "object" ? row : {};
  return String(source.influencerId || source.influencer?._id || source.influencer?.id || source.profileId || source.creatorId || source.id || source._id || "");
}

function influencerRowName(row = {}) {
  const source = row && typeof row === "object" ? row : {};
  return source.name || source.displayName || source.influencer?.displayName || source.influencer?.userId?.name || "Creator";
}

function influencerRowUsername(row = {}) {
  const source = row && typeof row === "object" ? row : {};
  return source.username || source.influencer?.userId?.username || source.influencer?.influencerCode || "";
}

function influencerRateCard(row = {}) {
  const source = row && typeof row === "object" ? row : {};
  return Array.isArray(source.rateCard)
    ? source.rateCard
    : Array.isArray(source.services)
      ? source.services
      : Array.isArray(source.influencer?.rateCard)
        ? source.influencer.rateCard
        : [];
}

function normalizeInfluencerOption(row = {}) {
  if (!row || typeof row !== "object") return null;
  const influencerId = influencerRowId(row);
  if (!influencerId) return null;
  const rateCard = influencerRateCard(row);
  return {
    ...row,
    id: row.id || influencerId,
    influencerId,
    name: influencerRowName(row),
    username: influencerRowUsername(row),
    rateCard,
    services: Array.isArray(row.services) && row.services.length ? row.services : rateCard,
  };
}

function mergeInfluencerOptions(rows = []) {
  const map = new Map();
  rows.forEach((row) => {
    const normalized = normalizeInfluencerOption(row);
    if (!normalized) return;
    const current = map.get(normalized.influencerId) || {};
    map.set(normalized.influencerId, {
      ...current,
      ...normalized,
      rateCard: normalized.rateCard?.length ? normalized.rateCard : current.rateCard,
      services: normalized.services?.length ? normalized.services : current.services,
    });
  });
  return [...map.values()];
}

function configKey(row = {}) {
  if (typeof row === "string") return row.trim().toLowerCase();
  return String(row.key || row.slug || row.fieldName || "").trim().toLowerCase();
}

function configLabel(row = {}) {
  if (typeof row === "string") return row;
  return row.label || row.name || row.field?.label || row.fieldName || row.key || row.slug || "";
}

function normalizePaymentConfig(row = {}) {
  const key = configKey(row);
  return { ...row, key, slug: key, label: configLabel(row), name: configLabel(row), displayOrder: Number(row.displayOrder || 0) };
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

function FieldLabel({ children }) {
  return (
    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {children}
    </span>
  );
}

function Filters({ filters, setFilters, campaigns = [], products = [], configuration = {}, tab = "", includeSearch = true }) {
  const updateFilter = useCallback((key, value) => {
    setFilters((current) => ({ ...current, [key]: value, page: 1 }));
  }, [setFilters]);
  const serviceTypes = configuration.serviceTypes || [];
  const languages = configuration.languageOptions || [];
  const categories = useMemo(() => {
    const values = new Set();
    (configuration.categoryOptions || []).forEach((category) => {
      if (category.label) values.add(category.label);
      if (category.key) values.add(category.key);
    });
    campaigns.forEach((campaign) => {
      if (campaign.category) values.add(campaign.category);
    });
    products.forEach((row) => {
      const product = row.product || row;
      if (product.category) values.add(product.category);
    });
    return [...values].filter(Boolean).sort((a, b) => String(a).localeCompare(String(b)));
  }, [campaigns, configuration.categoryOptions, products]);
  const discoverFilters = tab === "discover";
  const mediaFilters = tab === "media-library";

  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-2 xl:grid-cols-6">
      {includeSearch ? (
        <label className="block space-y-1.5 md:col-span-2">
          <FieldLabel>Search</FieldLabel>
          <span className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder="Search creators, campaigns, products"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              aria-label="Search influencer commerce"
            />
          </span>
        </label>
      ) : null}
      <label className="block space-y-1.5">
        <FieldLabel>Status</FieldLabel>
        <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" aria-label="Status filter">
          <option value="">All statuses</option>
          {mediaFilters ? (
            <>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
              <option value="pending">Pending approval</option>
              <option value="rejected">Rejected</option>
              <option value="archived">Archived</option>
              <option value="draft">Draft</option>
            </>
          ) : (
            <>
              <option value="active">Active</option>
              <option value="approved">Approved</option>
              <option value="pending_review">Pending review</option>
              <option value="uploaded">Uploaded</option>
              <option value="draft">Draft</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="paused">Paused</option>
              <option value="rejected">Rejected</option>
            </>
          )}
        </select>
      </label>
      {mediaFilters ? (
        <label className="block space-y-1.5">
          <FieldLabel>Content Type</FieldLabel>
          <select value={filters.contentType || ""} onChange={(event) => updateFilter("contentType", event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" aria-label="Content type filter">
            <option value="">All content</option>
            <option value="REEL">Reels</option>
            <option value="POST">Posts</option>
          </select>
        </label>
      ) : null}
      <label className="block space-y-1.5">
        <FieldLabel>Payment Model</FieldLabel>
        <select value={filters.paymentModel || "all"} onChange={(event) => updateFilter("paymentModel", event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" aria-label="Payment model filter">
          {PAYMENT_MODEL_FILTER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label className="block space-y-1.5">
        <FieldLabel>Campaign</FieldLabel>
        <select value={filters.campaignId} onChange={(event) => updateFilter("campaignId", event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" aria-label="Campaign filter">
          <option value="">All campaigns</option>
          {campaigns.map((campaign) => <option key={getId(campaign)} value={getId(campaign)}>{campaign.title || "Campaign"}</option>)}
        </select>
      </label>
      <label className="block space-y-1.5">
        <FieldLabel>Product</FieldLabel>
        <select value={filters.productId} onChange={(event) => updateFilter("productId", event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" aria-label="Product filter">
          <option value="">All products</option>
          {products.map((row) => {
            const product = row.product || row;
            const id = productRowId(row);
            return <option key={id} value={id}>{shortText(product.name, 72)}</option>;
          })}
        </select>
      </label>
      <label className="block space-y-1.5">
        <FieldLabel>Category</FieldLabel>
        <select value={filters.category} onChange={(event) => updateFilter("category", event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" aria-label="Category filter">
          <option value="">All categories</option>
          {categories.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
      </label>
      {discoverFilters ? (
        <>
          <label className="block space-y-1.5">
            <FieldLabel>Service</FieldLabel>
            <select value={filters.serviceType || ""} onChange={(event) => updateFilter("serviceType", event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" aria-label="Service type filter">
              <option value="">All services</option>
              {serviceTypes.map((type) => <option key={type.key} value={type.key}>{type.label}</option>)}
            </select>
          </label>
          <label className="block space-y-1.5">
            <FieldLabel>Min Price</FieldLabel>
            <input type="number" min="0" value={filters.minPrice || ""} onChange={(event) => updateFilter("minPrice", event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" aria-label="Minimum package price" />
          </label>
          <label className="block space-y-1.5">
            <FieldLabel>Max Price</FieldLabel>
            <input type="number" min="0" value={filters.maxPrice || ""} onChange={(event) => updateFilter("maxPrice", event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" aria-label="Maximum package price" />
          </label>
          <label className="block space-y-1.5">
            <FieldLabel>Language</FieldLabel>
            <select value={filters.language || ""} onChange={(event) => updateFilter("language", event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" aria-label="Language filter">
              <option value="">Any language</option>
              {languages.map((language) => <option key={language.key || language.label} value={language.key || language.label}>{language.label || language.key}</option>)}
            </select>
          </label>
          <label className="block space-y-1.5">
            <FieldLabel>Min Rating</FieldLabel>
            <input type="number" min="0" max="5" value={filters.ratingMin || ""} onChange={(event) => updateFilter("ratingMin", event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" aria-label="Minimum rating" />
          </label>
          <label className="block space-y-1.5">
            <FieldLabel>Min Score</FieldLabel>
            <input type="number" min="0" max="100" value={filters.scoreMin || ""} onChange={(event) => updateFilter("scoreMin", event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" aria-label="Minimum score" />
          </label>
          <label className="block space-y-1.5">
            <FieldLabel>Completion</FieldLabel>
            <input type="number" min="0" max="100" value={filters.completionMin || ""} onChange={(event) => updateFilter("completionMin", event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" aria-label="Minimum completion rate" />
          </label>
        </>
      ) : null}
      <label className="block space-y-1.5">
        <FieldLabel>Start Date</FieldLabel>
        <input type="date" value={filters.startDate} onChange={(event) => updateFilter("startDate", event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" aria-label="Start date" />
      </label>
      <label className="block space-y-1.5">
        <FieldLabel>End Date</FieldLabel>
        <input type="date" value={filters.endDate} onChange={(event) => updateFilter("endDate", event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" aria-label="End date" />
      </label>
    </div>
  );
}

function SimpleBars({ rows = [], valueKey = "revenue", labelKey = "date" }) {
  const max = Math.max(...rows.map((row) => Number(row[valueKey] || 0)), 1);
  return (
    <div className="flex h-52 items-end gap-2 overflow-x-auto rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
      {rows.map((row) => (
        <div key={row[labelKey]} className="flex min-w-8 flex-1 flex-col items-center gap-2">
          <div className="w-full rounded-t-lg bg-indigo-500" style={{ height: `${Math.max(6, (Number(row[valueKey] || 0) / max) * 170)}px` }} />
          <span className="max-w-16 truncate text-[10px] text-slate-500 dark:text-slate-400">{String(row[labelKey]).slice(5)}</span>
        </div>
      ))}
    </div>
  );
}
function Pagination({ pagination, onPage }) {
  if (!pagination || Number(pagination.pages || 1) <= 1) return null;
  const page = Number(pagination.page || 1);
  const pages = Number(pagination.pages || 1);
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
      <span>{numberValue(pagination.total)} creators</span>
      <div className="flex items-center gap-2">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700">Previous</button>
        <span>Page {page} of {pages}</span>
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700">Next</button>
      </div>
    </div>
  );
}

function MetricTile({ label, value }) {
  return <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-950"><span className="block text-slate-500">{label}</span><b className="text-slate-950 dark:text-white">{value}</b></div>;
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function VendorFinanceMetric({ label, value, hint, icon: Icon = CreditCard }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{value}</p>
          {hint ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
        </div>
        <div className="rounded-2xl bg-slate-950 p-3 text-white dark:bg-white dark:text-slate-950">
          {createElement(Icon, { className: "h-5 w-5" })}
        </div>
      </div>
    </div>
  );
}

function ResponsiveTable({ headers, rows, renderRow }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[900px] w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <tr>{headers.map((header) => <th key={header} className="px-3 py-2">{header}</th>)}</tr>
        </thead>
        <tbody className="text-slate-700 dark:text-slate-200">
          {rows.map(renderRow)}
          {!rows.length ? <tr><td className="px-3 py-8 text-center text-slate-500" colSpan={headers.length}>No records found.</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ message }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">{message}</div>;
}

export {
  TABS,
  CAMPAIGN_TYPES,
  TAB_IDS,
  TAB_PATHS,
  defaultFilters,
  FOUNDATION_REFRESH_TTL_MS,
  ACTIVE_TAB_REFRESH_INTERVAL_MS,
  campaignBuilderPath,
  numberValue,
  percentValue,
  statusText,
  clampPercent,
  loadRazorpayScript,
  
  arrayValue,
  shortText,
  servicePackages,
  packagePrice,
  packageQuantity,
  packageUnitPrice,
  selectedPackageQuantity,
  serviceStartingPrice,
  packageKey,
  
  productRowId,
  influencerRowId,
  influencerRowName,
  influencerRowUsername,
  
  normalizeInfluencerOption,
  mergeInfluencerOptions,
  configKey,
  configLabel,
  normalizePaymentConfig,
  
  Section,
  Metric,
  StatusBadge,
  FieldLabel,
  Filters,
  SimpleBars,
  Pagination,
  MetricTile,
  formatDateTime,
  VendorFinanceMetric,
  ResponsiveTable,
  EmptyState,
};
