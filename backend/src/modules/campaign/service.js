const { AppError } = require("../../utils/AppError");
const vendorRepo = require("../../repositories/vendor.repository");
const productRepo = require("../../repositories/product.repository");
const influencerService = require("../influencer/service");
const influencerCommerceEngine = require("../../services/influencer-commerce-engine.service");
const influencerRateCardService = require("../../services/influencer-rate-card.service");
const auditService = require("../../services/audit.service");
const notificationService = require("../../services/notification.service");
const commissionService = require("../commission/service");
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
  WORKFLOW.ACTIVE,
  "product_shipped",
  "content_in_progress",
  "content_submitted",
  "under_review",
  "revision_requested",
  "approved",
  "published",
  "tracking_active",
];
const TERMINAL_STATES = [WORKFLOW.COMPLETED, WORKFLOW.CANCELLED, WORKFLOW.EXPIRED, WORKFLOW.REJECTED];

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
  return campaign.marketplace?.applicationDeadline || campaign.deadline || null;
}

function ensureDeadlineOpen(campaign = {}) {
  const deadline = campaignDeadline(campaign);
  if (deadline && new Date(deadline).getTime() < Date.now()) {
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
        metadata: { title: campaign.title || "", paymentType: campaign.paymentType || "" },
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
    deadline: campaign.deadline || campaign.marketplace?.applicationDeadline || null,
    availableSlots: Number(campaign.marketplace?.availableSlots || 0),
    requiredDeliverables: campaign.marketplace?.requiredDeliverables || [],
    requirements: campaign.marketplace?.requirements || {},
    paymentType: campaign.paymentType,
    paymentModel,
    pricing,
    commissionConfig: campaign.commissionConfig || null,
    commissionWorkflow: campaign.commissionWorkflow || null,
    fixedPaymentWorkflow: campaign.fixedPaymentWorkflow || null,
    influencerRateSnapshot: campaign.influencerRateSnapshot || campaign.contractSnapshot?.influencerRateCard || {},
    requirementsSnapshot: campaign.requirementsSnapshot || campaign.contractSnapshot?.requirements || {},
    invitationStatus: invitation?.status || "",
    invitationDate: invitation?.invitedAt || campaign.createdAt,
    invitedAt: invitation?.invitedAt || campaign.createdAt,
    acceptedAt: invitation?.acceptedAt || acceptance?.acceptedAt || null,
    rejectedAt: invitation?.rejectedAt || null,
    rejectionReason: invitation?.rejectionReason || "",
    timeline: {
      campaignStart: campaign.startDate || campaign.createdAt,
      contentSubmissionDeadline: campaign.marketplace?.requirements?.contentSubmissionDeadline || campaign.deadline || null,
      revisionDeadline: campaign.marketplace?.requirements?.revisionDeadline || null,
      publishingDeadline: campaign.marketplace?.requirements?.publishingDeadline || null,
      campaignEndDate: campaign.deadline || campaign.marketplace?.applicationDeadline || null,
      attributionEndDate: campaign.deadline && campaign.attributionWindowDays
        ? new Date(new Date(campaign.deadline).getTime() + Number(campaign.attributionWindowDays || 0) * 24 * 60 * 60 * 1000)
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
  const and = [];
  const scope = {
    $or: [
      { "marketplace.public": true },
      { influencerId: profileId },
      { "applications.influencerId": profileId },
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
        { state: { $in: [WORKFLOW.ACTIVE, ...ACCEPTED_STATES] }, applications: { $elemMatch: { influencerId: profileId, status: "approved" } } },
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
      $or: [{ influencerId: profileId }, { "applications.influencerId": profileId }],
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
        applicationDeadline: payload.marketplace?.applicationDeadline || payload.deadline,
        availableSlots: payload.marketplace?.availableSlots || 1,
        requiredDeliverables: payload.marketplace?.requiredDeliverables || [],
        requirements: payload.marketplace?.requirements || {},
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
      paymentModelSnapshot: pricing.paymentModel,
      influencerRateSnapshot: pricing.influencerSnapshot,
      requirementsSnapshot: pricing.influencerSnapshot?.requirements || {},
      deadline: payload.deadline,
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
    ensureDeadlineOpen(campaign);
    const subscription = await influencerCommerceEngine.getVendorSubscription(campaign.vendorId);
    if (!subscription) {
      throw new AppError("Vendor subscription must be active before accepting this campaign", 403, "SUBSCRIPTION_REQUIRED");
    }

    const oldStatus = campaign.state;
    const state = WORKFLOW.ACCEPTED;
    const updated = await Campaign.findByIdAndUpdate(
      campaignId,
      {
        $set: {
          state,
          ...(["fixed", "hybrid"].includes(campaign.paymentType)
            ? {
                "fixedPaymentWorkflow.status": "accepted_awaiting_funding",
                "fixedPaymentWorkflow.contentEnabled": false,
                "fixedPaymentWorkflow.acceptedAt": new Date(),
                "fixedPaymentWorkflow.lastTransitionAt": new Date(),
              }
            : {}),
          ...(["commission", "hybrid"].includes(campaign.paymentType)
            ? {
                "commissionWorkflow.contentEnabled": campaign.paymentType === "commission",
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
            requirementsSnapshot: campaign.requirementsSnapshot,
            frozenAt: new Date(),
          },
        },
        $push: {
          history: {
            $each: [pushHistory(state, userId, "Influencer accepted the campaign invitation")],
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
        $set: { status: state, metadata: { subscriptionId: subscription._id, paymentType: updated.paymentType } },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    await CampaignInvitation.findOneAndUpdate(
      { campaignId: updated._id, influencerId: profile._id },
      { $set: { status: state, acceptedAt: new Date() } },
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
    const filter = buildMarketplaceQuery(profile._id, { ...query, tab });

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
