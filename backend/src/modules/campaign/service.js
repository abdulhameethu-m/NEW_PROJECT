const { AppError } = require("../../utils/AppError");
const vendorRepo = require("../../repositories/vendor.repository");
const productRepo = require("../../repositories/product.repository");
const influencerService = require("../influencer/service");
const influencerCommerceEngine = require("../../services/influencer-commerce-engine.service");
const influencerRateCardService = require("../../services/influencer-rate-card.service");
const auditService = require("../../services/audit.service");
const notificationService = require("../../services/notification.service");
const commissionService = require("../commission/service");
const schedulingService = require("../../services/campaign-scheduling.service");
const { emitDomainEvent } = require("../events/event-bus");
const { INFLUENCER_EVENTS } = require("../shared/constants");
const { CommissionRecord } = require("../commission/models");
const {
  Campaign,
  CampaignAcceptance,
  CampaignInvitation,
  CampaignStatusHistory,
} = require("./model");
const { VendorInfluencerRelationship } = require("../influencerCommerce/model");
const { InfluencerProductAssignment } = require("../influencer/model");
const CampaignEscrowWallet = require("../../models/CampaignEscrowWallet");

const WORKFLOW = Object.freeze({
  DRAFT: "draft",
  PROPOSED: "proposed",
  INVITATION_SENT: "invitation_sent",
  INVITATION_PENDING: "invitation_pending",
  INVITATION_EXPIRED: "invitation_expired",
  CONTENT_CREATION: "content_creation",
  UNDER_REVIEW: "under_review",
  READY_FOR_PUBLISH: "ready_for_publish",
  PUBLISH_SCHEDULED: "publish_scheduled",
  LIVE: "live",
  CONTENT_DEADLINE_MISSED: "content_deadline_missed",
  PENDING_REVIEW: "pending_review",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  ACTIVE: "active",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
});

const INVITATION_OPEN_STATES = [WORKFLOW.PROPOSED, WORKFLOW.INVITATION_SENT, WORKFLOW.PENDING_REVIEW];
const ACCEPTED_STATES = [
  WORKFLOW.ACCEPTED,
  WORKFLOW.CONTENT_CREATION,
  WORKFLOW.UNDER_REVIEW,
  WORKFLOW.READY_FOR_PUBLISH,
  WORKFLOW.PUBLISH_SCHEDULED,
  WORKFLOW.LIVE,
  WORKFLOW.ACTIVE,
  "product_shipped",
  "content_in_progress",
  "content_submitted",
  "under_review",
  "revision_requested",
  "partially_completed",
  "approved",
  "published",
  "tracking_active",
];
const TERMINAL_STATES = [WORKFLOW.COMPLETED, WORKFLOW.CANCELLED, WORKFLOW.EXPIRED, WORKFLOW.REJECTED];

const LIFECYCLE = Object.freeze({
  DRAFT: "DRAFT",
  INVITATION_PENDING: "INVITATION_PENDING",
  INVITATION_EXPIRED: "INVITATION_EXPIRED",
  CONTENT_CREATION: "CONTENT_CREATION",
  UNDER_REVIEW: "UNDER_REVIEW",
  READY_FOR_PUBLISH: "READY_FOR_PUBLISH",
  PUBLISH_SCHEDULED: "PUBLISH_SCHEDULED",
  LIVE: "LIVE",
  CONTENT_DEADLINE_MISSED: "CONTENT_DEADLINE_MISSED",
  COMPLETED: "COMPLETED",
  REFUND_PENDING: "REFUND_PENDING",
  REFUNDED: "REFUNDED",
  CANCELLED: "CANCELLED",
});

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + Number(days || 0));
  return next;
}

function lifecycleDays(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

function dateOnly(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function dateOnlyString(value) {
  const date = dateOnly(value);
  return date ? date.toISOString().slice(0, 10) : "";
}

function selectedDeliverablesFromPayload(payload = {}) {
  const rows = [
    ...(Array.isArray(payload.selectedServices) ? payload.selectedServices : []),
    ...(Array.isArray(payload.paymentModel?.selectedServices) ? payload.paymentModel.selectedServices : []),
    ...(Array.isArray(payload.paymentModel?.services) ? payload.paymentModel.services : []),
  ];
  const seen = new Set();
  return rows.filter((row) => {
    const key = [
      row.selectionKey,
      row.serviceId,
      row.packageId,
      row.serviceTypeKey,
      row.serviceName,
      row.packageName,
    ].filter(Boolean).join(":");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function validateDeliverableDueDates(payload, { contentStart, contentDeadline }) {
  const start = dateOnly(contentStart);
  const end = dateOnly(contentDeadline);
  if (!start || !end) return;
  const deliverables = selectedDeliverablesFromPayload(payload);
  for (const deliverable of deliverables) {
    const due = dateOnly(deliverable.dueDate);
    const label = deliverable.packageName || deliverable.serviceName || deliverable.title || "Deliverable";
    if (!due) {
      throw new AppError("Deliverable due date is required", 400, "DELIVERABLE_DUE_DATE_REQUIRED", {
        field: "selectedServices.dueDate",
        deliverable: label,
        allowedStart: dateOnlyString(start),
        allowedEnd: dateOnlyString(end),
      });
    }
    if (due < start || due > end) {
      throw new AppError("Deliverable due date must be within the content creation period", 400, "DELIVERABLE_DUE_DATE_OUT_OF_RANGE", {
        field: "selectedServices.dueDate",
        deliverable: label,
        dueDate: dateOnlyString(due),
        allowedStart: dateOnlyString(start),
        allowedEnd: dateOnlyString(end),
      });
    }
  }
}

function campaignContentCreationEndDate(invitationDeadline, contentCreationDays) {
  const invitationEnd = dateOnly(invitationDeadline);
  if (!invitationEnd) return null;
  return addDays(invitationEnd, lifecycleDays(contentCreationDays, 1));
}

function validateCampaignEndDate(campaignEndDate, { invitationDeadline, contentCreationDays }) {
  if (!campaignEndDate) return null;
  const end = dateOnly(campaignEndDate);
  const contentEnd = campaignContentCreationEndDate(invitationDeadline, contentCreationDays);
  if (!end) {
    throw new AppError("Invalid campaign end date", 400, "VALIDATION_ERROR", { field: "endDate" });
  }
  if (!contentEnd) return end;
  if (end <= contentEnd) {
    throw new AppError(
      "Campaign end date must be after the content creation period",
      400,
      "CAMPAIGN_END_DATE_OUT_OF_RANGE",
      {
        field: "endDate",
        campaignEndDate: dateOnlyString(end),
        contentCreationEndDate: dateOnlyString(contentEnd),
        earliestAllowedDate: dateOnlyString(addDays(contentEnd, 1)),
      }
    );
  }
  return end;
}

async function ensureVendorOwnsProducts(vendorId, productIds = []) {
  const products = await Promise.all(productIds.map((productId) => productRepo.findById(productId)));
  if (products.some((product) => !product)) {
    throw new AppError("One or more campaign products were not found", 404, "NOT_FOUND");
  }
  const invalid = products.find((product) => String(product.sellerId?._id || product.sellerId) !== String(vendorId));
  if (invalid) {
    throw new AppError("Campaign products must belong to the vendor", 403, "FORBIDDEN");
  }
}

function profileUserId(profile = {}) {
  return profile.userId?._id || profile.userId || null;
}

function campaignDeadline(campaign = {}) {
  return campaign.marketplace?.applicationDeadline || null;
}

function endOfInvitationDay(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(23, 59, 59, 999);
  return date;
}

async function ensureDeadlineOpen(campaign = {}, { actorId = null, actorRole = "influencer" } = {}) {
  const deadline = campaign.invitationDeadline || campaignDeadline(campaign);
  const expiresAt = endOfInvitationDay(deadline);
  if (expiresAt && expiresAt.getTime() < Date.now()) {
    await CampaignInvitation.updateMany(
      { campaignId: campaign._id, status: { $in: [WORKFLOW.INVITATION_SENT, "viewed"] } },
      { $set: { status: "expired", "metadata.expiredAt": new Date(), "metadata.expiredReason": "Invitation acceptance deadline passed" } }
    );
    await Campaign.updateOne(
      { _id: campaign._id, state: { $in: INVITATION_OPEN_STATES } },
      {
        $set: {
          state: WORKFLOW.EXPIRED,
          currentLifecycleStatus: LIFECYCLE.INVITATION_EXPIRED,
          "scheduling.expiredAt": new Date(),
          "scheduling.affiliateEnabled": false,
          "scheduling.trackingEnabled": false,
          "scheduling.commissionEnabled": false,
        },
        $push: { history: pushHistory(WORKFLOW.EXPIRED, actorId, "Invitation acceptance deadline passed") },
      }
    );
    await CampaignStatusHistory.create({
      campaignId: campaign._id,
      oldStatus: campaign.state || WORKFLOW.INVITATION_SENT,
      newStatus: WORKFLOW.EXPIRED,
      changedBy: actorId,
      changedByRole: actorRole,
      reason: "Invitation acceptance deadline passed",
      metadata: { invitationDeadline: deadline },
    }).catch(() => null);
    throw new AppError("Campaign invitation deadline has passed", 409, "CAMPAIGN_INVITATION_EXPIRED");
  }
}

async function notifyInfluencerProfile(profile, payload) {
  const userId = profileUserId(profile);
  if (!userId) return null;
  return notificationService.createNotification({
    userId,
    role: "INFLUENCER",
    module: "GROWTH",
    subModule: "INFLUENCER_COMMERCE",
    type: "INFLUENCER_COMMERCE",
    ...payload,
  }).catch(() => null);
}

async function notifyVendorUser(vendorId, payload) {
  return notificationService.notifyVendorUser(vendorId, {
    module: "GROWTH",
    subModule: "INFLUENCER_COMMERCE",
    type: "INFLUENCER_COMMERCE",
    ...payload,
  }).catch(() => null);
}

async function recordStatusChange({ campaign, oldStatus, newStatus, actorId, actorRole, reason = "", metadata = {} }) {
  await CampaignStatusHistory.create({
    campaignId: campaign._id,
    oldStatus: oldStatus || WORKFLOW.DRAFT,
    newStatus,
    changedBy: actorId,
    changedByRole: actorRole,
    reason,
    metadata,
  });
  await auditService.log({
    actor: { _id: actorId, role: actorRole },
    action: "campaign.status.changed",
    entityType: "Campaign",
    entityId: campaign._id,
    metadata: { oldStatus, newStatus, reason, ...metadata },
  }).catch(() => {});
}

async function createInvitationRecord({ campaign, influencerId, actorId }) {
  const now = new Date();
  const deadline = campaign.invitationDeadline || campaign.marketplace?.applicationDeadline || null;
  const invitation = await CampaignInvitation.findOneAndUpdate(
    { campaignId: campaign._id, influencerId },
    {
      $setOnInsert: {
        campaignId: campaign._id,
        vendorId: campaign.vendorId,
        influencerId,
        invitedAt: now,
      },
      $set: {
        status: WORKFLOW.INVITATION_SENT,
        deadline,
        metadata: { title: campaign.title || "", paymentType: campaign.paymentType || "", acceptanceDeadline: deadline },
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );
  await recordStatusChange({
    campaign,
    oldStatus: null,
    newStatus: WORKFLOW.INVITATION_SENT,
    actorId,
    actorRole: "vendor",
    reason: "Campaign invitation sent",
    metadata: { invitationId: invitation._id, influencerId },
  });
  return invitation;
}

async function ensureInfluencerCalendarOpen({ influencerId, windowStart, windowEnd, excludeCampaignId = null }) {
  if (!influencerId || !windowStart || !windowEnd) return;
  const query = {
    influencerId,
    currentLifecycleStatus: {
      $in: [
        LIFECYCLE.INVITATION_PENDING,
        LIFECYCLE.CONTENT_CREATION,
        LIFECYCLE.UNDER_REVIEW,
        LIFECYCLE.READY_FOR_PUBLISH,
        LIFECYCLE.PUBLISH_SCHEDULED,
        LIFECYCLE.LIVE,
      ],
    },
    $or: [
      { invitationSentAt: { $lte: windowEnd }, invitationDeadline: { $gte: windowStart } },
      { contentCreationStartDate: { $lte: windowEnd }, contentCreationDeadline: { $gte: windowStart } },
      { campaignStartedAt: { $lte: windowEnd }, campaignEndDate: { $gte: windowStart } },
    ],
  };
  if (excludeCampaignId) query._id = { $ne: excludeCampaignId };
  const overlap = await Campaign.findOne(query).select("_id title currentLifecycleStatus invitationDeadline contentCreationDeadline campaignEndDate").lean();
  if (overlap) {
    throw new AppError("Influencer calendar is already reserved for an overlapping campaign lifecycle window", 409, "INFLUENCER_CALENDAR_CONFLICT", {
      campaignId: overlap._id,
      status: overlap.currentLifecycleStatus,
    });
  }
}

async function ensureAcceptedWorkflowArtifacts({ campaign, profile, userId }) {
  const now = new Date();
  await Promise.all([
    CampaignInvitation.findOneAndUpdate(
      { campaignId: campaign._id, influencerId: profile._id },
      {
        $setOnInsert: {
          campaignId: campaign._id,
          vendorId: campaign.vendorId,
          influencerId: profile._id,
          invitedAt: campaign.createdAt || now,
        },
        $set: { status: WORKFLOW.ACCEPTED, acceptedAt: now },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    ),
    CampaignAcceptance.findOneAndUpdate(
      { campaignId: campaign._id, influencerId: profile._id },
      {
        $setOnInsert: {
          campaignId: campaign._id,
          vendorId: campaign.vendorId,
          influencerId: profile._id,
          acceptedAt: now,
        },
        $set: { status: WORKFLOW.ACCEPTED, metadata: { paymentType: campaign.paymentType || "" } },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    ),
    VendorInfluencerRelationship.findOneAndUpdate(
      { vendorId: campaign.vendorId, influencerId: profile._id },
      {
        $set: { status: "active", source: "campaign_acceptance", lastActivityAt: now },
        $addToSet: { activeCampaignIds: campaign._id },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    ),
  ]);
  if (campaign.paymentType === "commission") {
    await Campaign.updateOne(
      { _id: campaign._id },
      { $set: { "commissionWorkflow.contentEnabled": true } }
    );
  }
  await auditService.log({
    actor: { _id: userId, role: "influencer" },
    action: "campaign.acceptance.confirmed",
    entityType: "Campaign",
    entityId: campaign._id,
    metadata: { campaignId: String(campaign._id), influencerId: String(profile._id), vendorId: String(campaign.vendorId) },
  }).catch(() => {});
}

function pushHistory(state, actorId, note = "") {
  return {
    state,
    actorId,
    note,
    changedAt: new Date(),
  };
}

async function upsertProductAssignments({ campaign, influencerId, status = "approved", source = "vendor_campaign", actorId = null }) {
  const now = new Date();
  await Promise.all((campaign.productIds || []).map((productId) => InfluencerProductAssignment.findOneAndUpdate(
    { influencerId, productId, campaignId: campaign._id },
    {
      $set: {
        influencerId,
        vendorId: campaign.vendorId,
        productId,
        campaignId: campaign._id,
        status,
        source,
        ...(status === "accepted" ? { acceptedAt: now } : {}),
        ...(status === "approved" || status === "active" ? { approvedAt: now } : {}),
        "metadata.lastActorId": actorId || undefined,
      },
      $setOnInsert: { assignedAt: now },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  )));
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function toPage(value, fallback = 1) {
  return Math.max(1, Math.floor(toNumber(value, fallback)));
}

function toLimit(value, fallback = 12) {
  return Math.min(50, Math.max(1, Math.floor(toNumber(value, fallback))));
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function vendorName(vendor = {}) {
  return vendor?.shopName || vendor?.companyName || vendor?.name || "Brand";
}

function productImage(product = {}) {
  return product?.thumbnail || product?.images?.find((image) => image?.isPrimary)?.url || product?.images?.[0]?.url || "";
}

function getApplication(campaign, profileId) {
  return (campaign.applications || []).find((application) => String(application.influencerId) === String(profileId));
}

function presentCampaign(campaign, profileId) {
  const application = profileId ? getApplication(campaign, profileId) : null;
  const products = (campaign.productIds || []).map((product) => ({
    id: product?._id,
    name: product?.name || "Product",
    image: productImage(product),
    category: product?.category || "",
    description: product?.description || "",
    price: Number(product?.discountPrice || product?.price || 0),
    storeLink: product?.slug ? `/product/${product.slug}` : product?._id ? `/product/${product._id}` : "",
    collectionLink: product?.collectionSlug ? `/collections/${product.collectionSlug}` : "",
    storefrontLink: product?.sellerId?.storeSlug ? `/store/${product.sellerId.storeSlug}` : "",
  }));
  const clicks = Number(campaign.analytics?.clicks || 0);
  const orders = Number(campaign.analytics?.orders || 0);
  const invitation = campaign.invitation || null;
  const acceptance = campaign.acceptance || null;
  const paymentModel = campaign.paymentModelSnapshot || campaign.contractSnapshot?.paymentModel || {};
  const pricing = campaign.pricing || {};
  const campaignState = campaign.state || "";
  const visibleStatus = INVITATION_OPEN_STATES.includes(campaignState)
    ? invitation?.status || application?.status || campaignState
    : application?.status || campaignState || invitation?.status;
  return {
    id: campaign._id,
    _id: campaign._id,
    title: campaign.title || `${vendorName(campaign.vendorId)} campaign`,
    description: campaign.description || "",
    banner: campaign.banner || products[0]?.image || "",
    brandName: vendorName(campaign.vendorId),
    vendorId: campaign.vendorId,
    influencerId: campaign.influencerId,
    marketplacePublic: Boolean(campaign.marketplace?.public),
    campaignType: campaign.campaignType || "affiliate",
    category: campaign.category || products[0]?.category || "General",
    country: campaign.country || "",
    language: campaign.language || "en",
    // A hybrid campaign's vendor funding budget is the escrowed fixed reward.
    // Its commission reserve is a cap, not an amount collected by Razorpay.
    budget: ["fixed", "hybrid"].includes(campaign.paymentType)
      ? Number(pricing.fixedCost || campaign.fixedFee || 0)
      : Number(pricing.totalBudget || campaign.fixedFee || 0),
    fixedFee: Number(campaign.fixedFee || 0),
    commissionType: Number(campaign.fixedFee || 0) > 0 ? "hybrid" : "percentage",
    commissionRate: Number(campaign.commissionPercent || 0),
    commissionPercent: Number(campaign.commissionPercent || 0),
    productIds: products,
    products,
    state: campaign.state,
    status: visibleStatus,
    applicationStatus: application?.status || (String(campaign.influencerId || "") === String(profileId || "") ? campaign.state : ""),
    applicationDate: application?.submittedAt || null,
    expectedEarnings: Number(application?.expectedEarnings || campaign.fixedFee || 0),
    applicationDeadline: campaign.marketplace?.applicationDeadline || campaign.deadline || null,
    deadline: campaign.endDate || campaign.deadline || campaign.marketplace?.applicationDeadline || null,
    lifecycleStatus: campaign.currentLifecycleStatus || null,
    currentLifecycleStatus: campaign.currentLifecycleStatus || null,
    lifecycle: {
      campaignCreatedAt: campaign.campaignCreatedAt || campaign.createdAt,
      invitationSentAt: campaign.invitationSentAt || invitation?.invitedAt || null,
      invitationDeadline: campaign.invitationDeadline || campaign.marketplace?.applicationDeadline || null,
      acceptedAt: campaign.acceptedAt || invitation?.acceptedAt || acceptance?.acceptedAt || null,
      contentCreationStartDate: campaign.contentCreationStartDate || null,
      contentCreationDeadline: campaign.contentCreationDeadline || null,
      publishScheduledAt: campaign.publishScheduledAt || null,
      publishedAt: campaign.publishedAt || null,
      campaignStartedAt: campaign.campaignStartedAt || null,
      campaignEndDate: campaign.campaignEndDate || campaign.endDate || null,
      campaignCompletedAt: campaign.campaignCompletedAt || null,
      campaignDurationDays: campaign.campaignDurationDays || null,
      affiliateEnabled: Boolean(campaign.scheduling?.affiliateEnabled),
      trackingEnabled: Boolean(campaign.scheduling?.trackingEnabled),
      commissionEnabled: Boolean(campaign.scheduling?.commissionEnabled),
    },
    startDate: campaign.startDate || null,
    endDate: campaign.endDate || campaign.deadline || campaign.marketplace?.applicationDeadline || null,
    availableSlots: Number(campaign.marketplace?.availableSlots || 0),
    requiredDeliverables: campaign.marketplace?.requiredDeliverables || [],
    paymentType: campaign.paymentType,
    paymentModel,
    pricing,
    commissionConfig: campaign.commissionConfig || null,
    commissionWorkflow: campaign.commissionWorkflow || null,
    fixedPaymentWorkflow: campaign.fixedPaymentWorkflow || null,
    influencerRateSnapshot: campaign.influencerRateSnapshot || campaign.contractSnapshot?.influencerRateCard || {},
    hasInvitation: Boolean(invitation),
    invitationStatus: invitation?.status || "",
    invitationDate: invitation?.invitedAt || campaign.createdAt,
    invitedAt: invitation?.invitedAt || campaign.createdAt,
    acceptedAt: invitation?.acceptedAt || acceptance?.acceptedAt || null,
    rejectedAt: invitation?.rejectedAt || null,
    rejectionReason: invitation?.rejectionReason || "",
    timeline: {
      campaignStart: campaign.startDate || campaign.createdAt,
      contentSubmissionDeadline: campaign.deadline || campaign.endDate || null,
      revisionDeadline: null,
      publishingDeadline: null,
      campaignEndDate: campaign.endDate || campaign.deadline || campaign.marketplace?.applicationDeadline || null,
      attributionEndDate: (campaign.endDate || campaign.deadline) && campaign.attributionWindowDays
        ? new Date(new Date(campaign.endDate || campaign.deadline).getTime() + Number(campaign.attributionWindowDays || 0) * 24 * 60 * 60 * 1000)
        : null,
    },
    saved: Boolean((campaign.marketplace?.savedBy || []).some((id) => String(id) === String(profileId))),
    analytics: {
      views: Number(campaign.analytics?.views || 0),
      clicks,
      orders,
      revenue: Number(campaign.analytics?.revenue || 0),
      commission: Number(campaign.analytics?.commission || 0),
      ctr: clicks ? Number(((orders / clicks) * 100).toFixed(2)) : 0,
      conversionRate: clicks ? Number(((orders / clicks) * 100).toFixed(2)) : 0,
      engagement: Number(campaign.analytics?.engagement || 0),
    },
    deliverables: (campaign.deliverables || []).filter((item) => !profileId || String(item.influencerId) === String(profileId)),
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  };
}

function buildMarketplaceQuery(profileId, query = {}) {
  const tab = String(query.tab || "available").toLowerCase();
  const acceptedCampaignIds = Array.isArray(query.acceptedCampaignIds) ? query.acceptedCampaignIds : [];
  const and = [];
  const scope = {
    $or: [
      { "marketplace.public": true },
      { influencerId: profileId },
      { "applications.influencerId": profileId },
      ...(acceptedCampaignIds.length ? [{ _id: { $in: acceptedCampaignIds } }] : []),
    ],
  };
  and.push(scope);

  if (tab === "available" || tab === "recommended") {
    and.push({ "marketplace.public": true });
    and.push({ influencerId: { $ne: profileId } });
    and.push({ state: { $nin: TERMINAL_STATES } });
    and.push({ applications: { $not: { $elemMatch: { influencerId: profileId } } } });
  }
  if (tab === "invitations" || tab === "invitation" || tab === "applied") {
    and.push({ influencerId: profileId, state: { $in: INVITATION_OPEN_STATES } });
  }
  if (tab === "accepted" || tab === "active") {
    and.push({
      $or: [
        { influencerId: profileId, state: { $in: ACCEPTED_STATES } },
        { state: { $in: [WORKFLOW.ACTIVE, ...ACCEPTED_STATES] }, applications: { $elemMatch: { influencerId: profileId, status: { $in: ["approved", WORKFLOW.ACCEPTED, WORKFLOW.ACTIVE] } } } },
        ...(acceptedCampaignIds.length ? [{ _id: { $in: acceptedCampaignIds }, state: { $in: ACCEPTED_STATES } }] : []),
      ],
    });
  }
  if (tab === "rejected") {
    and.push({
      $or: [
        { influencerId: profileId, state: WORKFLOW.REJECTED },
        { applications: { $elemMatch: { influencerId: profileId, status: "rejected" } } },
      ],
    });
  }
  if (tab === "completed") {
    and.push({
      state: "completed",
      $or: [
        { influencerId: profileId },
        { "applications.influencerId": profileId },
        ...(acceptedCampaignIds.length ? [{ _id: { $in: acceptedCampaignIds } }] : []),
      ],
    });
  }

  if (query.category) and.push({ category: String(query.category) });
  if (query.campaignType) and.push({ campaignType: String(query.campaignType) });
  if (query.country) and.push({ country: String(query.country) });
  if (query.language) and.push({ language: String(query.language) });
  if (query.minBudget || query.maxBudget) {
    const fixedFee = {};
    if (query.minBudget) fixedFee.$gte = toNumber(query.minBudget);
    if (query.maxBudget) fixedFee.$lte = toNumber(query.maxBudget);
    and.push({ fixedFee });
  }
  if (query.search) {
    const search = new RegExp(escapeRegex(query.search), "i");
    and.push({ $or: [{ title: search }, { description: search }, { category: search }] });
  }

  return and.length ? { $and: and } : {};
}

function marketplaceSort(sort = "") {
  if (sort === "highest_budget") return { fixedFee: -1, createdAt: -1 };
  if (sort === "highest_commission") return { commissionPercent: -1, fixedFee: -1 };
  if (sort === "ending_soon") return { "marketplace.applicationDeadline": 1, deadline: 1 };
  if (sort === "trending" || sort === "recommended") return { "analytics.revenue": -1, "analytics.clicks": -1, createdAt: -1 };
  return { createdAt: -1 };
}

class CampaignService {
  async create(userId, payload = {}) {
    const vendor = await vendorRepo.findByUserId(userId);
    if (!vendor) throw new AppError("Vendor profile not found", 404, "VENDOR_NOT_FOUND");
    const influencer = await influencerService.getProfileById(payload.influencerId);
    await influencerCommerceEngine.enforceCampaignLimit(vendor._id);

    await ensureVendorOwnsProducts(vendor._id, payload.productIds);
    const pricing = await influencerRateCardService.calculateCampaignPricing({
      vendorId: vendor._id,
      influencerId: influencer._id,
      payload,
    });
    const schedule = await schedulingService.normalizeCampaignSchedule(payload, pricing.paymentType);
    const settings = await schedulingService.getSettings();
    const createdAt = new Date();
    const invitationDays = lifecycleDays(payload.invitationDays || payload.lifecycle?.invitationDays, settings.invitationAcceptanceDays);
    const contentCreationDays = lifecycleDays(payload.contentCreationDays || payload.lifecycle?.contentCreationDays, settings.contentCreationDays);
    const campaignDurationDays = lifecycleDays(payload.campaignDurationDays || payload.lifecycle?.campaignDurationDays || payload.durationDays, settings.defaultCampaignDurationDays);
    const invitationDeadline = payload.marketplace?.applicationDeadline ? new Date(payload.marketplace.applicationDeadline) : addDays(createdAt, invitationDays);
    const contentCreationStart = dateOnly(invitationDeadline) < dateOnly(createdAt) ? createdAt : invitationDeadline;
    const plannedContentCreationDeadline = addDays(contentCreationStart, contentCreationDays);
    if (payload.influencerId && !invitationDeadline) {
      throw new AppError("Invitation acceptance date is required for invite-only campaigns", 400, "INVITATION_DEADLINE_REQUIRED", { field: "marketplace.applicationDeadline" });
    }
    validateDeliverableDueDates(payload, {
      contentStart: contentCreationStart,
      contentDeadline: plannedContentCreationDeadline,
    });
    validateCampaignEndDate(schedule.endDate || payload.endDate || payload.deadline, {
      invitationDeadline,
      contentCreationDays,
    });
    await ensureInfluencerCalendarOpen({
      influencerId: influencer._id,
      windowStart: createdAt,
      windowEnd: invitationDeadline,
    });

    const requiresFunding = ["fixed", "hybrid"].includes(pricing.paymentType);
    const initialState = WORKFLOW.INVITATION_SENT;
    const campaign = await Campaign.create({
      vendorId: vendor._id,
      influencerId: influencer._id,
      title: payload.title || "",
      description: payload.description || "",
      banner: payload.banner || "",
      campaignType: pricing.campaignType || payload.campaignType || "affiliate",
      category: payload.category || "",
      country: payload.country || "",
      language: payload.language || "en",
      marketplace: {
        public: Boolean(payload.marketplace?.public),
        applicationDeadline: invitationDeadline || undefined,
        availableSlots: payload.marketplace?.availableSlots || 1,
        requiredDeliverables: payload.marketplace?.requiredDeliverables || [],
        assets: payload.marketplace?.assets || [],
      },
      productIds: payload.productIds,
      commissionPercent: pricing.commissionPercentage,
      fixedFee: pricing.fixedFee,
      paymentType: pricing.paymentType,
      ...(requiresFunding
        ? {
            fixedPaymentWorkflow: {
              status: "awaiting_acceptance",
              contentEnabled: false,
              lastTransitionAt: new Date(),
            },
          }
        : {}),
      ...(["commission", "hybrid"].includes(pricing.paymentType)
        ? {
            commissionWorkflow: {
              contentEnabled: false,
              publishEnabled: false,
              trackingActive: false,
              autoStopEnabled: payload.paymentModel?.autoStopEnabled ?? payload.payment?.autoStopEnabled ?? true,
            },
          }
        : {}),
      attributionWindowDays: pricing.attributionDays,
      pricing: pricing.pricing,
      startDate: undefined,
      endDate: schedule.endDate || payload.deadline || undefined,
      scheduling: {
        ...(schedule.scheduling || {}),
        autoPublishEnabled: Boolean(schedule.scheduling?.settingsSnapshot?.autoPublish),
        affiliateEnabled: false,
        trackingEnabled: false,
        commissionEnabled: false,
      },
      campaignCreatedAt: createdAt,
      invitationSentAt: createdAt,
      invitationDeadline,
      campaignDurationDays,
      lifecycleConfig: {
        invitationAcceptanceDays: invitationDays,
        contentCreationDays,
        campaignDurationDays,
      },
      currentLifecycleStatus: LIFECYCLE.INVITATION_PENDING,
      paymentModelSnapshot: pricing.paymentModel,
      influencerRateSnapshot: pricing.influencerSnapshot,
      deadline: schedule.endDate || payload.deadline,
      state: initialState,
      history: [pushHistory(initialState, userId, "Campaign invitation sent by vendor")],
    });
    await influencerRateCardService.attachCampaignPricing(campaign, pricing);
    await commissionService.ensureCampaignCommissionConfiguration(campaign, payload, pricing, { _id: userId, role: "vendor" });
    await createInvitationRecord({ campaign, influencerId: influencer._id, actorId: userId });
    await notifyInfluencerProfile(influencer, {
      title: "Campaign invitation",
      message: `${vendorName(vendor)} invited you to review ${campaign.title || "a campaign"}.`,
      referenceId: campaign._id,
      meta: { campaignId: String(campaign._id), vendorId: String(vendor._id), invitationStatus: WORKFLOW.INVITATION_SENT },
    });
    await auditService.log({
      actor: { _id: userId, role: "vendor" },
      action: "campaign.invitation.sent",
      entityType: "CampaignInvitation",
      entityId: campaign._id,
      metadata: { campaignId: String(campaign._id), influencerId: String(influencer._id), vendorId: String(vendor._id) },
    }).catch(() => {});
    await influencerCommerceEngine.ensureCampaignBudgetControl(campaign, pricing.budgetValue || payload.budget || campaign.fixedFee || 0);
    return campaign;
  }

  async accept(userId, campaignId) {
    const profile = await influencerService.getProfile(userId);
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) throw new AppError("Campaign not found", 404, "NOT_FOUND");
    if (String(campaign.influencerId) !== String(profile._id)) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    if (ACCEPTED_STATES.includes(campaign.state)) {
      await ensureAcceptedWorkflowArtifacts({ campaign, profile, userId });
      return campaign;
    }
    if (!INVITATION_OPEN_STATES.includes(campaign.state)) {
      throw new AppError("Campaign cannot be accepted in the current state", 400, "INVALID_STATE");
    }
    const invitation = await CampaignInvitation.findOne({ campaignId: campaign._id, influencerId: profile._id }).lean();
    if (invitation && ["expired", "cancelled", "rejected"].includes(String(invitation.status || ""))) {
      throw new AppError("Campaign invitation is no longer available", 409, "CAMPAIGN_INVITATION_UNAVAILABLE");
    }
    await ensureDeadlineOpen(campaign, { actorId: userId, actorRole: "influencer" });
    const subscription = await influencerCommerceEngine.getVendorSubscription(campaign.vendorId);
    if (!subscription) {
      throw new AppError("Vendor subscription must be active before accepting this campaign", 403, "SUBSCRIPTION_REQUIRED");
    }

    const oldStatus = campaign.state;
    const state = WORKFLOW.CONTENT_CREATION;
    const acceptedAt = new Date();
    const settings = await schedulingService.getSettings();
    const contentCreationDays = lifecycleDays(
      campaign.lifecycleConfig?.contentCreationDays,
      settings.contentCreationDays
    );
    const contentCreationDeadline = addDays(acceptedAt, contentCreationDays);
    const updated = await Campaign.findByIdAndUpdate(
      campaignId,
      {
        $set: {
          state,
          acceptedAt,
          contentCreationStartDate: acceptedAt,
          contentCreationDeadline,
          currentLifecycleStatus: LIFECYCLE.CONTENT_CREATION,
          "scheduling.affiliateEnabled": false,
          "scheduling.trackingEnabled": false,
          "scheduling.commissionEnabled": false,
          ...(["fixed", "hybrid"].includes(campaign.paymentType)
            ? {
                "fixedPaymentWorkflow.status": "accepted_awaiting_funding",
                "fixedPaymentWorkflow.contentEnabled": false,
                "fixedPaymentWorkflow.acceptedAt": acceptedAt,
                "fixedPaymentWorkflow.lastTransitionAt": acceptedAt,
              }
            : {}),
          ...(["commission", "hybrid"].includes(campaign.paymentType)
            ? {
                "commissionWorkflow.contentEnabled": true,
                "commissionWorkflow.publishEnabled": false,
                "commissionWorkflow.trackingActive": false,
              }
            : {}),
          termsFrozen: {
            commissionPercent: campaign.commissionPercent,
            fixedFee: campaign.fixedFee,
            productIds: campaign.productIds,
            deadline: campaign.deadline,
            paymentType: campaign.paymentType,
            attributionWindowDays: campaign.attributionWindowDays,
            pricing: campaign.pricing,
            paymentModelSnapshot: campaign.paymentModelSnapshot,
            influencerRateSnapshot: campaign.influencerRateSnapshot,
            frozenAt: acceptedAt,
          },
        },
        $push: {
          history: {
            $each: [pushHistory(state, userId, "Influencer accepted the campaign invitation; content creation period started")],
          },
        },
      },
      { returnDocument: "after" }
    );

    const acceptance = await CampaignAcceptance.findOneAndUpdate(
      { campaignId: updated._id, influencerId: profile._id },
      {
        $setOnInsert: {
          campaignId: updated._id,
          vendorId: updated.vendorId,
          influencerId: profile._id,
          acceptedAt: new Date(),
        },
        $set: { status: WORKFLOW.ACCEPTED, metadata: { subscriptionId: subscription._id, paymentType: updated.paymentType, contentCreationDeadline } },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    await CampaignInvitation.findOneAndUpdate(
      { campaignId: updated._id, influencerId: profile._id },
      { $set: { status: WORKFLOW.ACCEPTED, acceptedAt: new Date(), "metadata.contentCreationDeadline": contentCreationDeadline } },
      { upsert: false }
    );
    await VendorInfluencerRelationship.findOneAndUpdate(
      { vendorId: updated.vendorId, influencerId: profile._id },
      {
        $set: { status: "active", source: "campaign_acceptance", lastActivityAt: new Date() },
        $addToSet: { activeCampaignIds: updated._id },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    await upsertProductAssignments({ campaign: updated, influencerId: updated.influencerId, status: "accepted", source: "influencer_acceptance", actorId: userId });
    const locked = await influencerRateCardService.lockCampaignContract(updated._id, {
      influencerId: updated.influencerId,
      actorId: userId,
      source: "influencer_acceptance",
    });
    await recordStatusChange({
      campaign: updated,
      oldStatus,
      newStatus: state,
      actorId: userId,
      actorRole: "influencer",
      reason: "Influencer accepted campaign invitation",
      metadata: { acceptanceId: acceptance._id, influencerId: String(profile._id), vendorId: String(updated.vendorId) },
    });
    await notifyVendorUser(updated.vendorId, {
      title: "Campaign accepted",
      message: `${profile.displayName || profile.userId?.name || "Creator"} accepted ${updated.title || "your campaign"}.${["fixed", "hybrid"].includes(updated.paymentType) ? " Escrow funding is now required." : ""}`,
      referenceId: updated._id,
      meta: { campaignId: String(updated._id), influencerId: String(profile._id), status: state },
    });

    await emitDomainEvent(INFLUENCER_EVENTS.CAMPAIGN_ACTIVATED, {
      campaignId: updated._id,
      influencerId: updated.influencerId,
      vendorId: updated.vendorId,
    });

    return locked;
  }

  async reject(userId, campaignId, note = "") {
    const profile = await influencerService.getProfile(userId);
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) throw new AppError("Campaign not found", 404, "NOT_FOUND");
    if (String(campaign.influencerId) !== String(profile._id)) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    if (!INVITATION_OPEN_STATES.includes(campaign.state)) {
      throw new AppError("Only open campaign invitations can be declined", 400, "INVALID_STATE");
    }

    const oldStatus = campaign.state;
    const updated = await Campaign.findByIdAndUpdate(
      campaignId,
      {
        $set: { state: WORKFLOW.REJECTED },
        $push: {
          history: {
            $each: [pushHistory(WORKFLOW.REJECTED, userId, note || "Influencer rejected the campaign invitation")],
          },
        },
      },
      { returnDocument: "after" }
    );
    await CampaignInvitation.findOneAndUpdate(
      { campaignId: updated._id, influencerId: profile._id },
      { $set: { status: WORKFLOW.REJECTED, rejectedAt: new Date(), rejectionReason: note || "" } },
      { upsert: false }
    );
    await VendorInfluencerRelationship.findOneAndUpdate(
      { vendorId: updated.vendorId, influencerId: profile._id },
      { $set: { status: "invited", source: "campaign_rejection", lastActivityAt: new Date() } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    await recordStatusChange({
      campaign: updated,
      oldStatus,
      newStatus: WORKFLOW.REJECTED,
      actorId: userId,
      actorRole: "influencer",
      reason: note || "Influencer rejected campaign invitation",
      metadata: { influencerId: String(profile._id), vendorId: String(updated.vendorId) },
    });
    await notifyVendorUser(updated.vendorId, {
      title: "Campaign rejected",
      message: `${profile.displayName || profile.userId?.name || "Creator"} rejected ${updated.title || "your campaign"}.`,
      referenceId: updated._id,
      meta: { campaignId: String(updated._id), influencerId: String(profile._id), status: WORKFLOW.REJECTED, reason: note || "" },
    });
    return updated;
  }

  async listForVendor(userId) {
    const vendor = await vendorRepo.findByUserId(userId);
    if (!vendor) throw new AppError("Vendor profile not found", 404, "VENDOR_NOT_FOUND");
    return await Campaign.find({ vendorId: vendor._id })
      .populate({ path: "influencerId", populate: { path: "userId", select: "name email phone" } })
      .populate("productIds", "name")
      .sort({ createdAt: -1 });
  }

  async listForInfluencer(userId) {
    const profile = await influencerService.getProfile(userId);
    return await Campaign.find({ $or: [{ influencerId: profile._id }, { "applications.influencerId": profile._id }] })
      .populate("productIds", "name")
      .populate("vendorId", "shopName companyName")
      .sort({ createdAt: -1 });
  }

  async listMarketplace(userId, query = {}) {
    const profile = await influencerService.getProfile(userId);
    const page = toPage(query.page);
    const limit = toLimit(query.limit);
    const skip = (page - 1) * limit;
    const tab = String(query.tab || "available").toLowerCase();
    const acceptedCampaignIds = ["accepted", "active", "completed"].includes(tab)
      ? (await CampaignAcceptance.find({ influencerId: profile._id, status: { $in: [WORKFLOW.ACCEPTED, WORKFLOW.ACTIVE] } }).select("campaignId").lean()).map((row) => row.campaignId).filter(Boolean)
      : [];
    const filter = buildMarketplaceQuery(profile._id, { ...query, tab, acceptedCampaignIds });

    const [items, total] = await Promise.all([
      Campaign.find(filter)
        .populate({ path: "productIds", select: "name slug description category price discountPrice images thumbnail sellerId", populate: { path: "sellerId", select: "storeSlug shopName companyName" } })
        .populate("vendorId", "shopName companyName logoUrl")
        .sort(marketplaceSort(query.sort || tab))
        .skip(skip)
        .limit(limit)
        .lean(),
      Campaign.countDocuments(filter),
    ]);
    const campaignIds = items.map((campaign) => campaign._id);
    const [invitations, acceptances] = campaignIds.length
      ? await Promise.all([
        CampaignInvitation.find({ campaignId: { $in: campaignIds }, influencerId: profile._id }).lean(),
        CampaignAcceptance.find({ campaignId: { $in: campaignIds }, influencerId: profile._id }).lean(),
      ])
      : [[], []];
    const invitationMap = new Map(invitations.map((row) => [String(row.campaignId), row]));
    const acceptanceMap = new Map(acceptances.map((row) => [String(row.campaignId), row]));

    const rows = items.map((item) => {
      item.invitation = invitationMap.get(String(item._id)) || null;
      item.acceptance = acceptanceMap.get(String(item._id)) || null;
      const row = presentCampaign(item, profile._id);
      if (tab === "recommended") {
        const categoryMatch = profile.categories?.some((category) => String(category).toLowerCase() === String(row.category).toLowerCase());
        row.recommendationScore = Math.min(98, Math.round(58 + row.commissionRate * 0.8 + (categoryMatch ? 18 : 0) + row.analytics.conversionRate));
        row.matchPercentage = row.recommendationScore;
        row.successProbability = Math.min(95, Math.round(row.recommendationScore * 0.82));
      }
      return row;
    });

    return {
      items: rows,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
    };
  }

  async apply(userId, campaignId, payload = {}) {
    const profile = await influencerService.getProfile(userId);
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) throw new AppError("Campaign not found", 404, "NOT_FOUND");
    if (["completed", "cancelled"].includes(campaign.state)) {
      throw new AppError("Campaign is not open for applications", 400, "INVALID_STATE");
    }

    const existing = campaign.applications.find((application) => String(application.influencerId) === String(profile._id));
    const application = {
      influencerId: profile._id,
      status: "submitted",
      profileSummary: payload.profileSummary || profile.bio || "",
      audienceStats: payload.audienceStats || {},
      portfolio: payload.portfolio || "",
      attachments: payload.attachments || [],
      expectedEarnings: toNumber(payload.expectedEarnings, campaign.fixedFee || 0),
      submittedAt: new Date(),
    };

    if (existing) {
      Object.assign(existing, application);
    } else {
      campaign.applications.push(application);
    }
    campaign.history.push(pushHistory("submitted", userId, "Influencer applied to campaign"));
    await campaign.save();
    return presentCampaign(await Campaign.findById(campaign._id).populate("productIds", "name category price discountPrice images thumbnail").populate("vendorId", "shopName companyName logoUrl").lean(), profile._id);
  }

  async saveMarketplaceCampaign(userId, campaignId, saved = true) {
    const profile = await influencerService.getProfile(userId);
    const update = saved
      ? { $addToSet: { "marketplace.savedBy": profile._id } }
      : { $pull: { "marketplace.savedBy": profile._id } };
    const campaign = await Campaign.findByIdAndUpdate(campaignId, update, { returnDocument: "after" })
      .populate("productIds", "name category price discountPrice images thumbnail")
      .populate("vendorId", "shopName companyName logoUrl")
      .lean();
    if (!campaign) throw new AppError("Campaign not found", 404, "NOT_FOUND");
    return presentCampaign(campaign, profile._id);
  }

  async submitDeliverable(userId, campaignId, payload = {}) {
    const profile = await influencerService.getProfile(userId);
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) throw new AppError("Campaign not found", 404, "NOT_FOUND");
    const allowed =
      String(campaign.influencerId || "") === String(profile._id) ||
      campaign.applications.some((application) => String(application.influencerId) === String(profile._id) && ["approved", "shortlisted", "submitted"].includes(application.status));
    if (!allowed) throw new AppError("Apply to the campaign before submitting deliverables", 403, "FORBIDDEN");

    campaign.deliverables.push({
      influencerId: profile._id,
      type: payload.type || "video",
      title: payload.title || "",
      dueDate: payload.dueDate || undefined,
      contentId: payload.contentId || undefined,
      status: "submitted",
      notes: payload.notes || "",
      submittedAt: new Date(),
    });
    campaign.history.push(pushHistory("submitted", userId, "Campaign deliverable submitted"));
    await campaign.save();
    return presentCampaign(await Campaign.findById(campaign._id).populate("productIds", "name category price discountPrice images thumbnail").populate("vendorId", "shopName companyName logoUrl").lean(), profile._id);
  }

  async marketplaceAnalytics(userId, query = {}) {
    const profile = await influencerService.getProfile(userId);
    const campaigns = await Campaign.find({
      $or: [{ influencerId: profile._id }, { "applications.influencerId": profile._id }],
    })
      .select("_id title vendorId campaignType category analytics state createdAt")
      .populate("vendorId", "shopName companyName")
      .lean();
    const campaignIds = campaigns.map((campaign) => campaign._id);
    const records = campaignIds.length
      ? await CommissionRecord.find({ influencerId: profile._id, campaignId: { $in: campaignIds } }).lean()
      : [];
    const byCampaign = records.reduce((map, record) => {
      const key = String(record.campaignId);
      const current = map.get(key) || { revenue: 0, commission: 0, orders: 0 };
      current.revenue += Number(record.gross || 0);
      current.commission += Number(record.influencerShare || 0);
      current.orders += 1;
      map.set(key, current);
      return map;
    }, new Map());

    const rows = campaigns.map((campaign) => {
      const earned = byCampaign.get(String(campaign._id)) || {};
      const clicks = Number(campaign.analytics?.clicks || 0);
      const orders = Number(earned.orders || campaign.analytics?.orders || 0);
      return {
        id: campaign._id,
        title: campaign.title || `${vendorName(campaign.vendorId)} campaign`,
        brandName: vendorName(campaign.vendorId),
        campaignType: campaign.campaignType,
        category: campaign.category,
        state: campaign.state,
        clicks,
        orders,
        revenue: Number(earned.revenue || campaign.analytics?.revenue || 0),
        commission: Number(earned.commission || campaign.analytics?.commission || 0),
        conversionRate: clicks ? Number(((orders / clicks) * 100).toFixed(2)) : 0,
        createdAt: campaign.createdAt,
      };
    });

    const totals = rows.reduce(
      (sum, row) => ({
        revenue: sum.revenue + row.revenue,
        commission: sum.commission + row.commission,
        orders: sum.orders + row.orders,
        clicks: sum.clicks + row.clicks,
      }),
      { revenue: 0, commission: 0, orders: 0, clicks: 0 }
    );
    totals.conversionRate = totals.clicks ? Number(((totals.orders / totals.clicks) * 100).toFixed(2)) : 0;

    return {
      totals,
      rows,
      filters: {
        dateRange: query.dateRange || "30d",
      },
    };
  }

  async listAll() {
    return await Campaign.find({})
      .populate("productIds", "name")
      .populate("vendorId", "shopName companyName")
      .populate({ path: "influencerId", populate: { path: "userId", select: "name email" } })
      .sort({ createdAt: -1 });
  }
}

module.exports = new CampaignService();
module.exports.__private__ = {
  campaignContentCreationEndDate,
  validateCampaignEndDate,
};
