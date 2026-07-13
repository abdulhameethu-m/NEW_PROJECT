import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarClock, Eye, FileVideo, MousePointerClick, Package, Play, Search, TrendingUp, Users, X } from "lucide-react";
import { getVendorMediaDetails } from "../../services/influencerCommerceService";
import { resolveApiAssetUrl } from "../../utils/resolveUrl";
import { formatCurrency } from "../../utils/formatCurrency";
import { Metric, Pagination, Section, SimpleBars, StatusBadge, statusText } from "./VendorInfluencerShared";

function numberValue(value) {
  return Number(value || 0).toLocaleString();
}

function percentValue(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function dateTime(value) {
  return value ? new Date(value).toLocaleString() : "-";
}

function isVideo(url = "") {
  return /\.(mp4|webm|mov|qt)(\?|#|$)/i.test(String(url || ""));
}

function CountdownTimer({ scheduledAt, serverTime, status }) {
  const [now, setNow] = useState(() => Date.now());
  const offset = useMemo(() => {
    const server = serverTime ? new Date(serverTime).getTime() : Date.now();
    return server - Date.now();
  }, [serverTime]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!scheduledAt || status !== "scheduled") return null;
  const remaining = Math.max(0, new Date(scheduledAt).getTime() - (now + offset));
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const label = remaining <= 0 ? "Publishing" : "Publishing in";

  return (
    <div className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-200">
      <div className="mb-1 uppercase tracking-wide">{label}</div>
      <div className="grid grid-cols-4 gap-1 text-center">
        <TimePart label="Days" value={days} />
        <TimePart label="Hours" value={hours} />
        <TimePart label="Min" value={minutes} />
        <TimePart label="Sec" value={seconds} />
      </div>
    </div>
  );
}

function TimePart({ label, value }) {
  return (
    <span className="rounded-md bg-white px-1.5 py-1 dark:bg-slate-900">
      <span className="block text-sm text-slate-950 dark:text-white">{String(value).padStart(2, "0")}</span>
      <span className="block text-[10px] text-slate-500 dark:text-slate-400">{label}</span>
    </span>
  );
}

function MediaPreview({ item }) {
  const mediaUrl = resolveApiAssetUrl(item.mediaUrl);
  const previewUrl = resolveApiAssetUrl(item.previewUrl || item.mediaUrl);
  if (mediaUrl && isVideo(mediaUrl)) {
    return <video src={mediaUrl} poster={previewUrl || undefined} controls preload="metadata" className="h-44 w-full rounded-lg bg-slate-950 object-cover" />;
  }
  if (previewUrl) {
    return <img src={previewUrl} alt={item.title || "Content preview"} loading="lazy" className="h-44 w-full rounded-lg bg-slate-100 object-cover dark:bg-slate-800" />;
  }
  return (
    <div className="flex h-44 w-full items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800">
      <FileVideo className="h-8 w-8" />
    </div>
  );
}

function MediaCard({ item, serverTime, onOpen }) {
  const metrics = item.metrics || {};
  const product = item.products?.[0];
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <button type="button" onClick={() => onOpen(item)} className="block w-full text-left">
        <MediaPreview item={item} />
      </button>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-950 dark:text-white" title={item.title}>{item.title}</h3>
          <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{item.contentType} · {item.campaign?.title || "Campaign"}</p>
        </div>
        <StatusBadge value={item.status} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <Tile label="Views" value={numberValue(metrics.views)} />
        <Tile label="Clicks" value={numberValue(metrics.clicks)} />
        <Tile label="Revenue" value={formatCurrency(metrics.revenue || 0)} />
      </div>
      <div className="mt-3 grid gap-1 text-xs text-slate-500 dark:text-slate-400">
        <span className="truncate">Influencer: <b className="font-semibold text-slate-700 dark:text-slate-200">{item.influencer?.name || "-"}</b></span>
        <span className="truncate">Product: <b className="font-semibold text-slate-700 dark:text-slate-200">{product?.name || "No product tagged"}</b></span>
        <span>Uploaded: <b className="font-semibold text-slate-700 dark:text-slate-200">{dateTime(item.uploadedAt)}</b></span>
        {item.scheduledAt ? <span>Scheduled: <b className="font-semibold text-slate-700 dark:text-slate-200">{dateTime(item.scheduledAt)}</b></span> : null}
      </div>
      <div className="mt-3">
        <CountdownTimer scheduledAt={item.scheduledAt} serverTime={serverTime} status={item.status} />
      </div>
      <button type="button" onClick={() => onOpen(item)} className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
        <Eye className="h-4 w-4" />
        View Details
      </button>
    </article>
  );
}

function Tile({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-2 dark:bg-slate-950/60">
      <div className="text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 font-semibold text-slate-950 dark:text-white">{value}</div>
    </div>
  );
}

function DetailsModal({ mediaId, fallbackItem, onClose }) {
  const [state, setState] = useState({ loading: true, item: fallbackItem, error: "" });

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, item: fallbackItem, error: "" });
    getVendorMediaDetails(mediaId)
      .then((response) => {
        if (!cancelled) setState({ loading: false, item: response?.data?.item || response?.item || fallbackItem, error: "" });
      })
      .catch((err) => {
        if (!cancelled) setState({ loading: false, item: fallbackItem, error: err?.response?.data?.message || "Unable to load media details." });
      });
    return () => {
      cancelled = true;
    };
  }, [mediaId, fallbackItem]);

  const item = state.item || {};
  const metrics = item.metrics || {};
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-xl dark:bg-slate-900">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{item.title || "Media details"}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{item.campaign?.title || "Campaign"} · {item.influencer?.name || "Creator"}</p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-5 p-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <MediaPreview item={item} />
            {state.error ? <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</div> : null}
            {state.loading ? <div className="mt-3 text-sm text-slate-500">Loading details...</div> : null}
            <div className="mt-4 rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800">
              <h3 className="font-semibold text-slate-950 dark:text-white">Publishing Schedule</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Info label="Status" value={statusText(item.status)} />
                <Info label="Uploaded" value={dateTime(item.uploadedAt)} />
                <Info label="Scheduled" value={dateTime(item.scheduledAt)} />
                <Info label="Published" value={dateTime(item.publishedAt)} />
              </div>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <h3 className="font-semibold text-slate-950 dark:text-white">Statistics</h3>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <Tile label="Views" value={numberValue(metrics.views)} />
                <Tile label="Unique" value={numberValue(metrics.uniqueViews)} />
                <Tile label="Clicks" value={numberValue(metrics.clicks)} />
                <Tile label="CTR" value={percentValue(metrics.ctr)} />
                <Tile label="Orders" value={numberValue(metrics.orders)} />
                <Tile label="Revenue" value={formatCurrency(metrics.revenue || 0)} />
                <Tile label="Engagement" value={percentValue(metrics.engagement)} />
                <Tile label="Conversion" value={percentValue(metrics.conversionRate)} />
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800">
              <h3 className="font-semibold text-slate-950 dark:text-white">Campaign Details</h3>
              <div className="mt-3 grid gap-2">
                <Info label="Campaign" value={item.campaign?.title || "-"} />
                <Info label="Influencer" value={item.influencer?.name || "-"} />
                <Info label="Products" value={item.products?.map((product) => product.name).join(", ") || "-"} />
                <Info label="Payment Model" value={statusText(item.campaign?.paymentType || "-")} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-950/60">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 font-semibold text-slate-950 dark:text-white">{value}</div>
    </div>
  );
}

export default function MediaLibraryTab({ data = {}, pagination, serverTime, onPage }) {
  const [selected, setSelected] = useState(null);
  const summary = data.summary || {};
  const items = data.items || [];
  const trends = data.trends || [];
  const topContent = data.topContent || [];

  const trendBars = trends.map((row) => ({ date: row.date || "-", value: Number(row.views || 0) + Number(row.clicks || 0) + Number(row.revenue || 0) }));

  return (
    <div className="grid gap-5">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <Metric label="Total Content" value={numberValue(summary.totalContent)} icon={FileVideo} />
        <Metric label="Published" value={numberValue(summary.published)} icon={Play} />
        <Metric label="Scheduled" value={numberValue(summary.scheduled)} icon={CalendarClock} />
        <Metric label="Pending Approval" value={numberValue(summary.pending)} icon={Search} />
        <Metric label="Views" value={numberValue(summary.totalViews)} icon={Eye} />
        <Metric label="Clicks" value={numberValue(summary.totalClicks)} icon={MousePointerClick} />
        <Metric label="CTR" value={percentValue(summary.ctr)} icon={TrendingUp} />
        <Metric label="Revenue" value={formatCurrency(summary.revenue || 0)} icon={BarChart3} />
        <Metric label="Affiliate Sales" value={numberValue(summary.affiliateSales)} icon={Package} />
        <Metric label="Campaigns" value={numberValue(summary.campaignCount)} icon={FileVideo} />
        <Metric label="Influencers" value={numberValue(summary.influencerCount)} icon={Users} />
        <Metric label="Today's Uploads" value={numberValue(summary.todaysUploads)} icon={CalendarClock} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Section title="Content Performance Trend" icon={BarChart3}>
          <SimpleBars rows={trendBars} valueKey="value" labelKey="date" />
        </Section>
        <Section title="Top Content" icon={TrendingUp}>
          <div className="grid gap-2 p-3">
            {topContent.length ? topContent.map((item) => (
              <button key={item.id} type="button" onClick={() => setSelected(item)} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-slate-950 dark:text-white">{item.title}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{item.contentType} · {numberValue(item.metrics?.views)} views</span>
                </span>
                <StatusBadge value={item.status} />
              </button>
            )) : <div className="p-4 text-sm text-slate-500">No content performance yet.</div>}
          </div>
        </Section>
      </section>

      <Section title="Media Library" icon={FileVideo}>
        <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {items.length ? items.map((item) => (
            <MediaCard key={item.id} item={item} serverTime={serverTime} onOpen={setSelected} />
          )) : (
            <div className="col-span-full rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
              No media found for the current filters.
            </div>
          )}
        </div>
        <Pagination pagination={pagination} onPage={onPage} />
      </Section>

      {selected ? <DetailsModal mediaId={selected.id} fallbackItem={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}
