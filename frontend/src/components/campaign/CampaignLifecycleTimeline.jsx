import { Clock3 } from "lucide-react";

const LIFECYCLE_LABELS = {
  DRAFT: "Draft",
  INVITATION_PENDING: "Invitation pending",
  INVITATION_EXPIRED: "Invitation expired",
  CONTENT_CREATION: "Content creation",
  UNDER_REVIEW: "Under review",
  READY_FOR_PUBLISH: "Ready to publish",
  PUBLISH_SCHEDULED: "Publish scheduled",
  CONTENT_PUBLISHED: "Content published",
  LIVE: "Live",
  CONTENT_DEADLINE_MISSED: "Content deadline missed",
  COMPLETED: "Completed",
  REFUND_PENDING: "Refund pending",
  REFUNDED: "Refunded",
  CANCELLED: "Cancelled",
};

function normalizeStatus(value = "") {
  return String(value || "")
    .trim()
    .replace(/-/g, "_")
    .toUpperCase();
}

function dateLabel(value) {
  return value ? new Date(value).toLocaleString() : "";
}

function lifecycleDeadline(campaign = {}) {
  const lifecycle = campaign.lifecycle || {};
  const status = normalizeStatus(campaign.lifecycleStatus || campaign.currentLifecycleStatus || campaign.state);
  if (status === "INVITATION_PENDING") return lifecycle.invitationDeadline || campaign.invitationDeadline || campaign.applicationDeadline || campaign.marketplace?.applicationDeadline;
  if (status === "CONTENT_CREATION" || status === "UNDER_REVIEW") return lifecycle.contentCreationDeadline || campaign.contentCreationDeadline;
  if (status === "PUBLISH_SCHEDULED" || status === "READY_FOR_PUBLISH") return lifecycle.publishScheduledAt || campaign.publishScheduledAt;
  if (status === "LIVE") return lifecycle.campaignEndDate || campaign.campaignEndDate || campaign.endDate;
  return lifecycle.campaignCompletedAt || lifecycle.campaignEndDate || campaign.campaignCompletedAt || campaign.endDate;
}

export function campaignLifecycleLabel(campaign = {}) {
  const status = normalizeStatus(campaign.lifecycleStatus || campaign.currentLifecycleStatus || campaign.state || campaign.status);
  return LIFECYCLE_LABELS[status] || String(status || "OPEN").replace(/_/g, " ").toLowerCase();
}

export function CampaignLifecycleTimeline({ campaign = {}, compact = false }) {
  const label = campaignLifecycleLabel(campaign);
  const deadline = lifecycleDeadline(campaign);
  const status = normalizeStatus(campaign.lifecycleStatus || campaign.currentLifecycleStatus || campaign.state || campaign.status);
  const trackingActive = Boolean(campaign.lifecycle?.trackingEnabled ?? campaign.trackingEnabled ?? campaign.scheduling?.trackingEnabled);
  const affiliateActive = Boolean(campaign.lifecycle?.affiliateEnabled ?? campaign.affiliateEnabled ?? campaign.scheduling?.affiliateEnabled);
  const tone = status === "LIVE"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100"
    : status.includes("EXPIRED") || status.includes("MISSED") || status === "CANCELLED"
      ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-100"
      : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200";

  return (
    <div className={`rounded-xl border px-3 py-2 text-sm ${tone}`}>
      <div className="flex items-center gap-2 font-semibold capitalize">
        <Clock3 className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </div>
      {!compact && deadline ? (
        <p className="mt-1 text-xs opacity-80">{status === "LIVE" ? "Ends" : "Due"} {dateLabel(deadline)}</p>
      ) : null}
      {!compact && (status === "LIVE" || trackingActive || affiliateActive) ? (
        <p className="mt-1 text-xs opacity-80">
          Affiliate {affiliateActive ? "enabled" : "disabled"} / Tracking {trackingActive ? "enabled" : "disabled"}
        </p>
      ) : null}
    </div>
  );
}
