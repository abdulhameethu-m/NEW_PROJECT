import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock3, FileUp, LinkIcon, RefreshCw, Send, Upload, Loader2, Share2 } from "lucide-react";
import { getCampaignExecution, submitCampaignExecutionDeliverable, uploadInfluencerContentMedia } from "../../services/influencerCommerceService";
import { formatCurrency } from "../../utils/formatCurrency";

const CONTENT_TYPES = [
  ["url", "URL"],
  ["video", "Video"],
  ["image", "Image"],
  ["document", "Document"],
  ["youtube", "YouTube"],
  ["instagram", "Instagram"],
  ["facebook", "Facebook"],
  ["tiktok", "TikTok"],
];

const REEL_CONTENT_TYPES = new Set([
  "product_video",
  "review",
  "tutorial",
  "unboxing",
  "lifestyle",
  "campaign",
  "affiliate",
  "brand_collaboration",
  "short",
  "reel",
  "live",
]);

function toReelContentType(value = "") {
  const type = String(value || "").toLowerCase();
  if (REEL_CONTENT_TYPES.has(type)) return type;
  if (type === "image") return "product_video";
  return "reel";
}

function statusLabel(value = "") {
  return String(value || "pending").replace(/_/g, " ");
}

function dateLabel(value) {
  return value ? new Date(value).toLocaleDateString() : "Not set";
}

function ProgressBar({ value = 0 }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

function DeliverableCard({ campaignId, deliverable, busy, onSubmit, navigate, campaignData }) {
  const [form, setForm] = useState({ contentUrl: "", contentType: "url", notes: "" });
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const closed = ["completed", "approved", "cancelled"].includes(deliverable.status);
  const latest = deliverable.submissions?.[0] || null;
  const isApproved = ["approved", "completed"].includes(deliverable.status);

  function handlePublish() {
    const publishData = {
      campaignId: campaignId,
      videoUrl: latest?.contentUrl || "",
      title: deliverable.title || "",
      description: `Deliverable for ${campaignData?.campaign?.title || "campaign"}`,
      contentType: toReelContentType(latest?.contentType),
      campaignBudget: campaignData?.campaign?.budget || 0,
    };
    navigate("/influencer/content?tab=upload", { state: publishData });
  }

  async function handleFileUpload(file) {
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      const isVideo = file.type.startsWith("video/");
      formData.append(isVideo ? "video" : "thumbnail", file);
      const response = await uploadInfluencerContentMedia(formData);
      const uploadedUrl = response?.data?.[isVideo ? "videoUrl" : "thumbnailUrl"];
      if (uploadedUrl) {
        setForm((current) => ({
          ...current,
          contentUrl: uploadedUrl,
          contentType: isVideo ? "reel" : current.contentType,
        }));
      }
    } catch {
      setForm((current) => ({ ...current, notes: current.notes || "Upload failed. Please try again." }));
    } finally {
      setIsUploading(false);
    }
  }

  function handleDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {deliverable.completionStatus === "completed" ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Clock3 className="h-5 w-5 text-amber-500" />}
            <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{deliverable.title}</h3>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {deliverable.quantity} unit{Number(deliverable.quantity) === 1 ? "" : "s"} · Due {dateLabel(deliverable.expectedCompletionDate)}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {statusLabel(deliverable.status)}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/60">
          <p className="text-xs text-slate-500 dark:text-slate-400">Unit Price</p>
          <p className="mt-1 font-semibold text-slate-950 dark:text-white">{formatCurrency(deliverable.unitPrice || 0)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/60">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Value</p>
          <p className="mt-1 font-semibold text-slate-950 dark:text-white">{formatCurrency(deliverable.totalPrice || 0)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/60">
          <p className="text-xs text-slate-500 dark:text-slate-400">Payment</p>
          <p className="mt-1 font-semibold capitalize text-slate-950 dark:text-white">{statusLabel(deliverable.paymentEligibility)}</p>
        </div>
      </div>

      {latest ? (
        <div className="mt-4 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
          <p className="font-semibold text-slate-900 dark:text-white">Latest submission v{latest.version}</p>
          <a href={latest.contentUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex max-w-full items-center gap-2 truncate text-indigo-600 dark:text-indigo-300">
            <LinkIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">{latest.contentUrl}</span>
          </a>
          <p className="mt-1 capitalize text-slate-500 dark:text-slate-400">{statusLabel(latest.status)} · {new Date(latest.submittedAt).toLocaleString()}</p>
        </div>
      ) : null}

      {!closed ? (
        <div className="mt-4 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
            <select
              value={form.contentType}
              onChange={(event) => setForm((current) => ({ ...current, contentType: event.target.value }))}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              {CONTENT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <input
              value={form.contentUrl}
              onChange={(event) => setForm((current) => ({ ...current, contentUrl: event.target.value }))}
              placeholder="Paste content URL or drag & drop media below"
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`relative rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
              isDragging ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20" : "border-slate-300 dark:border-slate-600"
            }`}
          >
            <div className="pointer-events-none">
              <Upload className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-100">Drag & drop your post or reel here</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">or use the button below to browse files</p>
            </div>
            <input
              type="file"
              accept="image/*,video/*"
              disabled={isUploading}
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileUpload(e.target.files[0]);
                }
                e.target.value = "";
              }}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>

          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Choose File
              </>
            )}
            <input
              type="file"
              accept="image/*,video/*"
              disabled={isUploading}
              className="sr-only"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileUpload(e.target.files[0]);
                }
                e.target.value = "";
              }}
            />
          </label>

          <textarea
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Notes for vendor"
            className="min-h-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
          <button
            type="button"
            disabled={busy || !form.contentUrl.trim()}
            onClick={() => onSubmit(campaignId, deliverable.id, form).then(() => setForm({ contentUrl: "", contentType: "url", notes: "" }))}
            className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-950"
          >
            <Send className="h-4 w-4" />
            Upload Content
          </button>
        </div>
      ) : isApproved ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handlePublish}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-600"
          >
            <Share2 className="h-4 w-4" />
            Publish Content
          </button>
          <p className="flex items-center text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            Content approved! Ready to publish.
          </p>
        </div>
      ) : null}
    </article>
  );
}

export default function CampaignExecutionPage() {
  const navigate = useNavigate();
  const { campaignId } = useParams();
  const [execution, setExecution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getCampaignExecution(campaignId);
      setExecution(response?.data || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load campaign execution.");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(campaignIdValue, deliverableId, payload) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await submitCampaignExecutionDeliverable(campaignIdValue, deliverableId, payload);
      setExecution(response?.data || null);
      setMessage("Deliverable uploaded for vendor review.");
    } catch (err) {
      setError(err?.response?.data?.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  const totalDeliverableValue = useMemo(() => (execution?.deliverables || []).reduce((sum, row) => sum + Number(row.totalPrice || 0), 0), [execution]);

  if (loading) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">Loading campaign execution...</div>;

  const campaign = execution?.campaign || {};
  const progress = execution?.progress || {};
  const payout = execution?.payout || {};

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/influencer/campaigns?tab=accepted" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Accepted Campaigns
        </Link>
        <button type="button" onClick={load} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold dark:border-slate-700 dark:text-slate-200">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100">{error}</div> : null}
      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100">{message}</div> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-200">
              <FileUp className="h-3.5 w-3.5" />
              Create Content
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">{campaign.title || "Campaign"}</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {campaign.vendor?.shopName || campaign.vendor?.companyName || "Vendor"} · {statusLabel(campaign.campaignType)} · {statusLabel(campaign.paymentModel)}
            </p>
          </div>
          <div className="min-w-64 rounded-xl bg-slate-50 p-4 dark:bg-slate-950/60">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Current Progress</span>
              <span className="font-semibold text-slate-950 dark:text-white">{progress.completed || 0} / {progress.total || 0}</span>
            </div>
            <div className="mt-3"><ProgressBar value={progress.completionPercent || 0} /></div>
            <p className="mt-2 text-right text-sm font-semibold text-slate-950 dark:text-white">{progress.completionPercent || 0}%</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Info label="Campaign Budget" value={formatCurrency(campaign.budget || 0)} />
          <Info label="Start Date" value={dateLabel(campaign.startDate)} />
          <Info label="End Date" value={dateLabel(campaign.endDate)} />
          <Info label="Approved Value" value={formatCurrency(payout.approvedDeliverableValue || 0)} />
          <Info label="Eligible Payout" value={formatCurrency(payout.eligiblePayout || 0)} />
        </div>
      </section>

      <section className="grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Deliverables</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Total Deliverables Value: {formatCurrency(totalDeliverableValue)}</p>
          </div>
        </div>
        {(execution?.deliverables || []).map((deliverable) => (
          <DeliverableCard key={deliverable.id} campaignId={campaign.id} deliverable={deliverable} busy={busy} onSubmit={submit} navigate={navigate} campaignData={execution} />
        ))}
      </section>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/60">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}
