import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, AlertCircle, CheckCircle2, Clock3, FileUp, LinkIcon, RefreshCw, Send, Upload, Loader2, Share2, XCircle } from "lucide-react";
import { getCampaignExecution, submitCampaignExecutionDeliverable, uploadInfluencerContentMedia } from "../../services/influencerCommerceService";
import { formatCurrency } from "../../utils/formatCurrency";

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const EXECUTABLE_EXTENSIONS = new Set(["exe", "bat", "cmd", "sh", "msi", "js", "jar", "scr", "ps1", "com", "dll"]);
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "qt"]);
const DOCUMENT_EXTENSIONS = new Set(["pdf", "doc", "docx"]);

const DELIVERABLE_UPLOAD_RULES = {
  post: {
    badge: "POST REQUIRED",
    message: "This campaign requires a POST only.",
    helper: ["Instagram Feed Post", "Facebook Feed Post", "Image Upload"],
    options: [
      { value: "instagram_post", label: "Instagram Post", sourcePlatform: "instagram", mediaType: "instagram_post", uploadMethod: "url", placeholder: "Paste Instagram feed post URL" },
      { value: "facebook_post", label: "Facebook Post", sourcePlatform: "facebook", mediaType: "facebook_post", uploadMethod: "url", placeholder: "Paste Facebook feed post URL" },
      { value: "image_upload", label: "Image Upload", sourcePlatform: "upload", mediaType: "image", uploadMethod: "file", accept: "image/jpeg,image/png,image/webp,image/gif" },
      { value: "carousel_images", label: "Carousel Images", sourcePlatform: "upload", mediaType: "carousel", uploadMethod: "file", accept: "image/jpeg,image/png,image/webp,image/gif", multiple: true },
      { value: "document_proof", label: "Document (optional proof)", sourcePlatform: "upload", mediaType: "document", uploadMethod: "file", accept: "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
    ],
  },
  reel: {
    badge: "REEL REQUIRED",
    message: "This campaign requires a REEL only.",
    helper: ["Instagram Reel", "TikTok", "YouTube Shorts", "Video Upload"],
    options: [
      { value: "instagram_reel", label: "Instagram Reel", sourcePlatform: "instagram", mediaType: "instagram_reel", uploadMethod: "url", placeholder: "Paste Instagram Reel URL" },
      { value: "youtube_shorts", label: "YouTube Shorts", sourcePlatform: "youtube", mediaType: "youtube_shorts", uploadMethod: "url", placeholder: "Paste YouTube Shorts URL" },
      { value: "tiktok_video", label: "TikTok", sourcePlatform: "tiktok", mediaType: "tiktok_video", uploadMethod: "url", placeholder: "Paste TikTok video URL" },
      { value: "facebook_reel", label: "Facebook Reel", sourcePlatform: "facebook", mediaType: "facebook_reel", uploadMethod: "url", placeholder: "Paste Facebook Reel URL" },
      { value: "video_upload", label: "Video Upload", sourcePlatform: "upload", mediaType: "video", uploadMethod: "file", accept: "video/mp4,video/webm,video/quicktime" },
    ],
  },
};

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

function isMongoObjectId(value = "") {
  return /^[a-f\d]{24}$/i.test(String(value || ""));
}

function reviewDecisionLabel(value = "") {
  const decision = String(value || "").toLowerCase();
  if (decision === "approve") return "Approved by vendor";
  if (decision === "reject") return "Rejected by vendor";
  if (decision === "revision_requested") return "Changes requested by vendor";
  return "Waiting for vendor review";
}

function effectiveReviewDecision(deliverable = {}) {
  const reviewDecision = deliverable.latestReview?.decision;
  if (reviewDecision) return reviewDecision;
  const approvalStatus = String(deliverable.approvalStatus || deliverable.status || "").toLowerCase();
  if (approvalStatus === "approved" || approvalStatus === "completed") return "approve";
  if (approvalStatus === "rejected") return "reject";
  if (approvalStatus === "revision_requested") return "revision_requested";
  return "";
}

function reviewTone(value = "") {
  const decision = String(value || "").toLowerCase();
  if (decision === "approve") return "emerald";
  if (decision === "reject") return "rose";
  if (decision === "revision_requested") return "amber";
  return "slate";
}

function ReviewIcon({ decision = "", className = "h-5 w-5" }) {
  const tone = reviewTone(decision);
  if (tone === "emerald") return <CheckCircle2 className={`${className} text-emerald-500`} />;
  if (tone === "rose") return <XCircle className={`${className} text-rose-500`} />;
  if (tone === "amber") return <AlertCircle className={`${className} text-amber-500`} />;
  return <Clock3 className={`${className} text-slate-400`} />;
}

function dateLabel(value) {
  return value ? new Date(value).toLocaleDateString() : "Not set";
}

function dateTimeLabel(value) {
  return value ? new Date(value).toLocaleString() : "Not reviewed yet";
}

function normalizeDeliverableKind(deliverable = {}) {
  const raw = String(deliverable.deliverableType || deliverable.type || deliverable.title || "").toLowerCase();
  if (/(^|[_\s-])(reel|short|shorts|video|ugc)([_\s-]|$)/.test(raw) || raw.includes("reel")) return "reel";
  return "post";
}

function extensionFromName(value = "") {
  const clean = String(value || "").split("?")[0].split("#")[0];
  const ext = clean.includes(".") ? clean.split(".").pop().toLowerCase() : "";
  return ext;
}

function isAllowedUrlForOption(value = "", option = {}) {
  const text = String(value || "").trim();
  if (!text) return false;
  let url;
  try {
    url = new URL(text);
  } catch {
    return false;
  }
  if (!["http:", "https:"].includes(url.protocol)) return false;
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const path = url.pathname.toLowerCase();
  if (option.value === "instagram_post") return host.endsWith("instagram.com") && path.includes("/p/");
  if (option.value === "instagram_reel") return host.endsWith("instagram.com") && (path.includes("/reel/") || path.includes("/reels/"));
  if (option.value === "facebook_post") return (host.endsWith("facebook.com") || host.endsWith("fb.com")) && !path.includes("/reel");
  if (option.value === "facebook_reel") return (host.endsWith("facebook.com") || host.endsWith("fb.watch")) && (path.includes("/reel") || path.includes("/watch") || host.endsWith("fb.watch"));
  if (option.value === "youtube_shorts") return (host.endsWith("youtube.com") && path.includes("/shorts/")) || host.endsWith("youtu.be");
  if (option.value === "tiktok_video") return host.endsWith("tiktok.com") && path.includes("/video/");
  return true;
}

function validateFilesForOption(files = [], option = {}) {
  if (!files.length) return "Choose a file before uploading.";
  for (const file of files) {
    const ext = extensionFromName(file.name);
    if (EXECUTABLE_EXTENSIONS.has(ext)) return "Executable files are not allowed.";
    if (file.size > MAX_UPLOAD_BYTES) return "Uploaded file is too large.";
    if (option.mediaType === "video" && (!file.type.startsWith("video/") || !VIDEO_EXTENSIONS.has(ext))) return "Only MP4, WebM, or MOV video files are accepted for REEL uploads.";
    if (["image", "carousel"].includes(option.mediaType) && (!file.type.startsWith("image/") || !IMAGE_EXTENSIONS.has(ext))) return "Only JPEG, PNG, WebP, or GIF images are accepted for POST uploads.";
    if (option.mediaType === "document" && (!["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(file.type) || !DOCUMENT_EXTENSIONS.has(ext))) {
      return "Only PDF, DOC, or DOCX documents are accepted as proof.";
    }
  }
  if (!option.multiple && files.length > 1) return "Only one file is allowed for this upload type.";
  return "";
}

function ProgressBar({ value = 0 }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

function VendorApprovalModule({ deliverables = [] }) {
  const reviewed = deliverables.filter((row) => effectiveReviewDecision(row));
  const approved = deliverables.filter((row) => effectiveReviewDecision(row) === "approve");
  const rejected = deliverables.filter((row) => effectiveReviewDecision(row) === "reject");
  const changes = deliverables.filter((row) => effectiveReviewDecision(row) === "revision_requested");
  const pending = deliverables.length - reviewed.length;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Vendor approval status</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">Check whether the vendor approved your content</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            This module updates from the vendor review flow, including approval, rejection, revision request, and comments.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {reviewed.length} / {deliverables.length} reviewed
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <ApprovalMetric label="Approved" value={approved.length} tone="emerald" />
        <ApprovalMetric label="Changes" value={changes.length} tone="amber" />
        <ApprovalMetric label="Rejected" value={rejected.length} tone="rose" />
        <ApprovalMetric label="Waiting" value={pending} tone="slate" />
      </div>

      <div className="mt-4 grid gap-3">
        {deliverables.map((deliverable) => {
          const review = deliverable.latestReview;
          const decision = effectiveReviewDecision(deliverable);
          const tone = reviewTone(decision);
          const toneClasses = {
            emerald: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200",
            rose: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200",
            amber: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200",
            slate: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200",
          }[tone];

          return (
            <div key={deliverable.id} className={`rounded-xl border p-4 ${toneClasses}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <ReviewIcon decision={decision} />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-950 dark:text-white">{deliverable.title}</p>
                    <p className="mt-1 text-sm capitalize">{reviewDecisionLabel(decision)}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold">{dateTimeLabel(review?.reviewedAt)}</span>
              </div>
              {review?.comments ? (
                <p className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-sm text-slate-700 dark:bg-slate-950/40 dark:text-slate-200">
                  Vendor note: {review.comments}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ApprovalMetric({ label, value, tone }) {
  const classes = {
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-200",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-200",
    slate: "bg-slate-50 text-slate-700 dark:bg-slate-950/60 dark:text-slate-200",
  }[tone];

  return (
    <div className={`rounded-xl p-3 ${classes}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function RefundedDeliverablesNotice({ deliverables = [] }) {
  const refunded = deliverables.filter((row) => row.refundLock?.locked);
  if (!refunded.length) return null;
  const totalRefunded = refunded.reduce((sum, row) => sum + Number(row.refundLock?.refundedAmount || row.funding?.refundedAmount || 0), 0);

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-1 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Refunded deliverables</p>
            <h2 className="mt-1 text-xl font-semibold">Some deliverables are no longer available for content creation</h2>
            <p className="mt-1 text-sm">
              You can publish only the deliverables completed within their due date. Refunded deliverables are locked because the amount was returned to the vendor.
            </p>
          </div>
        </div>
        <div className="rounded-xl bg-white/70 px-4 py-3 text-sm dark:bg-slate-950/40">
          <p className="text-xs opacity-75">Total refunded</p>
          <p className="text-lg font-semibold">{formatCurrency(totalRefunded)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {refunded.map((deliverable) => (
          <div key={deliverable.id} className="rounded-xl border border-amber-200 bg-white/70 p-3 dark:border-amber-900/40 dark:bg-slate-950/40">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-950 dark:text-white">{deliverable.title}</p>
                <p className="mt-1 text-sm">
                  Due {dateLabel(deliverable.expectedCompletionDate)} · Refunded {formatCurrency(deliverable.refundLock?.refundedAmount || deliverable.funding?.refundedAmount || 0)}
                </p>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-900/40 dark:text-amber-100">
                Content locked
              </span>
            </div>
            <p className="mt-2 text-sm">
              You can't create a reel or post for this deliverable because the deliverable due date passed and its escrow amount was refunded to the vendor.
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function DeliverableCard({ campaignId, deliverable, busy, onSubmit, navigate, campaignData }) {
  const deliverableKind = normalizeDeliverableKind(deliverable);
  const uploadRule = DELIVERABLE_UPLOAD_RULES[deliverableKind] || DELIVERABLE_UPLOAD_RULES.post;
  const [form, setForm] = useState({
    contentUrl: "",
    mediaUrls: [],
    contentType: deliverableKind,
    uploadOption: uploadRule.options[0].value,
    sourcePlatform: uploadRule.options[0].sourcePlatform,
    mediaType: uploadRule.options[0].mediaType,
    uploadMethod: uploadRule.options[0].uploadMethod,
    fileMetadata: [],
    notes: "",
  });
  const [validationError, setValidationError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const refundLock = deliverable.refundLock || {};
  const isRefundedLocked = Boolean(refundLock.locked);
  const closed = ["completed", "approved", "cancelled"].includes(deliverable.status);
  const latest = deliverable.submissions?.[0] || null;
  const isApproved = ["approved", "completed"].includes(deliverable.status);
  const selectedOption = uploadRule.options.find((option) => option.value === form.uploadOption) || uploadRule.options[0];
  const requiresUrl = selectedOption.uploadMethod === "url";
  const hasValidUrl = !requiresUrl || isAllowedUrlForOption(form.contentUrl, selectedOption);
  const canSubmit = Boolean(form.contentUrl.trim()) && hasValidUrl && !validationError && !isUploading;

  function resetForm(option = uploadRule.options[0]) {
    setValidationError("");
    setForm({
      contentUrl: "",
      mediaUrls: [],
      contentType: deliverableKind,
      uploadOption: option.value,
      sourcePlatform: option.sourcePlatform,
      mediaType: option.mediaType,
      uploadMethod: option.uploadMethod,
      fileMetadata: [],
      notes: "",
    });
  }

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

  async function handleFileUpload(filesValue) {
    const files = Array.from(filesValue || []).filter(Boolean);
    const fileError = validateFilesForOption(files, selectedOption);
    if (fileError) {
      setValidationError(fileError);
      return;
    }
    setValidationError("");
    setIsUploading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => {
        if (selectedOption.mediaType === "video") formData.append("video", file);
        else if (selectedOption.mediaType === "document") formData.append("document", file);
        else formData.append("thumbnail", file);
      });
      const response = await uploadInfluencerContentMedia(formData);
      const uploadedUrls = [...new Set([
        response?.data?.videoUrl,
        response?.data?.documentUrl,
        response?.data?.thumbnailUrl,
        ...(Array.isArray(response?.data?.imageUrls) ? response.data.imageUrls : []),
      ].filter(Boolean))];
      const uploadedUrl = uploadedUrls[0];
      if (uploadedUrl) {
        setForm((current) => ({
          ...current,
          contentUrl: uploadedUrl,
          mediaUrls: uploadedUrls,
          contentType: deliverableKind,
          sourcePlatform: selectedOption.sourcePlatform,
          mediaType: selectedOption.mediaType,
          uploadMethod: selectedOption.uploadMethod,
          fileMetadata: files.map((file) => ({ name: file.name, mimeType: file.type, size: file.size })),
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
      handleFileUpload(files);
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
          <p className="mt-1 font-semibold capitalize text-slate-950 dark:text-white">
            {isRefundedLocked ? "Refunded to vendor" : statusLabel(deliverable.paymentEligibility)}
          </p>
        </div>
      </div>

      {isRefundedLocked ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          <div className="flex flex-wrap items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Content creation is locked for this deliverable</p>
              <p className="mt-1 text-sm">
                {refundLock.message || "You can't create content for this deliverable because the amount was refunded to the vendor."}
              </p>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                <div className="rounded-xl bg-white/70 px-3 py-2 dark:bg-slate-950/40">
                  <p className="text-xs opacity-75">Refunded Amount</p>
                  <p className="font-semibold">{formatCurrency(refundLock.refundedAmount || deliverable.funding?.refundedAmount || 0)}</p>
                </div>
                <div className="rounded-xl bg-white/70 px-3 py-2 dark:bg-slate-950/40">
                  <p className="text-xs opacity-75">Due Date</p>
                  <p className="font-semibold">{dateLabel(deliverable.expectedCompletionDate)}</p>
                </div>
                <div className="rounded-xl bg-white/70 px-3 py-2 dark:bg-slate-950/40">
                  <p className="text-xs opacity-75">Status</p>
                  <p className="font-semibold capitalize">{statusLabel(refundLock.status || "refunded")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

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

      {!isRefundedLocked && !closed ? (
        <div className="mt-4 grid gap-3">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm text-indigo-950 dark:border-indigo-900/50 dark:bg-indigo-950/20 dark:text-indigo-100">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">Deliverable Type</p>
                <p className="mt-1 text-lg font-semibold uppercase">{deliverableKind}</p>
              </div>
              <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">{uploadRule.badge}</span>
            </div>
            <p className="mt-3 font-semibold">{uploadRule.message}</p>
            <ul className="mt-2 flex flex-wrap gap-2 text-xs">
              {uploadRule.helper.map((item) => (
                <li key={item} className="rounded-full bg-white px-3 py-1 text-indigo-700 shadow-sm dark:bg-slate-900 dark:text-indigo-200">{item}</li>
              ))}
            </ul>
          </div>

          <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
            <select
              value={form.uploadOption}
              onChange={(event) => {
                const next = uploadRule.options.find((option) => option.value === event.target.value) || uploadRule.options[0];
                resetForm(next);
              }}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              {uploadRule.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <input
              value={form.contentUrl}
              disabled={!requiresUrl}
              onChange={(event) => {
                setValidationError("");
                setForm((current) => ({ ...current, contentUrl: event.target.value.trimStart() }));
              }}
              onBlur={() => {
                if (requiresUrl && form.contentUrl && !isAllowedUrlForOption(form.contentUrl, selectedOption)) {
                  setValidationError(`${selectedOption.label} URL is not valid for this ${deliverableKind.toUpperCase()} deliverable.`);
                }
              }}
              placeholder={requiresUrl ? selectedOption.placeholder : "Upload media below to generate a secure media URL"}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {selectedOption.uploadMethod === "file" ? (
            <>
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
                  <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-100">Drag & drop {selectedOption.label.toLowerCase()} here</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{uploadRule.message}</p>
                </div>
                <input
                  type="file"
                  accept={selectedOption.accept}
                  multiple={Boolean(selectedOption.multiple)}
                  disabled={isUploading}
                  onChange={(e) => {
                    if (e.target.files?.length) {
                      handleFileUpload(e.target.files);
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
                  accept={selectedOption.accept}
                  multiple={Boolean(selectedOption.multiple)}
                  disabled={isUploading}
                  className="sr-only"
                  onChange={(e) => {
                    if (e.target.files?.length) {
                      handleFileUpload(e.target.files);
                    }
                    e.target.value = "";
                  }}
                />
              </label>
            </>
          ) : null}

          {validationError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
              {validationError || uploadRule.message}
            </div>
          ) : null}

          <textarea
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Notes for vendor"
            className="min-h-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
          <button
            type="button"
            disabled={busy || !canSubmit}
            onClick={() => onSubmit(campaignId, deliverable.id, form).then(() => resetForm(selectedOption))}
            className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-950"
          >
            <Send className="h-4 w-4" />
            Upload Content
          </button>
        </div>
      ) : !isRefundedLocked && isApproved ? (
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
  const validCampaignId = isMongoObjectId(campaignId);
  const [execution, setExecution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!validCampaignId) {
      setLoading(false);
      setExecution(null);
      setError("Invalid campaign link. Please open the campaign from Accepted Campaigns.");
      return;
    }
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
  }, [campaignId, validCampaignId]);

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

  if (!validCampaignId) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100">
        <h1 className="text-lg font-semibold">Invalid campaign link</h1>
        <p className="text-sm">This page needs a real campaign ID. Open it from Accepted Campaigns instead of using the route placeholder.</p>
        <Link to="/influencer/campaigns?tab=accepted" className="inline-flex w-fit items-center gap-2 rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600">
          <ArrowLeft className="h-4 w-4" />
          Go to Accepted Campaigns
        </Link>
      </div>
    );
  }

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

      <VendorApprovalModule deliverables={execution?.deliverables || []} />
      <RefundedDeliverablesNotice deliverables={execution?.deliverables || []} />

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
