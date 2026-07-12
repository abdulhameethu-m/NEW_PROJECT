import { createElement, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { BarChart3, Download, FileVideo, RefreshCw, Search, Trash2, Upload, Video, X } from "lucide-react";
import { confirmAction } from "../../services/notificationService";
import {
  checkAndCompleteCampaign,
  deleteInfluencerContent,
  getInfluencerContentStatistics,
  getInfluencerMediaLibrary,
  listInfluencerContent,
  updateInfluencerContent,
  uploadInfluencerContentMedia,
  uploadReel,
} from "../../services/influencerCommerceService";
import { formatCurrency } from "../../utils/formatCurrency";
import { resolveApiAssetUrl } from "../../utils/resolveUrl";

const CONTENT_TABS = new Set(["upload", "media", "scheduled"]);

const initialForm = {
  title: "",
  description: "",
  caption: "",
  videoUrl: "",
  thumbnailUrl: "",
  imageUrls: [],
  contentType: "POST",
  category: "",
  tags: "",
  language: "en",
  visibility: "draft",
  scheduledAt: "",
  productIds: "",
  campaignId: "",
  deliverableId: "",
};

function normalizeContentTab(value = "") {
  return CONTENT_TABS.has(value) ? value : "upload";
}

function Card({ title, icon: Icon = Video, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex min-h-14 items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        {createElement(Icon, { className: "h-4 w-4 text-indigo-500" })}
        <h2 className="text-sm font-semibold text-slate-950 dark:text-white">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function EmptyState({ label = "No content found." }) {
  return (
    <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
      {label}
    </div>
  );
}

function titleCase(value = "") {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeUploadContentType(value = "", fallback = "POST") {
  const type = String(value || "").trim().toUpperCase();
  if (type === "POST" || type === "REEL") return type;
  const safeFallback = String(fallback || "").trim().toUpperCase();
  return safeFallback === "REEL" ? "REEL" : "POST";
}

function toDatetimeLocalValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleString();
}

const paymentBadgeStyles = {
  fixed: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800",
  commission: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-800",
  hybrid: "bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-950/40 dark:text-purple-200 dark:ring-purple-800",
  free_product: "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-200 dark:ring-orange-800",
};

function Badge({ children, tone = "slate" }) {
  const styles = {
    slate: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800",
    indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-200 dark:ring-indigo-800",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${styles[tone] || styles.slate}`}>{children}</span>;
}

function ContentCard({ item, onAction, busy = false }) {
  const metrics = item.metrics || {};
  const status = item.visibility || item.state || "draft";
  const publicType = String(item.contentType || "").toUpperCase();
  const imageSrc = resolveApiAssetUrl(item.imageUrls?.[0] || item.thumbnailUrl || item.videoUrl);
  const videoSrc = resolveApiAssetUrl(item.videoUrl);
  const posterSrc = resolveApiAssetUrl(item.thumbnailUrl);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="h-44 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
        {publicType === "POST" && imageSrc ? (
          <img src={imageSrc} alt={item.title || "Post media"} className="h-full w-full object-cover" />
        ) : item.videoUrl ? (
          <video key={videoSrc} poster={posterSrc} className="h-full w-full object-cover" controls playsInline preload="metadata">
            <source src={videoSrc} type="video/mp4" />
          </video>
        ) : null}
      </div>
      <h3 className="mt-3 line-clamp-2 text-sm font-semibold text-slate-950 dark:text-white">{item.title || item.caption || "Untitled content"}</h3>
      <p className="mt-1 text-xs capitalize text-slate-500">{String(item.contentType || "video").replace(/_/g, " ")} - {status}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <Metric label="Views" value={metrics.views || 0} />
        <Metric label="Clicks" value={metrics.clicks || 0} />
        <Metric label="Revenue" value={formatCurrency(metrics.revenue || 0)} />
      </div>
      <div className="mt-3 flex gap-2">
        <button disabled={busy || status === "published"} onClick={() => onAction(item, "publish")} className="flex-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600">
          Publish
        </button>
        <button disabled={busy || status === "archived"} onClick={() => onAction(item, "archive")} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-white">
          Archive
        </button>
        <button disabled={busy} onClick={() => onAction(item, "delete")} className="inline-flex items-center gap-1 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900/60 dark:text-rose-300" aria-label="Delete content">
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>
    </article>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-950">
      <span className="block text-slate-500">{label}</span>
      <b className="dark:text-white">{value}</b>
    </div>
  );
}

function MediaAssetCard({ asset, onDelete, onStatistics, busy = false }) {
  const mediaUrl = resolveApiAssetUrl(asset.url);
  const previewUrl = resolveApiAssetUrl(asset.preview);
  const paymentModel = String(asset.paymentModel || "").toLowerCase();
  const publicType = String(asset.contentType || asset.type || "").toUpperCase();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="h-36 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
        {publicType === "POST" && (previewUrl || mediaUrl) ? (
          <img src={previewUrl || mediaUrl} alt={asset.name || "Post media"} className="h-full w-full object-cover" />
        ) : asset.url ? (
          <video key={mediaUrl} poster={previewUrl} className="h-full w-full object-cover" controls playsInline preload="metadata">
            <source src={mediaUrl} type="video/mp4" />
          </video>
        ) : null}
      </div>
      <div className="mt-3 space-y-2">
        <p className="truncate text-sm font-semibold dark:text-white">{asset.name}</p>
        <div className="flex flex-wrap gap-1.5">
          <Badge>{titleCase(asset.contentType || asset.type || "video")}</Badge>
          <Badge tone={String(asset.publishStatus || "").toLowerCase() === "published" ? "green" : "slate"}>{titleCase(asset.publishStatus || "Draft")}</Badge>
          {asset.campaignBadge ? <Badge tone="indigo">{asset.campaignBadge}</Badge> : <Badge>No Campaign</Badge>}
          {paymentModel ? (
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${paymentBadgeStyles[paymentModel] || paymentBadgeStyles.commission}`}>
              {titleCase(paymentModel)}
            </span>
          ) : (
            <Badge>Payment N/A</Badge>
          )}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <button disabled={busy} onClick={() => onStatistics(asset)} className="inline-flex items-center justify-center gap-1 rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
          <BarChart3 className="h-3.5 w-3.5" />
          Statistics
        </button>
        <button disabled={busy} onClick={() => onDelete(asset)} className="inline-flex items-center justify-center gap-1 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900/60 dark:text-rose-300" aria-label="Delete media">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function StatTile({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-slate-950 dark:text-white">{value ?? "—"}</p>
    </div>
  );
}

function AnalyticsSection({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-sm font-bold text-slate-950 dark:text-white">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function StatGrid({ rows = [], currency = false }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map(([label, value]) => (
        <StatTile key={label} label={label} value={currency && typeof value === "number" ? formatCurrency(value) : value} />
      ))}
    </div>
  );
}

function MiniChart({ title, data = [] }) {
  const points = data.slice(-12);
  const max = Math.max(1, ...points.map((item) => Number(item.value || 0)));
  return (
    <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950">
      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{title}</p>
      <div className="mt-3 flex h-24 items-end gap-1">
        {points.length ? points.map((item, index) => (
          <div key={`${item.date || index}-${index}`} title={`${item.date || ""}: ${item.value || 0}`} className="flex flex-1 items-end">
            <div className="w-full rounded-t-lg bg-indigo-500/80" style={{ height: `${Math.max(6, (Number(item.value || 0) / max) * 100)}%` }} />
          </div>
        )) : <p className="text-xs text-slate-500">No chart data yet.</p>}
      </div>
    </div>
  );
}

function SimpleTable({ columns = [], rows = [], empty = "No rows yet." }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-950">
          <tr>{columns.map((column) => <th key={column.key} className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">{column.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.length ? rows.map((row, index) => (
            <tr key={row.id || row.orderId || index}>
              {columns.map((column) => <td key={column.key} className="whitespace-nowrap px-3 py-2 text-slate-700 dark:text-slate-200">{column.render ? column.render(row[column.key], row) : row[column.key] ?? "—"}</td>)}
            </tr>
          )) : (
            <tr><td colSpan={columns.length} className="px-3 py-6 text-center text-xs font-semibold text-slate-500">{empty}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function StatisticsDrawer({ open, asset, data, loading, error, onClose, onRefresh }) {
  if (!open) return null;
  const paymentModel = data?.payment?.model || asset?.paymentModel || "";
  const showFixed = paymentModel === "fixed" || paymentModel === "hybrid";
  const showCommission = paymentModel === "commission" || paymentModel === "hybrid";
  const showHybrid = paymentModel === "hybrid";
  const showFreeProduct = paymentModel === "free_product";
  const orderColumns = [
    { key: "orderId", label: "Order ID" },
    { key: "customer", label: "Customer" },
    { key: "product", label: "Product" },
    { key: "orderAmount", label: "Order Amount", render: (value) => formatCurrency(value || 0) },
    { key: "commissionPercent", label: "Commission %" },
    { key: "commissionEarned", label: "Commission", render: (value) => formatCurrency(value || 0) },
    { key: "orderStatus", label: "Status" },
  ];
  const productColumns = [
    { key: "name", label: "Product" },
    { key: "unitsSold", label: "Units" },
    { key: "revenue", label: "Revenue", render: (value) => formatCurrency(value || 0) },
    { key: "clicks", label: "Clicks" },
    { key: "conversion", label: "Conversion %" },
  ];

  function downloadBlob(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function exportReport(format) {
    if (!data) return;
    const baseName = `content-statistics-${data.content?.contentId || "report"}`;
    if (format === "pdf") {
      window.print();
      return;
    }
    if (format === "excel") {
      const rows = [
        ["Section", "Metric", "Value"],
        ...Object.entries(data.performance || {}).map(([key, value]) => ["Performance", titleCase(key), value]),
        ...Object.entries(data.conversion || {}).map(([key, value]) => ["Conversion", titleCase(key), value]),
        ...Object.entries(data.revenueBreakdown || {}).map(([key, value]) => ["Revenue", titleCase(key), value]),
        ...Object.entries(data.fixedPayment || {}).map(([key, value]) => ["Fixed Payment", titleCase(key), value]),
        ...Object.entries(data.commission || {}).filter(([, value]) => !Array.isArray(value)).map(([key, value]) => ["Commission", titleCase(key), value]),
      ];
      downloadBlob(
        `${baseName}.csv`,
        rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n"),
        "text/csv;charset=utf-8"
      );
      return;
    }
    downloadBlob(`${baseName}.json`, JSON.stringify(data, null, 2), "application/json;charset=utf-8");
  }

  return (
    <div className="fixed inset-0 z-50">
      <button className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" aria-label="Close statistics" onClick={onClose} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-6xl flex-col bg-slate-100 shadow-2xl dark:bg-slate-950">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-500">Content Performance & Earnings</p>
            <h2 className="text-lg font-black text-slate-950 dark:text-white">{data?.content?.title || asset?.name || "Statistics"}</h2>
          </div>
          <div className="flex gap-2">
            <button onClick={onRefresh} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold dark:border-slate-700 dark:text-white">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button onClick={onClose} className="rounded-xl border border-slate-200 p-2 dark:border-slate-700 dark:text-white" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading ? <EmptyState label="Loading content statistics..." /> : error ? <EmptyState label={error} /> : data ? (
            <div className="space-y-4">
              <AnalyticsSection title="1. Content Information">
                <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
                  <div className="overflow-hidden rounded-2xl bg-slate-200 dark:bg-slate-800">
                    {data.content?.thumbnailUrl ? <img src={resolveApiAssetUrl(data.content.thumbnailUrl)} alt="" className="h-44 w-full object-cover" /> : null}
                  </div>
                  <StatGrid rows={[
                    ["Content Type", titleCase(data.content?.contentType)],
                    ["Content ID", data.content?.contentId],
                    ["Campaign Name", data.content?.campaignName || "No campaign"],
                    ["Campaign ID", data.content?.campaignId || "—"],
                    ["Vendor", data.content?.vendor || "—"],
                    ["Brand", data.content?.brand || "—"],
                    ["Product", data.content?.product || "—"],
                    ["Category", data.content?.category || "—"],
                    ["Published Date", formatDate(data.content?.publishedDate)],
                    ["Approved Date", formatDate(data.content?.approvedDate)],
                    ["Created Date", formatDate(data.content?.createdDate)],
                    ["Campaign Status", titleCase(data.content?.campaignStatus || data.content?.publishStatus)],
                  ]} />
                </div>
              </AnalyticsSection>

              <AnalyticsSection title="2. Payment Model">
                <span className={`inline-flex rounded-full px-3 py-1.5 text-sm font-black ring-1 ${paymentBadgeStyles[paymentModel] || paymentBadgeStyles.commission}`}>
                  {data.payment?.label || titleCase(paymentModel || "Unknown")}
                </span>
              </AnalyticsSection>

              {showFixed ? <AnalyticsSection title="3. Fixed Payment">
                <StatGrid currency rows={[
                  ["Campaign Budget", data.fixedPayment?.campaignBudget],
                  ["Escrow Amount", data.fixedPayment?.escrowAmount],
                  ["Released Amount", data.fixedPayment?.releasedAmount],
                  ["Pending Release", data.fixedPayment?.pendingRelease],
                  ["Influencer Wallet Credit", data.fixedPayment?.influencerWalletCredit],
                  ["Deliverables", data.fixedPayment?.deliverables],
                  ["Approved Deliverables", data.fixedPayment?.approvedDeliverables],
                  ["Rejected Deliverables", data.fixedPayment?.rejectedDeliverables],
                  ["Release Date", formatDate(data.fixedPayment?.releaseDate)],
                  ["Wallet Credited", data.fixedPayment?.walletCredited ? "Yes" : "No"],
                  ["Invoice", data.fixedPayment?.invoice || "—"],
                  ["Transaction ID", data.fixedPayment?.transactionId || "—"],
                  ["Admin Approval", data.fixedPayment?.adminApproval ? "Approved" : "Pending"],
                  ["Vendor Approval", data.fixedPayment?.vendorApproval ? "Approved" : "Pending"],
                ]} />
              </AnalyticsSection> : null}

              {showCommission ? <AnalyticsSection title="4. Commission Details">
                <StatGrid currency rows={[
                  ["Commission %", data.commission?.commissionPercent],
                  ["Attributed Orders", data.commission?.attributedOrders],
                  ["Gross Revenue", data.commission?.grossRevenue],
                  ["Net Revenue", data.commission?.netRevenue],
                  ["Commission Generated", data.commission?.commissionGenerated],
                  ["Pending Commission", data.commission?.pendingCommission],
                  ["Paid Commission", data.commission?.paidCommission],
                  ["Cancelled Orders", data.commission?.cancelledOrders],
                  ["Returned Orders", data.commission?.returnedOrders],
                  ["Refunded Orders", data.commission?.refundedOrders],
                  ["Average Order Value", data.commission?.averageOrderValue],
                  ["Highest Order", data.commission?.highestOrder],
                  ["Lowest Order", data.commission?.lowestOrder],
                ]} />
                <div className="mt-4">
                  <SimpleTable columns={orderColumns} rows={data.commission?.orders || []} />
                </div>
              </AnalyticsSection> : null}

              {showHybrid ? <AnalyticsSection title="5. Hybrid Model">
                <StatGrid currency rows={[
                  ["Fixed Earnings", data.hybrid?.fixedEarnings],
                  ["Commission Earnings", data.hybrid?.commissionEarnings],
                  ["Total Earnings", data.hybrid?.totalEarnings],
                  ["Escrow Released", data.hybrid?.escrowReleased],
                  ["Commission Pending", data.hybrid?.commissionPending],
                  ["Commission Paid", data.hybrid?.commissionPaid],
                  ["Fixed Paid", data.hybrid?.fixedPaid],
                  ["Hybrid Total", data.hybrid?.hybridTotal],
                ]} />
              </AnalyticsSection> : null}

              {showFreeProduct ? <AnalyticsSection title="6. Free Product Model">
                <StatGrid currency rows={[
                  ["Product Value", data.freeProduct?.productValue],
                  ["Sample Delivered", data.freeProduct?.sampleDelivered ? "Yes" : "No"],
                  ["Delivery Date", formatDate(data.freeProduct?.deliveryDate)],
                  ["Content Submitted", data.freeProduct?.contentSubmitted ? "Yes" : "No"],
                  ["Content Approved", data.freeProduct?.contentApproved ? "Yes" : "No"],
                  ["Publishing Status", titleCase(data.freeProduct?.publishingStatus)],
                  ["No Monetary Earnings", data.freeProduct?.noMonetaryEarnings ? "Yes" : "No"],
                  ["Campaign Completed", data.freeProduct?.campaignCompleted ? "Yes" : "No"],
                ]} />
              </AnalyticsSection> : null}

              <AnalyticsSection title="7. Performance Analytics">
                <StatGrid rows={Object.entries(data.performance || {}).map(([key, value]) => [titleCase(key), typeof value === "number" ? value.toLocaleString() : value])} />
              </AnalyticsSection>

              <AnalyticsSection title="8. Conversion Analytics">
                <StatGrid currency rows={Object.entries(data.conversion || {}).map(([key, value]) => [titleCase(key), value])} />
              </AnalyticsSection>

              <AnalyticsSection title="9. Follower Analytics">
                <StatGrid rows={[
                  ["Followers Before Publish", data.followers?.beforePublish],
                  ["Followers After Publish", data.followers?.afterPublish],
                  ["Followers Gained", data.followers?.gained],
                  ["Followers Lost", data.followers?.lost],
                  ["Net Growth", data.followers?.netGrowth],
                  ["Growth %", data.followers?.growthPercent],
                ]} />
                <div className="mt-4"><MiniChart title="Follower Growth Graph" data={data.followers?.graph || []} /></div>
              </AnalyticsSection>

              <AnalyticsSection title="10. Revenue Breakdown">
                <StatGrid currency rows={Object.entries(data.revenueBreakdown || {}).map(([key, value]) => [titleCase(key), value])} />
              </AnalyticsSection>

              <AnalyticsSection title="11. Product Performance">
                <StatGrid currency rows={[
                  ["Products Tagged", data.productPerformance?.productsTagged],
                  ["Top Selling Product", data.productPerformance?.topSellingProduct?.name || "—"],
                  ["Units Sold", data.productPerformance?.unitsSold],
                ]} />
                <div className="mt-4"><SimpleTable columns={productColumns} rows={data.productPerformance?.products || []} /></div>
              </AnalyticsSection>

              <AnalyticsSection title="12. Attribution">
                <StatGrid rows={[
                  ["Affiliate Link Generated", data.attribution?.affiliateLinkGenerated ? "Yes" : "No"],
                  ["Affiliate Link", data.attribution?.affiliateLink || "—"],
                  ["Link Created Date", formatDate(data.attribution?.linkCreatedDate)],
                  ["Attribution Window", `${data.attribution?.attributionWindow || 0} days`],
                  ["Attributed Orders", data.attribution?.attributedOrders],
                  ["Expired Attribution", data.attribution?.expiredAttribution],
                  ["Last Click", formatDate(data.attribution?.lastClick)],
                  ["Last Purchase", formatDate(data.attribution?.lastPurchase)],
                ]} />
              </AnalyticsSection>

              <AnalyticsSection title="13. Campaign Status">
                <StatGrid rows={Object.entries(data.campaignStatus || {}).map(([key, value]) => [titleCase(key), value ? "Yes" : "No"])} />
              </AnalyticsSection>

              <AnalyticsSection title="14. Timeline">
                <div className="space-y-2">
                  {(data.timeline || []).map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-950">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{item.label}</span>
                      <span className={item.complete ? "text-emerald-600" : "text-slate-400"}>{item.complete ? formatDate(item.at) : "Pending"}</span>
                    </div>
                  ))}
                </div>
              </AnalyticsSection>

              <AnalyticsSection title="15. Documents">
                <StatGrid rows={[
                  ["Invoices", data.documents?.invoices?.length || 0],
                  ["Escrow Receipt", data.documents?.escrowReceipt || "—"],
                  ["Commission Statement", data.documents?.commissionStatement || "—"],
                  ["Wallet Ledger", data.documents?.walletLedger?.length || 0],
                  ["Payment History", data.documents?.paymentHistory?.length || 0],
                  ["Campaign Agreement", data.documents?.campaignAgreement || "—"],
                ]} />
              </AnalyticsSection>

              <AnalyticsSection title="16. Export">
                <div className="flex flex-wrap gap-2">
                  {[
                    ["Export PDF", "pdf"],
                    ["Export Excel", "excel"],
                    ["Download Report", "json"],
                  ].map(([label, format]) => (
                    <button key={label} onClick={() => exportReport(format)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">
                      <Download className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </AnalyticsSection>

              <AnalyticsSection title="17. Filters">
                <StatGrid rows={Object.entries(data.filters || {}).map(([key, value]) => [titleCase(key), value || "All"])} />
              </AnalyticsSection>

              <AnalyticsSection title="18. Charts">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <MiniChart title="Revenue Trend" data={data.charts?.revenueTrend || []} />
                  <MiniChart title="Follower Growth" data={data.charts?.followerGrowth || []} />
                  <MiniChart title="Orders" data={data.charts?.orders || []} />
                  <MiniChart title="Clicks" data={data.charts?.clicks || []} />
                  <MiniChart title="Conversion" data={data.charts?.conversion || []} />
                  <MiniChart title="Commission" data={data.charts?.commission || []} />
                  <MiniChart title="Views" data={data.charts?.views || []} />
                </div>
              </AnalyticsSection>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

export default function InfluencerContentCenterPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [tab, setTab] = useState(normalizeContentTab(searchParams.get("tab")));
  const [items, setItems] = useState([]);
  const [media, setMedia] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [filters, setFilters] = useState({ search: "", page: 1, limit: 12 });
  const [loading, setLoading] = useState(true);
  const [uploadingField, setUploadingField] = useState("");
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState("");
  const [statisticsAsset, setStatisticsAsset] = useState(null);
  const [statisticsData, setStatisticsData] = useState(null);
  const [statisticsLoading, setStatisticsLoading] = useState(false);
  const [statisticsError, setStatisticsError] = useState("");
  const normalizedFormContentType = normalizeUploadContentType(form.contentType);
  const isPostContent = normalizedFormContentType === "POST";
  const hasPublishableMedia = isPostContent
    ? Boolean(form.thumbnailUrl || form.videoUrl || form.imageUrls?.length)
    : Boolean(form.videoUrl);

  const query = useMemo(() => {
    const next = { ...filters };
    if (tab === "scheduled") next.scheduled = "true";
    return next;
  }, [filters, tab]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "media") {
        const response = await getInfluencerMediaLibrary(query);
        setMedia(response?.data?.items || []);
      } else {
        const response = await listInfluencerContent(query);
        setItems(response?.data?.items || []);
      }
    } finally {
      setLoading(false);
    }
  }, [query, tab]);

  useEffect(() => {
    setTab(normalizeContentTab(searchParams.get("tab")));
  }, [searchParams]);

  useEffect(() => {
    const campaignId = searchParams.get("campaignId") || "";
    const productIds = searchParams.get("productIds") || "";
    if (!campaignId && !productIds) return;
    setForm((current) => ({
      ...current,
      campaignId: campaignId || current.campaignId,
      productIds: productIds || current.productIds,
    }));
  }, [searchParams]);

  useEffect(() => {
    if (!location.state) return;
    const publishData = location.state;
    setForm((current) => ({
      ...current,
      campaignId: publishData.campaignId || current.campaignId,
      deliverableId: publishData.deliverableId || current.deliverableId,
      videoUrl: publishData.videoUrl || current.videoUrl,
      thumbnailUrl: publishData.thumbnailUrl || current.thumbnailUrl,
      imageUrls: publishData.imageUrls || current.imageUrls,
      title: publishData.title || current.title,
      description: publishData.description || current.description,
      caption: publishData.caption || current.caption,
      visibility: publishData.visibility || current.visibility,
      scheduledAt: toDatetimeLocalValue(publishData.scheduledAt || current.scheduledAt),
      contentType: normalizeUploadContentType(publishData.contentType || current.contentType, current.contentType),
    }));
    window.history.replaceState({}, document.title);
  }, [location.state]);

  useEffect(() => {
    load();
  }, [load]);

  async function submitContent(overrides = {}) {
    setNotice("");
    const nextForm = { ...form, ...overrides };
    nextForm.contentType = normalizeUploadContentType(nextForm.contentType);
    const nextIsPostContent = nextForm.contentType === "POST";
    const postImageUrl = nextForm.thumbnailUrl || nextForm.imageUrls?.[0] || nextForm.videoUrl;
    if (nextIsPostContent && !postImageUrl) {
      setNotice("POST content must contain a picture.");
      return;
    }
    if (!nextIsPostContent && !nextForm.videoUrl) {
      setNotice("REEL content must contain a video.");
      return;
    }
    const payload = {
      ...nextForm,
      contentType: nextIsPostContent ? "POST" : "REEL",
      videoUrl: nextIsPostContent ? postImageUrl : nextForm.videoUrl,
      thumbnailUrl: nextIsPostContent ? postImageUrl : nextForm.thumbnailUrl,
      imageUrls: nextIsPostContent ? Array.from(new Set([postImageUrl, ...(nextForm.imageUrls || [])].filter(Boolean))) : [],
      productIds: nextForm.productIds.split(",").map((item) => item.trim()).filter(Boolean),
      tags: nextForm.tags.split(",").map((item) => item.trim()).filter(Boolean),
      scheduledAt: nextForm.scheduledAt || undefined,
    };

    try {
      await uploadReel(payload);
      if (nextForm.visibility === "published" && nextForm.campaignId) {
        await checkAndCompleteCampaign(nextForm.campaignId).catch(() => null);
      }
      setNotice("Content saved.");
      setForm((current) => ({
        ...initialForm,
        campaignId: searchParams.get("campaignId") || current.campaignId,
        productIds: searchParams.get("productIds") || current.productIds,
      }));
      await load();
    } catch (error) {
      setNotice(error?.response?.data?.message || "Content could not be saved.");
    }
  }

  async function uploadMediaFile(field, file) {
    if (!file) return;
    setUploadingField(field);
    setNotice("");
    try {
      const formData = new FormData();
      formData.append(field === "thumbnailUrl" || field === "postImageUrl" ? "thumbnail" : "video", file);
      const response = await uploadInfluencerContentMedia(formData);
      const url = field === "postImageUrl" ? response?.data?.thumbnailUrl || response?.data?.imageUrls?.[0] : response?.data?.[field];
      if (url) {
        setForm((current) => field === "postImageUrl"
          ? { ...current, videoUrl: url, thumbnailUrl: url, imageUrls: Array.from(new Set([url, ...(current.imageUrls || [])])) }
          : { ...current, [field]: url }
        );
        setNotice(field === "postImageUrl" ? "Post picture uploaded." : field === "thumbnailUrl" ? "Thumbnail uploaded." : "Video uploaded.");
      } else {
        setNotice("Upload completed, but no media URL was returned.");
      }
    } catch (error) {
      setNotice(error?.response?.data?.message || "Media upload failed.");
    } finally {
      setUploadingField("");
    }
  }

  async function handleAction(item, action) {
    const id = item._id || item.id;
    if (!id) return;
    if (action === "delete" && !(await confirmAction({ message: "Delete this video?", tone: "danger", confirmLabel: "Confirm" }))) return;
    setBusyId(String(id));
    setNotice("");
    try {
      if (action === "delete") {
        await deleteInfluencerContent(id);
        setNotice("Content deleted.");
      } else {
        await updateInfluencerContent(id, { action });
        setNotice(action === "publish" ? "Content published." : "Content archived.");
      }
      await load();
    } catch (error) {
      setNotice(error?.response?.data?.message || "Action failed.");
    } finally {
      setBusyId("");
    }
  }

  async function openStatistics(asset, options = {}) {
    const id = asset?.id || asset?._id;
    if (!id) return;
    setStatisticsAsset(asset);
    setStatisticsLoading(true);
    setStatisticsError("");
    if (!options.refresh) setStatisticsData(null);
    try {
      const response = await getInfluencerContentStatistics(id, options.refresh ? { refresh: "true" } : {});
      setStatisticsData(response?.data || null);
    } catch (error) {
      setStatisticsError(error?.response?.data?.message || "Statistics could not be loaded.");
    } finally {
      setStatisticsLoading(false);
    }
  }

  function closeStatistics() {
    setStatisticsAsset(null);
    setStatisticsData(null);
    setStatisticsError("");
    setStatisticsLoading(false);
  }

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-5">
      {notice ? <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold dark:border-slate-800 dark:bg-slate-900 dark:text-white">{notice}</div> : null}

      {tab === "upload" ? (
        <Card title="Upload Content" icon={Upload}>
          <div className="space-y-6">
            <FormSection title="Content Details">
              <TextInput label={isPostContent ? "Post Title" : "Reel Title"} required value={form.title} onChange={(value) => setForm((current) => ({ ...current, title: value }))} placeholder={isPostContent ? "Enter post title" : "Enter reel title"} />
              <label className="block">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Content Type</span>
                <select value={form.contentType} onChange={(event) => setForm((current) => ({ ...current, contentType: event.target.value, videoUrl: "", thumbnailUrl: "", imageUrls: [] }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                  <option value="POST">Post / Picture</option>
                  <option value="REEL">Reel / Video</option>
                </select>
              </label>
              <TextInput label="Description" textarea className="md:col-span-2" value={form.description} onChange={(value) => setForm((current) => ({ ...current, description: value }))} placeholder={isPostContent ? "Describe your picture post" : "Describe your video content"} />
            </FormSection>

            <FormSection title="Media Files">
              {isPostContent ? (
                <MediaUpload label="Post Picture" value={form.thumbnailUrl || form.videoUrl} uploading={uploadingField === "postImageUrl"} accept="image/jpeg,image/png,image/webp,image/gif" onUpload={(file) => uploadMediaFile("postImageUrl", file)} />
              ) : (
                <>
                  <MediaUpload label="Video File" value={form.videoUrl} uploading={uploadingField === "videoUrl"} accept="video/mp4,video/webm,video/quicktime" onUpload={(file) => uploadMediaFile("videoUrl", file)} />
                  <MediaUpload label="Thumbnail Image" value={form.thumbnailUrl} uploading={uploadingField === "thumbnailUrl"} accept="image/jpeg,image/png,image/webp,image/gif" onUpload={(file) => uploadMediaFile("thumbnailUrl", file)} />
                </>
              )}
            </FormSection>

            <FormSection title="Publishing & Distribution">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Visibility Status</span>
                <select value={form.visibility} onChange={(event) => setForm((current) => ({ ...current, visibility: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="private">Private</option>
                  <option value="unlisted">Unlisted</option>
                </select>
              </label>
              <TextInput label="Schedule Date" type="datetime-local" value={form.scheduledAt} onChange={(value) => setForm((current) => ({ ...current, scheduledAt: value }))} />
            </FormSection>

            <FormSection title="Additional Information">
              <TextInput label="Category" value={form.category} onChange={(value) => setForm((current) => ({ ...current, category: value }))} placeholder="e.g., Fashion, Electronics, Food" />
              <TextInput label="Language" value={form.language} onChange={(value) => setForm((current) => ({ ...current, language: value }))} placeholder="e.g., en, hi" />
              <TextInput label="Product IDs" value={form.productIds} onChange={(value) => setForm((current) => ({ ...current, productIds: value }))} placeholder="Separate multiple IDs with commas" />
              <TextInput label="Tags" value={form.tags} onChange={(value) => setForm((current) => ({ ...current, tags: value }))} placeholder="Comma-separated keywords" />
              {form.campaignId ? <TextInput label="Campaign ID" className="md:col-span-2" readOnly value={form.campaignId} onChange={(value) => setForm((current) => ({ ...current, campaignId: value }))} /> : null}
            </FormSection>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
            <button onClick={() => submitContent()} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-600">
              {form.visibility === "scheduled" ? "Schedule Content" : "Save as Draft"}
            </button>
            {hasPublishableMedia && form.visibility !== "scheduled" ? (
              <button onClick={() => submitContent({ visibility: "published" })} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-600">
                Publish Now
              </button>
            ) : null}
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center gap-2">
              <Video className="h-4 w-4 text-indigo-500" />
              <h3 className="text-sm font-semibold text-slate-950 dark:text-white">Uploaded Content</h3>
            </div>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {loading ? <EmptyState label="Loading uploaded content..." /> : items.length ? items.map((item) => <ContentCard key={item._id} item={item} onAction={handleAction} busy={busyId === String(item._id)} />) : <EmptyState label="No uploaded content yet." />}
            </section>
          </div>
        </Card>
      ) : tab === "media" ? (
        <Card title="Media Library" icon={FileVideo}>
          <div className="grid gap-3 md:grid-cols-4">
            {media.length ? media.map((asset) => <MediaAssetCard key={asset.id} asset={asset} onStatistics={openStatistics} onDelete={(row) => handleAction(row, "delete")} busy={busyId === String(asset.id)} />) : <EmptyState label="No media assets found." />}
          </div>
        </Card>
      ) : (
        <>
          <Card title="Filters" icon={Search}>
            <input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search scheduled videos" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </Card>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {loading ? <EmptyState label="Loading scheduled content..." /> : items.length ? items.map((item) => <ContentCard key={item._id} item={item} onAction={handleAction} busy={busyId === String(item._id)} />) : <EmptyState label="No scheduled content found." />}
          </section>
        </>
      )}

      <StatisticsDrawer
        open={Boolean(statisticsAsset)}
        asset={statisticsAsset}
        data={statisticsData}
        loading={statisticsLoading}
        error={statisticsError}
        onClose={closeStatistics}
        onRefresh={() => statisticsAsset && openStatistics(statisticsAsset, { refresh: true })}
      />
    </div>
  );
}

function FormSection({ title, children }) {
  return (
    <div className="space-y-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/30">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </div>
  );
}

function TextInput({ label, value, onChange, placeholder = "", textarea = false, type = "text", className = "", readOnly = false, required = false }) {
  const Input = textarea ? "textarea" : "input";
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}{required ? " *" : ""}</span>
      <Input
        type={textarea ? undefined : type}
        rows={textarea ? 3 : undefined}
        readOnly={readOnly}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white ${readOnly ? "bg-slate-100 dark:text-slate-400" : ""}`}
      />
    </label>
  );
}

function MediaUpload({ label, value, uploading, accept, onUpload }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      <div className="mt-1 flex gap-2">
        <input value={value} readOnly placeholder="URL will appear here after upload" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400" />
        <label className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
          {uploading ? "Uploading..." : "Upload"}
          <input type="file" accept={accept} className="sr-only" disabled={uploading} onChange={(event) => { onUpload(event.target.files?.[0]); event.target.value = ""; }} />
        </label>
      </div>
    </label>
  );
}
