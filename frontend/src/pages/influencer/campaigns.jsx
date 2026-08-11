 
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { requestInput } from "../../services/notificationService";
import {
  BarChart3,
  Bookmark,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileUp,
  Megaphone,
  PackageCheck,
  PlusCircle,
  Save,
  Search,
  Send,
  Undo2,
  Trash2,
} from "lucide-react";
import {
  applyCampaignMarketplace,
  acceptCampaign,
  rejectCampaign,
  generateAffiliateProductLinks,
  getCampaignMarketplaceAnalytics,
  getInfluencerCommerceProfile,
  listCampaignMarketplace,
  saveCampaignMarketplace,
  saveInfluencerDeliveryAddress,
  saveInfluencerServices,
  confirmInfluencerProductReturn,
} from "../../services/influencerCommerceService";
import { CampaignLifecycleTimeline, campaignLifecycleLabel } from "../../components/campaign/CampaignLifecycleTimeline";
import { formatCurrency } from "../../utils/formatCurrency";

const TABS = [
  { id: "services", label: "My Services" },
  { id: "available", label: "Available Campaigns" },
  { id: "recommended", label: "Recommended Campaigns" },
  { id: "invitations", label: "Campaign Invitations" },
  { id: "accepted", label: "Accepted Campaigns" },
  { id: "delivered-products", label: "Delivered Products" },
  { id: "returned-products", label: "Returned Products" },
  { id: "rejected", label: "Rejected Campaigns" },
  { id: "completed", label: "Completed Campaigns" },
  { id: "analytics", label: "Campaign Analytics" },
];

const CAMPAIGN_TYPES = [
  ["", "All types"],
  ["affiliate", "Affiliate"],
  ["sponsored", "Sponsored"],
  ["product_review", "Product Review"],
  ["ugc", "UGC"],
  ["video", "Video"],
  ["live_commerce", "Live Commerce"],
  ["brand_ambassador", "Brand Ambassador"],
];

function statusLabel(value = "") {
  return String(value || "open").replace(/_/g, " ");
}

function campaignProductIds(campaign) {
  return (campaign.products || campaign.productIds || [])
    .map((product) => product.id || product._id || product)
    .filter(Boolean)
    .map(String);
}

function campaignKey(campaign = {}) {
  return campaign.id || campaign._id || "";
}

function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function compactAddress(...parts) {
  return parts.map((part) => String(part || "").trim()).filter(Boolean).join(", ");
}

function AddressBlock({ title, address = {} }) {
  const locality = compactAddress(address.city, [address.state, address.postalCode].filter(Boolean).join(" - "));
  const lines = [
    address.name,
    address.phone,
    address.addressLine1,
    address.addressLine2,
    locality,
    address.country,
  ].filter(Boolean);
  return (
    <div className="min-w-56 rounded-xl bg-slate-50 px-3 py-2 text-xs dark:bg-slate-950/60">
      <p className="font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
      {lines.length ? (
        <address className="mt-1 space-y-0.5 not-italic text-slate-700 dark:text-slate-200">
          {lines.map((line, index) => <p key={index}>{line}</p>)}
        </address>
      ) : (
        <p className="mt-1 text-slate-500">Not available</p>
      )}
    </div>
  );
}

function isDeliveredProductCampaign(campaign = {}) {
  const status = String(campaign.productShipping?.shipmentStatus || "");
  return Boolean(campaign.productShipping?.productRequired && !status.startsWith("return_"));
}

function isReturnedProductCampaign(campaign = {}) {
  const status = String(campaign.productShipping?.shipmentStatus || "");
  return Boolean(campaign.productShipping?.returnRequired && status.startsWith("return_"));
}

function ProductLogisticsSummary({ campaign }) {
  const shipping = campaign.productShipping || {};
  if (!shipping.productRequired) return null;
  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm text-indigo-950 dark:border-indigo-900/50 dark:bg-indigo-950/20 dark:text-indigo-100">
      <p className="font-semibold capitalize">Product logistics: {statusLabel(shipping.shipmentStatus || "pending_shipment")}</p>
      <p className="mt-1 text-xs">
        {[shipping.courierCompany, shipping.trackingNumber].filter(Boolean).join(" - ") || "Tracking details will appear after vendor dispatch."}
      </p>
      {shipping.returnRequired ? <p className="mt-1 text-xs">Return required after campaign completion.</p> : null}
    </div>
  );
}

function CampaignProductLogisticsTable({ campaigns = [], type = "delivery", onViewDetails, onSubmitDeliverable, onProvideReturnTracking }) {
  const isReturn = type === "return";
  const Icon = isReturn ? Undo2 : PackageCheck;
  const title = isReturn ? "Returned Products" : "Delivered Products";
  const description = isReturn
    ? "Track product return movement from your delivery address back to the vendor."
    : "Track campaign products shipped by vendors to your delivery address.";
  const emptyMessage = isReturn ? "No return product records found." : "No delivery product records found.";

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-200">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-950 dark:text-white">{title}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
            </div>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {campaigns.length} records
          </span>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {!campaigns.length ? (
          <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {emptyMessage}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                <tr>
                  {["Campaign", "Product", "Vendor", "Address", "Tracking", "Status", "Action"].map((header) => (
                    <th key={header} className="whitespace-nowrap px-3 py-3">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => {
                  const shipping = campaign.productShipping || {};
                  const trackingUrl = isReturn ? shipping.returnTrackingUrl : shipping.trackingUrl;
                  const courier = isReturn ? shipping.returnCourierCompany : shipping.courierCompany;
                  const trackingNumber = isReturn ? shipping.returnTrackingNumber : shipping.trackingNumber;
                  const address = isReturn ? shipping.returnAddressSnapshot : shipping.deliveryAddressSnapshot;
                  const products = campaign.products || campaign.productIds || [];
                  return (
                    <tr key={campaignKey(campaign)} className="border-t border-slate-100 align-top dark:border-slate-800">
                      <td className="px-3 py-3">
                        <p className="font-semibold text-slate-950 dark:text-white">{campaign.title || "Campaign"}</p>
                        <p className="mt-1 text-xs capitalize text-slate-500">{campaignLifecycleLabel(campaign) || statusLabel(campaign.state)}</p>
                      </td>
                      <td className="px-3 py-3">
                        {products.length ? products.map((product) => (
                          <p key={product.id || product._id || product} className="font-medium text-slate-700 dark:text-slate-200">{product.name || product.title || product.productName || "Product"}</p>
                        )) : <p className="text-slate-500">No product</p>}
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-slate-800 dark:text-slate-100">{campaign.brandName || campaign.vendor?.shopName || campaign.vendorName || "Vendor"}</p>
                        <p className="mt-1 text-xs text-slate-500">Campaign partner</p>
                      </td>
                      <td className="px-3 py-3">
                        <AddressBlock title={isReturn ? "Vendor return address" : "Your delivery address"} address={address} />
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-700 dark:text-slate-200">
                        <p><span className="font-semibold">Courier:</span> {courier || "-"}</p>
                        <p className="mt-1"><span className="font-semibold">Tracking:</span> {trackingNumber || "-"}</p>
                        <p className="mt-1"><span className="font-semibold">Updated:</span> {formatDateTime(shipping.updatedAt || shipping.shipmentDate || shipping.returnShipmentDate)}</p>
                        {trackingUrl ? (
                          <a href={trackingUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-300">
                            Track <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {statusLabel(shipping.shipmentStatus || "placed")}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => onViewDetails(campaign)}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            View Details
                          </button>
                          {!isReturn ? (
                            <button
                              type="button"
                              onClick={() => onSubmitDeliverable(campaign)}
                              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950"
                            >
                              Create Content
                            </button>
                          ) : ["return_placed", "return_pending", "return_packing", "return_ready_for_pickup", "return_shipped"].includes(String(shipping.shipmentStatus || "")) ? (
                            <button
                              type="button"
                              onClick={() => onProvideReturnTracking(campaign)}
                              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-500"
                            >
                              Update Return
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function CampaignCard({ campaign, tab = "available", onApply, onAccept, onReject, onViewDetails, onSave, onSubmitDeliverable, onGenerateLink, busyId }) {
  const campaignId = campaignKey(campaign);
  const busy = busyId === campaignId;
  const applicationStatus = campaign.applicationStatus || "";
  const openInvitationStatuses = ["invitation_sent", "proposed", "pending_review"];
  const campaignState = campaign.state || "";
  const invitationStatus = campaign.invitationStatus || "";
  const hasOpenInvitation = campaign.hasInvitation && openInvitationStatuses.includes(invitationStatus);
  const workflowStatus = campaignState && !openInvitationStatuses.includes(campaignState)
    ? campaignState
    : invitationStatus || applicationStatus || campaign.status || campaignState || "";
  const lifecycleStatus = String(campaign.lifecycleStatus || campaign.currentLifecycleStatus || campaignState || "").toUpperCase();
  const canAccept = hasOpenInvitation || (openInvitationStatuses.includes(workflowStatus) && (!campaignState || openInvitationStatuses.includes(campaignState)));
  const canReject = canAccept;
  const isApplied = ["submitted", "pending_review", "shortlisted", "approved", "accepted", "active", "completed"].includes(applicationStatus);
  const isActive = ["approved", "accepted", "active", "product_shipped", "content_in_progress", "content_submitted", "under_review", "revision_requested", "partially_completed", "ready_for_publish", "publish_scheduled", "published", "tracking_active", "completed"].includes(workflowStatus);
  const contentEnabled = ["CONTENT_CREATION", "UNDER_REVIEW", "READY_FOR_PUBLISH", "PUBLISH_SCHEDULED"].includes(lifecycleStatus) && (campaign.paymentType !== "fixed" || Boolean(campaign.fixedPaymentWorkflow?.contentEnabled));
  const linksEnabled = lifecycleStatus === "LIVE";
  const isWaiting = !isActive && ["submitted", "pending_review", "shortlisted"].includes(applicationStatus);
  const canApply = tab === "available" && !isActive && campaign.marketplacePublic && !isApplied && !hasOpenInvitation && !canAccept;
  const deadline = campaign.applicationDeadline || campaign.deadline;
  const productIds = campaignProductIds(campaign);

  return (
    <article className="flex min-h-[360px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="h-28 bg-slate-100 dark:bg-slate-800">
        {campaign.banner ? (
          <img loading="lazy" decoding="async" src={campaign.banner} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            <Megaphone className="h-8 w-8" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">{campaign.brandName}</p>
            <h3 className="mt-1 line-clamp-2 text-lg font-semibold text-slate-950 dark:text-white">{campaign.title}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{campaign.category || "General"} - {statusLabel(campaign.campaignType)}</p>
          </div>
          <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {campaignLifecycleLabel(campaign) || statusLabel(workflowStatus)}
          </span>
        </div>

        <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
          {campaign.description || "Brand partnership opportunity with tracked products, commission attribution, and deliverable workflow."}
        </p>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/60">
            <p className="text-xs text-slate-500 dark:text-slate-400">Budget</p>
            <p className="mt-1 font-semibold text-slate-950 dark:text-white">{formatCurrency(campaign.budget || 0)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/60">
            <p className="text-xs text-slate-500 dark:text-slate-400">Commission</p>
            <p className="mt-1 font-semibold text-slate-950 dark:text-white">{campaign.commissionRate || campaign.commissionPercent || 0}%</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/60">
            <p className="text-xs text-slate-500 dark:text-slate-400">Products</p>
            <p className="mt-1 font-semibold text-slate-950 dark:text-white">{campaign.products?.length || 0}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/60">
            <p className="text-xs text-slate-500 dark:text-slate-400">Deadline</p>
            <p className="mt-1 font-semibold text-slate-950 dark:text-white">{deadline ? formatDate(deadline) : "Open"}</p>
          </div>
        </div>

        <CampaignLifecycleTimeline campaign={campaign} />

        {campaign.recommendationScore ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100">
            {campaign.recommendationScore}% match - {campaign.successProbability}% success probability
          </div>
        ) : null}

        <ProductLogisticsSummary campaign={campaign} />

        <div className="mt-auto flex flex-wrap gap-2">
          {canAccept ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onAccept(campaign)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              Accept
            </button>
          ) : null}
          {canReject ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onReject(campaign)}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-950/30"
            >
              Reject
            </button>
          ) : null}
          {canApply ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onApply(campaign)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              Apply
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onViewDetails(campaign)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ExternalLink className="h-4 w-4" />
            View Details
          </button>
          {contentEnabled ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onSubmitDeliverable(campaign)}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950"
            >
              <FileUp className="h-4 w-4" />
              Create Content
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => onSave(campaign)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Bookmark className="h-4 w-4" />
            {campaign.saved ? "Saved" : "Save"}
          </button>
          <button
            type="button"
            disabled={!linksEnabled || busy || !productIds.length}
            onClick={() => onGenerateLink(campaign)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ExternalLink className="h-4 w-4" />
            Links
          </button>
        </div>
        {isWaiting ? (
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
            Waiting for vendor approval.
          </p>
        ) : null}
        {isActive && !contentEnabled ? (
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
            Accepted. Waiting for the vendor to fund escrow before content creation is enabled.
          </p>
        ) : null}
        {applicationStatus === "approved" ? (
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            Approved by vendor.
          </p>
        ) : null}
        {applicationStatus === "rejected" ? (
          <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
            Rejected by vendor.
          </p>
        ) : null}
      </div>
    </article>
  );
}

function DetailBlock({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function KeyValueGrid({ rows }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-950/60">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 break-words font-semibold text-slate-950 dark:text-white">{value}</p>
        </div>
      ))}
    </div>
  );
}

function CampaignDetailsPanel({ campaign, onClose, onAccept, onReject, busyId }) {
  if (!campaign) return null;
  const campaignId = campaignKey(campaign);
  const openInvitationStatuses = ["invitation_sent", "proposed", "pending_review"];
  const campaignState = campaign.state || "";
  const status = campaignState && !openInvitationStatuses.includes(campaignState)
    ? campaignState
    : campaign.applicationStatus || campaign.status || campaignState || "";
  const canAct = openInvitationStatuses.includes(status) && (!campaignState || openInvitationStatuses.includes(campaignState));
  const products = campaign.products || campaign.productIds || [];
  const paymentModel = campaign.paymentModel || {};
  const pricing = campaign.pricing || {};
  const deliverables = [
    ...(campaign.requiredDeliverables || []),
    ...((paymentModel.selectedServices || paymentModel.services || paymentModel.snapshot?.input?.selectedServices || paymentModel.paymentModel?.config?.selectedServices || paymentModel.config?.selectedServices || []).flatMap((service) => {
      const quantity = Number(service.quantity || service.units || 1);
      const name = service.serviceName || service.serviceTypeKey || "Service";
      if (quantity > 1 && Array.isArray(service.dueDates) && service.dueDates.length === quantity) {
        return service.dueDates.map((date, index) => {
          const base = `${name} ${index + 1} of ${quantity}`;
          return date ? `${base} (Due: ${formatDate(date)})` : base;
        });
      }
      const base = `${name}: ${quantity}`;
      return service.dueDate ? `${base} (Due: ${formatDate(service.dueDate)})` : base;
    })),
  ].filter(Boolean);
  const timeline = campaign.timeline || {};

  return (
    <div className="grid gap-4 rounded-3xl border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Campaign details</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">{campaign.title || "Campaign"}</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{campaign.description || "No campaign description provided."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canAct ? (
            <>
              <button type="button" disabled={busyId === campaignId} onClick={() => onAccept(campaign)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                <CheckCircle2 className="h-4 w-4" />
                Accept
              </button>
              <button type="button" disabled={busyId === campaignId} onClick={() => onReject(campaign)} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-50 dark:border-rose-900/50 dark:text-rose-300">
                Reject
              </button>
            </>
          ) : null}
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
            Close
          </button>
        </div>
      </div>

      <DetailBlock title="Campaign information">
        <KeyValueGrid rows={[
          ["Campaign type", statusLabel(campaign.campaignType)],
          ["Payment model", statusLabel(campaign.paymentType || paymentModel.paymentType)],
          ["Campaign budget", formatCurrency(campaign.budget || pricing.totalBudget || 0)],
          ["Campaign status", statusLabel(status)],
          ["Brand", campaign.brandName || "Brand"],
          ["Vendor", campaign.brandName || "Vendor"],
          ["Category", campaign.category || "General"],
          ["Invitation date", formatDateTime(campaign.invitedAt || campaign.invitationDate)],
          ["Start date", formatDate(timeline.campaignStart)],
          ["End date", formatDateTime(timeline.campaignEndDate || campaign.deadline)],
          ["Application deadline", formatDateTime(campaign.applicationDeadline || campaign.deadline)],
        ]} />
      </DetailBlock>

      <DetailBlock title="Products to promote">
        <div className="grid gap-3 md:grid-cols-2">
          {products.length ? products.map((product) => (
            <div key={product.id || product._id || product.name} className="grid grid-cols-[72px_1fr] gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
              <div className="h-16 w-16 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                {product.image ? <img loading="lazy" decoding="async" src={product.image} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <div className="min-w-0 text-sm">
                <p className="font-semibold text-slate-950 dark:text-white">{product.name || "Product"}</p>
                <p className="text-slate-500">{product.category || "General"} - {formatCurrency(product.price || 0)}</p>
                <p className="mt-1 line-clamp-2 text-slate-600 dark:text-slate-300">{product.description || "No product description provided."}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
                  {product.storeLink ? <Link to={product.storeLink}>Store link</Link> : null}
                  {product.collectionLink ? <Link to={product.collectionLink}>Collection link</Link> : null}
                  {product.storefrontLink ? <Link to={product.storefrontLink}>Storefront link</Link> : null}
                </div>
              </div>
            </div>
          )) : <p className="text-sm text-slate-500">No products attached.</p>}
        </div>
      </DetailBlock>

      <div className="grid gap-4 xl:grid-cols-2">
        <DetailBlock title="Deliverables">
          {deliverables.length ? (
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
              {deliverables.map((item, index) => <li key={`${item}-${index}`} className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950/60">{item}</li>)}
            </ul>
          ) : <p className="text-sm text-slate-500">No deliverables configured.</p>}
        </DetailBlock>
        <DetailBlock title="Timeline">
          <KeyValueGrid rows={[
            ["Campaign start", formatDate(timeline.campaignStart)],
            ["Content submission", formatDate(timeline.contentSubmissionDeadline)],
            ["Revision deadline", formatDate(timeline.revisionDeadline)],
            ["Publishing deadline", formatDate(timeline.publishingDeadline)],
            ["Campaign end", formatDateTime(timeline.campaignEndDate)],
            ["Attribution end", formatDate(timeline.attributionEndDate)],
          ]} />
        </DetailBlock>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DetailBlock title="Payment model">
          <KeyValueGrid rows={[
            ["Fixed fee", formatCurrency(campaign.fixedFee || paymentModel.fixedFee || 0)],
            ["Commission", `${campaign.commissionPercent || paymentModel.commissionPercentage || 0}%`],
            ["Attribution window", `${campaign.attributionWindowDays || paymentModel.attributionDays || 0} days`],
            ["Product value", formatCurrency(pricing.productCost || paymentModel.productValue || 0)],
            ["Shipping", formatCurrency(pricing.shippingCost || paymentModel.shippingCost || 0)],
            ["Estimated earnings", formatCurrency(campaign.expectedEarnings || campaign.fixedFee || pricing.fixedCost || 0)],
          ]} />
        </DetailBlock>
      </div>
    </div>
  );
}

function AnalyticsPanel({ analytics, loading }) {
  const marketplace = analytics?.marketplace || analytics || {};
  const totals = marketplace?.totals || {};
  const rows = marketplace?.rows || [];
  const metrics = [
    ["Campaign Revenue", formatCurrency(totals.revenue || 0)],
    ["Commission Earned", formatCurrency(totals.commission || 0)],
    ["Campaign Orders", totals.orders || 0],
    ["Conversion Rate", `${totals.conversionRate || 0}%`],
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{value}</p>
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div>
            <h3 className="font-semibold text-slate-950 dark:text-white">Campaign performance</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Commission rows stay separate from campaign performance analytics.</p>
          </div>
          <BarChart3 className="h-5 w-5 text-slate-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Campaign</th>
                <th className="px-4 py-3 text-left">Brand</th>
                <th className="px-4 py-3 text-right">Clicks</th>
                <th className="px-4 py-3 text-right">Orders</th>
                <th className="px-4 py-3 text-right">Revenue</th>
                <th className="px-4 py-3 text-right">Commission</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={6}>Loading analytics...</td></tr>
              ) : rows.length ? rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-medium text-slate-950 dark:text-white">{row.title}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.brandName}</td>
                  <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">{row.clicks}</td>
                  <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">{row.orders}</td>
                  <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">{formatCurrency(row.revenue || 0)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-950 dark:text-white">{formatCurrency(row.commission || 0)}</td>
                </tr>
              )) : (
                <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={6}>No campaign attribution yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function defaultPackage(service = {}, template = {}) {
  return {
    packageName: template.packageName || template.label || "Single Deliverable",
    price: Number(template.defaultPrice || service.price || 0),
    currency: template.currency || service.currency || "INR",
    description: "",
  };
}

function defaultService(serviceTypes = [], packageTemplates = []) {
  const first = serviceTypes[0] || {};
  const seed = {
    serviceTypeKey: first.key || "custom_service",
    serviceName: first.label || "Custom Service",
    price: 0,
    currency: first.defaultCurrency || "INR",
    deliveryDays: first.defaultDeliveryDays ?? 3,
    revisionCount: first.defaultRevisionCount ?? 1,
  };
  const template = packageTemplates[0] || {};
  return {
    ...seed,
    description: "",
    status: "active",
    packages: [defaultPackage(seed, template)],
  };
}

function servicePackageRows(service = {}) {
  if (Array.isArray(service.packages) && service.packages.length) return service.packages;
  return [{
    packageName: service.serviceName || "Single Deliverable",
    quantity: 1,
    price: Number(service.price || 0),
    currency: service.currency || "INR",
    description: "",
  }];
}

function normalizedServicesForSave(services = []) {
  return services.map((service) => ({
    ...service,
    packages: servicePackageRows(service).map((item) => {
      const row = { ...item };
      delete row.__fallback;
      return row;
    }),
  }));
}

function TextInput({ label, value, onChange, type = "text", min, textarea = false }) {
  const common = {
    value: value ?? "",
    onChange: (event) => onChange(event.target.value),
    className: "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-indigo-950",
  };
  return (
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
      {label}
      {textarea ? <textarea {...common} rows={3} /> : <input {...common} type={type} min={min} />}
    </label>
  );
}

function emptyDeliveryAddress(address = {}) {
  return {
    name: address?.name || "",
    phone: address?.phone || "",
    addressLine1: address?.addressLine1 || "",
    addressLine2: address?.addressLine2 || "",
    city: address?.city || "",
    state: address?.state || "",
    postalCode: address?.postalCode || "",
    country: address?.country || "India",
  };
}

function DeliveryAddressPanel({ address, busy, onSave }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyDeliveryAddress(address));

  useEffect(() => {
    setForm(emptyDeliveryAddress(address));
  }, [address]);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const hasAddress = Boolean(address?.addressLine1 || address?.city || address?.postalCode);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <h2 className="font-semibold text-slate-950 dark:text-white">Product Delivery Address</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {hasAddress ? [address.name, address.addressLine1, address.city, address.state, address.postalCode].filter(Boolean).join(", ") : "Add the address vendors should ship campaign products to."}
          </p>
        </div>
        <button type="button" onClick={() => setOpen((value) => !value)} className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900/60 dark:text-indigo-300 dark:hover:bg-indigo-950/30">
          <CheckCircle2 className="h-4 w-4" />
          Product Required
        </button>
      </div>
      {open ? (
        <div className="grid gap-3 border-t border-slate-200 px-4 py-4 dark:border-slate-800 md:grid-cols-2">
          <TextInput label="Receiver name" value={form.name} onChange={(value) => setField("name", value)} />
          <TextInput label="Phone" value={form.phone} onChange={(value) => setField("phone", value)} />
          <TextInput label="Address line 1" value={form.addressLine1} onChange={(value) => setField("addressLine1", value)} />
          <TextInput label="Address line 2" value={form.addressLine2} onChange={(value) => setField("addressLine2", value)} />
          <TextInput label="City" value={form.city} onChange={(value) => setField("city", value)} />
          <TextInput label="State" value={form.state} onChange={(value) => setField("state", value)} />
          <TextInput label="Postal code" value={form.postalCode} onChange={(value) => setField("postalCode", value)} />
          <TextInput label="Country" value={form.country} onChange={(value) => setField("country", value)} />
          <div className="md:col-span-2">
            <button type="button" disabled={busy === "delivery-address"} onClick={() => onSave(form)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
              <Save className="h-4 w-4" />
              {busy === "delivery-address" ? "Saving..." : "Save Delivery Address"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ServicesPanel({ commerceProfile, setCommerceProfile, busy, onSaveServices, onSaveDeliveryAddress }) {
  const configuration = commerceProfile?.configuration || {};
  const serviceTypes = configuration.serviceTypes || [];
  const packageTemplates = configuration.packageTemplates || [];
  const services = commerceProfile?.services || [];

  function patchServices(nextServices) {
    setCommerceProfile((current) => ({ ...(current || {}), services: nextServices }));
  }

  function updateService(index, key, value) {
    const next = services.map((service, serviceIndex) => {
      if (serviceIndex !== index) return service;
      const patch = { ...service, [key]: value };
      if (key === "serviceTypeKey") {
        const selected = serviceTypes.find((type) => type.key === value);
        patch.serviceTypeId = selected?._id || "";
        patch.serviceName = selected?.label || service.serviceName || "Custom Service";
        patch.currency = service.currency || selected?.defaultCurrency || "INR";
        patch.packages = servicePackageRows(service).map((pkg) => ({
          ...pkg,
          currency: pkg.currency || patch.currency,
        }));
      }
      return patch;
    });
    patchServices(next);
  }

  function updatePackage(serviceIndex, packageIndex, key, value) {
    const next = services.map((service, index) => {
      if (index !== serviceIndex) return service;
      const packages = servicePackageRows(service).map((pkg, idx) => (idx === packageIndex ? { ...pkg, [key]: value } : pkg));
      const firstPackage = packages[0] || {};
      return {
        ...service,
        packages,
        price: Number(firstPackage.price || 0),
        currency: firstPackage.currency || service.currency || "INR",
      };
    });
    patchServices(next);
  }

  function addPackage(serviceIndex, template = {}) {
    const next = services.map((service, index) => {
      if (index !== serviceIndex) return service;
      return {
        ...service,
        packages: [...servicePackageRows(service), defaultPackage(service, template)],
      };
    });
    patchServices(next);
  }

  function removePackage(serviceIndex, packageIndex) {
    const next = services.map((service, index) => {
      if (index !== serviceIndex) return service;
      const packages = servicePackageRows(service).filter((_, idx) => idx !== packageIndex);
      return { ...service, packages: packages.length ? packages : [defaultPackage(service, packageTemplates[0] || {})] };
    });
    patchServices(next);
  }

  return (
    <div className="grid gap-5">
      <DeliveryAddressPanel address={commerceProfile?.deliveryAddress} busy={busy} onSave={onSaveDeliveryAddress} />
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div>
            <h2 className="font-semibold text-slate-950 dark:text-white">Rate card</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{services.length} configured services</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => patchServices([...services, defaultService(serviceTypes, packageTemplates)])} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              <PlusCircle className="h-4 w-4" />
              Add
            </button>
            <button type="button" disabled={busy === "services"} onClick={() => onSaveServices(normalizedServicesForSave(services))} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
              <Save className="h-4 w-4" />
              Save
            </button>
          </div>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {services.map((service, index) => {
            const packages = servicePackageRows(service);
            return (
              <div key={service._id || service.id || index} className="p-4">
                <div className="grid items-end gap-4 lg:grid-cols-[200px_1fr_150px_auto]">
                  <label className="grid gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Service Type
                    <select value={service.serviceTypeKey || ""} onChange={(event) => updateService(index, "serviceTypeKey", event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                      {serviceTypes.map((type) => <option key={type.key} value={type.key}>{type.label}</option>)}
                      <option value="custom_service">Custom Service</option>
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Service Name
                    <input value={service.serviceName || ""} onChange={(event) => updateService(index, "serviceName", event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" placeholder="Service name" />
                  </label>
                  <label className="grid gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Status
                    <select value={service.status || "active"} onChange={(event) => updateService(index, "status", event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm capitalize dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                      {["active", "draft", "inactive", "archived"].map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </label>
                  <button type="button" onClick={() => patchServices(services.filter((_, serviceIndex) => serviceIndex !== index))} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-950/30" aria-label="Remove service">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <textarea value={service.description || ""} onChange={(event) => updateService(index, "description", event.target.value)} className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" rows={2} placeholder="Description" />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => addPackage(index, packageTemplates[0] || {})} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                    <PlusCircle className="h-3.5 w-3.5" />
                    Add Package
                  </button>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-2 py-2 text-left w-1/2">Package</th>
                        <th className="px-2 py-2 text-left w-[120px]">Qty</th>
                        <th className="px-2 py-2 text-left w-[150px]">Price</th>
                        <th className="px-2 py-2 text-right w-[80px]">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {packages.map((pkg, packageIndex) => (
                        <tr key={pkg._id || pkg.id || packageIndex}>
                          <td className="px-2 py-2">
                            <input value={pkg.packageName || ""} onChange={(event) => updatePackage(index, packageIndex, "packageName", event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" placeholder="Package name" />
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" min="1" value={pkg.quantity ?? 1} onChange={(event) => updatePackage(index, packageIndex, "quantity", Number(event.target.value || 1))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" min="0" value={pkg.price ?? 0} onChange={(event) => updatePackage(index, packageIndex, "price", Number(event.target.value || 0))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                          </td>
                          <td className="px-2 py-2 text-right">
                            <button type="button" onClick={() => removePackage(index, packageIndex)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-950/30" aria-label="Remove package">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
          {!services.length ? (
            <div className="px-4 py-10 text-center text-sm text-slate-500">No services configured.</div>
          ) : null}
        </div>
      </section>

    </div>
  );
}

export default function InfluencerCampaignsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = searchParams.get("tab") || "available";
  const [campaigns, setCampaigns] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [commerceProfile, setCommerceProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [returnTrackingCampaign, setReturnTrackingCampaign] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filters, setFilters] = useState({ search: "", campaignType: "", sort: "newest" });
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  const tab = useMemo(() => TABS.find((item) => item.id === activeTab) ? activeTab : "available", [activeTab]);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (tab === "analytics") {
        const marketplaceResponse = await getCampaignMarketplaceAnalytics();
        setAnalytics({
          marketplace: marketplaceResponse?.data || null,
        });
        return;
      }
      if (tab === "services") {
        const res = await getInfluencerCommerceProfile();
        setCommerceProfile(res?.data || null);
        return;
      }
      const sourceTab = tab;
      const res = await listCampaignMarketplace({ tab: sourceTab, ...filters, limit: sourceTab === tab ? 24 : 100 });
      const rows = res?.data?.items || [];
      if (tab === "delivered-products") {
        setCampaigns(rows.filter(isDeliveredProductCampaign));
        return;
      }
      if (tab === "returned-products") {
        setCampaigns(rows.filter(isReturnedProductCampaign));
        return;
      }
      setCampaigns(rows);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load campaign marketplace.");
    } finally {
      setLoading(false);
    }
  }, [filters, tab]);

  useEffect(() => {
    const timer = window.setTimeout(loadCampaigns, filters.search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [loadCampaigns, filters.search]);

  async function handleApply(campaign) {
    const id = campaignKey(campaign);
    setBusyId(id);
    setError("");
    setMessage("");
    try {
      await applyCampaignMarketplace(id, {
        profileSummary: "Interested in this campaign and ready to submit required deliverables.",
        expectedEarnings: campaign.budget || 0,
      });
      setMessage("Application submitted. Waiting for vendor approval.");
      await loadCampaigns();
    } catch (err) {
      setError(err?.response?.data?.message || "Application failed.");
    } finally {
      setBusyId("");
    }
  }

  async function handleAcceptCampaign(campaign) {
    const id = campaignKey(campaign);
    setBusyId(id);
    setError("");
    setMessage("");
    try {
      await acceptCampaign(id);
      setMessage("Campaign accepted. It moved to Accepted Campaigns.");
      setSelectedCampaign(null);
      await loadCampaigns();
    } catch (err) {
      setError(err?.response?.data?.message || "Campaign acceptance failed.");
    } finally {
      setBusyId("");
    }
  }

  async function handleRejectCampaign(campaign) {
    const note = await requestInput({
      title: "Reject campaign",
      message: "Optional reason: Too Busy, Budget Too Low, Not Relevant, Other",
      label: "Reason",
      required: false,
      confirmLabel: "Reject",
    });
    const id = campaignKey(campaign);
    setBusyId(id);
    setError("");
    setMessage("");
    try {
      await rejectCampaign(id, note || "");
      setMessage("Campaign rejected. It moved to Rejected Campaigns.");
      setSelectedCampaign(null);
      await loadCampaigns();
    } catch (err) {
      setError(err?.response?.data?.message || "Campaign rejection failed.");
    } finally {
      setBusyId("");
    }
  }

  async function handleSave(campaign) {
    const id = campaignKey(campaign);
    setBusyId(id);
    setMessage("");
    try {
      await saveCampaignMarketplace(id, !campaign.saved);
      setMessage(campaign.saved ? "Campaign removed from saved list." : "Campaign saved.");
      await loadCampaigns();
    } catch (err) {
      setError(err?.response?.data?.message || "Save failed.");
    } finally {
      setBusyId("");
    }
  }

  async function handleSubmitDeliverable(campaign) {
    const id = campaignKey(campaign);
    if (!id) return;
    navigate(`/influencer/campaigns/${id}/content`);
  }

  async function handleGenerateLink(campaign) {
    const id = campaignKey(campaign);
    const productIds = campaignProductIds(campaign);
    if (!productIds.length) return;
    setBusyId(id);
    setError("");
    setMessage("");
    try {
      const response = await generateAffiliateProductLinks({
        productIds,
        campaignId: id,
        utmSource: "influencer",
        utmMedium: "campaign",
        utmCampaign: campaign.title || id,
      });
      const firstLink = response?.data?.links?.[0]?.affiliateUrl;
      if (firstLink && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(firstLink);
        setMessage("Affiliate link generated and copied.");
      } else {
        setMessage("Affiliate link generated.");
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Affiliate link generation failed.");
    } finally {
      setBusyId("");
    }
  }

  async function handleSaveServices(services) {
    setBusyId("services");
    setError("");
    setMessage("");
    try {
      const response = await saveInfluencerServices({ services });
      setCommerceProfile(response?.data || null);
      setMessage("Services saved.");
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to save services.");
    } finally {
      setBusyId("");
    }
  }

  async function handleSaveDeliveryAddress(address) {
    setBusyId("delivery-address");
    setError("");
    setMessage("");
    try {
      const response = await saveInfluencerDeliveryAddress(address);
      setCommerceProfile((current) => ({ ...(current || {}), deliveryAddress: response?.data?.deliveryAddress || address }));
      setMessage("Delivery address saved.");
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to save delivery address.");
    } finally {
      setBusyId("");
    }
  }

  async function handleSubmitReturnTracking(campaign, payload) {
    setBusyId("return-tracking");
    setError("");
    setMessage("");
    try {
      await confirmInfluencerProductReturn(campaignKey(campaign), payload);
      setMessage("Return tracking details updated.");
      setReturnTrackingCampaign(null);
      const sourceTab = tab;
      const res = await listCampaignMarketplace({ tab: sourceTab, ...filters, limit: sourceTab === tab ? 24 : 100 });
      setCampaigns(res?.data?.items || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update return tracking.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-200">
              <Megaphone className="h-3.5 w-3.5" />
              Campaign Marketplace
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">Discover, apply, execute, and analyze brand campaigns</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
              {tab === "delivered-products"
                ? "Track campaign products dispatched by vendors and confirm delivery from the campaign execution page."
                : tab === "returned-products"
                  ? "Track campaign products that are in the return workflow after campaign completion."
                  : "Built on the existing campaign, product, content, and commission infrastructure."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/influencer/campaigns?tab=accepted" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              <FileUp className="h-4 w-4" />
              Create Campaign Content
            </Link>
            <Link to="/influencer/campaigns?tab=accepted" className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950">
              <CheckCircle2 className="h-4 w-4" />
              Accepted Campaigns
            </Link>
          </div>
        </div>
      </section>

      {!["analytics", "services"].includes(tab) ? (
        <section className={`grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${tab === "fixed" ? "" : "md:grid-cols-[1fr_220px_180px]"}`}>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Search campaigns, brands, categories..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-indigo-950"
            />
          </label>
          {tab !== "fixed" ? (
            <>
              <select
                value={filters.campaignType}
                onChange={(event) => setFilters((current) => ({ ...current, campaignType: event.target.value }))}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                {CAMPAIGN_TYPES.map(([value, label]) => <option key={label} value={value}>{label}</option>)}
              </select>
              <select
                value={filters.sort}
                onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value }))}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="newest">Newest</option>
                <option value="recommended">Recommended</option>
                <option value="highest_budget">Highest Budget</option>
                <option value="highest_commission">Highest Commission</option>
                <option value="ending_soon">Ending Soon</option>
              </select>
            </>
          ) : null}
        </section>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100">
          {message}
        </div>
      ) : null}

      <CampaignDetailsPanel
        campaign={selectedCampaign}
        onClose={() => setSelectedCampaign(null)}
        onAccept={handleAcceptCampaign}
        onReject={handleRejectCampaign}
        busyId={busyId}
      />

      {tab === "services" ? (
        loading ? (
          <div className="h-80 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800" />
        ) : (
          <ServicesPanel
            commerceProfile={commerceProfile}
            setCommerceProfile={setCommerceProfile}
            busy={busyId}
            onSaveServices={handleSaveServices}
            onSaveDeliveryAddress={handleSaveDeliveryAddress}
          />
        )
      ) : tab === "analytics" ? (
        <AnalyticsPanel analytics={analytics} loading={loading} />
      ) : loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-[360px] animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800" />
          ))}
        </div>
      ) : ["delivered-products", "returned-products"].includes(tab) ? (
        <CampaignProductLogisticsTable
          campaigns={campaigns}
          type={tab === "returned-products" ? "return" : "delivery"}
          onViewDetails={setSelectedCampaign}
          onSubmitDeliverable={handleSubmitDeliverable}
          onProvideReturnTracking={setReturnTrackingCampaign}
        />
      ) : campaigns.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaignKey(campaign)}
              campaign={campaign}
              tab={tab}
              onApply={handleApply}
              onAccept={handleAcceptCampaign}
              onReject={handleRejectCampaign}
              onViewDetails={setSelectedCampaign}
              onSave={handleSave}
              onSubmitDeliverable={handleSubmitDeliverable}
              onGenerateLink={handleGenerateLink}
              busyId={busyId}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
          <ClipboardList className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">No campaigns in this view</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Try another tab or adjust the marketplace filters.</p>
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CalendarClock className="h-5 w-5 text-indigo-500" />
          <h3 className="mt-3 font-semibold text-slate-950 dark:text-white">Workflow</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Applications, deliverables, approvals, and status history stay on existing campaign records.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <ExternalLink className="h-5 w-5 text-indigo-500" />
          <h3 className="mt-3 font-semibold text-slate-950 dark:text-white">Promotion</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Products, links, content, and storefront placements reuse the platform commerce modules.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <BarChart3 className="h-5 w-5 text-indigo-500" />
          <h3 className="mt-3 font-semibold text-slate-950 dark:text-white">Attribution</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Revenue and commission totals come from existing campaign analytics and commission records.</p>
        </div>
      </section>

      {returnTrackingCampaign && (
        <ReturnTrackingModal
          campaign={returnTrackingCampaign}
          onClose={() => setReturnTrackingCampaign(null)}
          onSubmit={(payload) => handleSubmitReturnTracking(returnTrackingCampaign, payload)}
          busy={busyId === "return-tracking"}
        />
      )}
    </div>
  );
}

function ReturnTrackingModal({ campaign, onClose, onSubmit, busy }) {
  const [courier, setCourier] = useState(campaign?.productShipping?.returnCourierCompany || "");
  const [tracking, setTracking] = useState(campaign?.productShipping?.returnTrackingNumber || "");
  const [trackingUrl, setTrackingUrl] = useState(campaign?.productShipping?.returnTrackingUrl || "");
  const [shipDate, setShipDate] = useState(campaign?.productShipping?.returnShipmentDate ? new Date(campaign.productShipping.returnShipmentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
  const [estDate, setEstDate] = useState(campaign?.productShipping?.returnEstimatedDelivery ? new Date(campaign.productShipping.returnEstimatedDelivery).toISOString().split('T')[0] : "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 my-8">
        <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Provide Return Tracking</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Enter the courier details for the returned product.</p>
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Courier Company</label>
            <input type="text" value={courier} onChange={e => setCourier(e.target.value)} placeholder="e.g., FedEx" className="mt-1 block w-full rounded-xl border border-slate-300 p-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tracking Number</label>
            <input type="text" value={tracking} onChange={e => setTracking(e.target.value)} placeholder="Tracking ID" className="mt-1 block w-full rounded-xl border border-slate-300 p-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tracking URL</label>
            <input type="url" value={trackingUrl} onChange={e => setTrackingUrl(e.target.value)} placeholder="https://..." className="mt-1 block w-full rounded-xl border border-slate-300 p-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Dispatch Date</label>
              <input type="date" value={shipDate} onChange={e => setShipDate(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 p-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Estimated Delivery</label>
              <input type="date" value={estDate} onChange={e => setEstDate(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 p-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200 hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={() => onSubmit({ returnCourierCompany: courier, returnTrackingNumber: tracking, returnTrackingUrl: trackingUrl, returnShipmentDate: shipDate, returnEstimatedDelivery: estDate })} disabled={busy || !courier || !tracking || !trackingUrl || !shipDate || !estDate} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-indigo-500">Submit</button>
        </div>
      </div>
    </div>
  );
}
