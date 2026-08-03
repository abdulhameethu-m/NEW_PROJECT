const mongoose = require("mongoose");
const vendorRepo = require("../repositories/vendor.repository");
const influencerService = require("../modules/influencer/service");
const auditService = require("./audit.service");
const notificationService = require("./notification.service");
const { AppError } = require("../utils/AppError");
const { Campaign } = require("../modules/campaign/model");
const { InfluencerBusinessProfile, InfluencerProfile } = require("../modules/influencer/model");
const { UserAddress } = require("../models/UserAddress");
const CampaignProductShipment = require("../models/CampaignProductShipment");

function objectId(value) {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
}

function present(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function compactAddress(address = {}) {
  const normalized = {
    name: address.name || address.legalName || address.businessName || "",
    phone: address.phone || "",
    addressLine1: address.addressLine1 || address.addressLine || address.address1 || address.address || "",
    addressLine2: address.addressLine2 || address.address2 || "",
    district: address.district || "",
    city: address.city || "",
    state: address.state || "",
    postalCode: address.postalCode || address.pincode || "",
    country: address.country || "India",
  };
  return Object.fromEntries(Object.entries(normalized).filter(([, value]) => present(value)));
}

function hasUsableAddress(address = {}) {
  return Boolean(address.addressLine1 || address.addressLine || address.address1 || address.address || address.city || address.postalCode || address.pincode);
}

function addressBookSnapshot(address = {}) {
  return compactAddress({
    name: address.name,
    phone: address.phone,
    addressLine1: address.addressLine,
    district: address.district,
    city: address.city,
    state: address.state,
    postalCode: address.pincode,
    country: address.country,
  });
}

function vendorReturnAddress(vendor = {}, payload = {}) {
  if (hasUsableAddress(payload.returnAddressSnapshot)) return compactAddress(payload.returnAddressSnapshot);
  const pickupLocations = Array.isArray(vendor.pickupLocations) ? vendor.pickupLocations : [];
  const pickup = pickupLocations.find((item) => item.isDefault) || pickupLocations[0] || vendor.pickupAddress;
  if (hasUsableAddress(pickup)) return compactAddress({ name: pickup.name || vendor.shopName || vendor.companyName, phone: pickup.phone || vendor.supportPhone, ...pickup });
  return compactAddress({
    name: vendor.shopName || vendor.companyName,
    phone: vendor.supportPhone,
    addressLine1: vendor.address,
    country: "India",
  });
}

async function influencerDeliveryAddress(influencerId, payload = {}) {
  const explicitAddressId = objectId(payload.influencerAddressId);
  if (hasUsableAddress(payload.deliveryAddressSnapshot)) {
    return {
      address: compactAddress(payload.deliveryAddressSnapshot),
      addressId: explicitAddressId || undefined,
    };
  }

  const profile = await InfluencerProfile.findById(influencerId).select("userId displayName").lean();
  if (profile?.userId) {
    const address = explicitAddressId
      ? await UserAddress.findOne({ _id: explicitAddressId, userId: profile.userId }).lean()
      : await UserAddress.findOne({ userId: profile.userId }).sort({ isDefault: -1, createdAt: -1 }).lean();
    if (address && hasUsableAddress(address)) {
      return { address: addressBookSnapshot(address), addressId: address._id };
    }
  }

  const business = await InfluencerBusinessProfile.findOne({ influencerId }).sort({ updatedAt: -1 }).lean();
  if (business && hasUsableAddress(business)) {
    return {
      address: compactAddress({
      name: business.legalName || business.businessName,
      address1: business.address1,
      address2: business.address2,
      city: business.city,
      state: business.state,
      postalCode: business.postalCode,
      phone: business.phone,
      country: business.country,
      }),
      addressId: explicitAddressId || undefined,
    };
  }
  return { address: {}, addressId: explicitAddressId || undefined };
}

function timeline(status, label, actorId, actorRole, note = "") {
  return { status, label, note, actorId, actorRole, at: new Date() };
}

function normalizeDate(value) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function campaignTitle(campaign = {}) {
  return campaign?.title || campaign?.campaignName || "Campaign";
}

function influencerName(influencer = {}) {
  return influencer?.displayName || influencer?.userId?.name || influencer?.userId?.email || "Influencer";
}

function productName(product = {}) {
  return product?.name || product?.title || product?.productName || "Product";
}

function shipmentSummary(row) {
  if (!row) return { productRequired: false };
  return {
    id: row._id,
    campaignId: row.campaignId,
    productRequired: row.productRequired,
    returnRequired: row.returnRequired,
    shipmentStatus: row.shipmentStatus,
    courierCompany: row.courierCompany,
    trackingNumber: row.trackingNumber,
    trackingUrl: row.trackingUrl,
    shipmentDate: row.shipmentDate,
    estimatedDelivery: row.estimatedDelivery,
    shippingCost: row.shippingCost,
    packageWeight: row.packageWeight,
    packageDimensions: row.packageDimensions || {},
    notes: row.notes,
    deliveredAt: row.deliveredAt,
    receivedAt: row.receivedAt,
    deliveryAddressSnapshot: row.deliveryAddressSnapshot || {},
    returnAddressSnapshot: row.returnAddressSnapshot || {},
    returnCourierCompany: row.returnCourierCompany,
    returnTrackingNumber: row.returnTrackingNumber,
    returnTrackingUrl: row.returnTrackingUrl,
    returnShipmentDate: row.returnShipmentDate,
    returnEstimatedDelivery: row.returnEstimatedDelivery,
    returnNotes: row.returnNotes,
    timeline: row.timeline || [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function logisticsSummary(row) {
  const summary = shipmentSummary(row);
  const campaign = row?.campaignId && typeof row.campaignId === "object" ? row.campaignId : {};
  const influencer = row?.influencerId && typeof row.influencerId === "object" ? row.influencerId : {};
  const products = Array.isArray(row?.productIds) ? row.productIds : [];
  return {
    ...summary,
    campaign: {
      id: campaign._id || row?.campaignId,
      title: campaignTitle(campaign),
      state: campaign.state || "",
      startDate: campaign.startDate || null,
      endDate: campaign.endDate || null,
    },
    influencer: {
      id: influencer._id || row?.influencerId,
      name: influencerName(influencer),
      username: influencer?.userId?.username || "",
      email: influencer?.userId?.email || "",
    },
    products: products.map((product) => ({
      id: product?._id || product,
      name: productName(product),
      sku: product?.sku || product?.productCode || "",
    })),
  };
}

function buildSearchFilter(search = "") {
  const value = String(search || "").trim();
  if (!value) return null;
  const regex = new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  return (row) => {
    const searchable = [
      row.campaign?.title,
      row.influencer?.name,
      row.influencer?.email,
      ...(row.products || []).map((product) => `${product.name} ${product.sku}`),
      row.courierCompany,
      row.trackingNumber,
      row.returnCourierCompany,
      row.returnTrackingNumber,
      row.shipmentStatus,
    ].join(" ");
    return regex.test(searchable);
  };
}

function paginate(rows = [], query = {}) {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.max(1, Math.min(100, Number(query.limit || 20)));
  const total = rows.length;
  return {
    items: rows.slice((page - 1) * limit, page * limit),
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

const DELIVERY_FLOW = ["pending_shipment", "packed", "dispatched", "in_transit", "delivered", "received"];
const RETURN_FLOW = ["return_pending", "return_dispatched", "return_in_transit", "return_delivered", "return_completed"];
const DELIVERY_STATUS_FLOW = ["placed", "packing", "packed", "ready_for_pickup", "picked_up", "shipped", "in_transit", "out_for_delivery", "delivered", "delivery_confirmed"];
const RETURN_STATUS_FLOW = ["return_placed", "return_packing", "return_ready_for_pickup", "return_shipped", "return_in_transit", "return_out_for_delivery", "return_received", "quality_check", "return_approved", "return_completed"];
const DELIVERY_STATUSES = [...DELIVERY_STATUS_FLOW, ...DELIVERY_FLOW];
const RETURN_STATUSES = [...RETURN_STATUS_FLOW, ...RETURN_FLOW];

function isReturnStatus(status = "") {
  return RETURN_STATUSES.includes(String(status || ""));
}

function nextStatus(flow = [], currentStatus = "") {
  const index = flow.indexOf(currentStatus);
  if (index < 0) return flow[0];
  return flow[Math.min(index + 1, flow.length - 1)];
}

function ensureValidTransition(flow = [], currentStatus = "", requestedStatus = "") {
  const currentIndex = flow.indexOf(currentStatus);
  const requestedIndex = flow.indexOf(requestedStatus);
  if (requestedIndex < 0) {
    throw new AppError("Invalid logistics status", 400, "INVALID_LOGISTICS_STATUS");
  }
  if (currentIndex >= 0 && requestedIndex < currentIndex) {
    throw new AppError("Logistics status cannot move backward", 409, "INVALID_STATUS_TRANSITION");
  }
  return requestedStatus;
}

function requireTrackingDetails(payload = {}, mode = "delivery") {
  const prefix = mode === "return" ? "Return " : "";
  const courier = mode === "return" ? payload.returnCourierCompany || payload.courierCompany : payload.courierCompany;
  const trackingNumber = mode === "return" ? payload.returnTrackingNumber || payload.trackingNumber : payload.trackingNumber;
  const trackingUrl = mode === "return" ? payload.returnTrackingUrl || payload.trackingUrl : payload.trackingUrl;
  const dispatchDate = mode === "return" ? payload.returnShipmentDate || payload.shipmentDate : payload.shipmentDate;
  const estimatedDelivery = mode === "return" ? payload.returnEstimatedDelivery || payload.estimatedDelivery : payload.estimatedDelivery;
  const missing = [];
  if (!present(courier)) missing.push(`${prefix}courier partner`);
  if (!present(trackingNumber)) missing.push(`${prefix}tracking number`);
  if (!present(trackingUrl)) missing.push(`${prefix}tracking URL`);
  if (!normalizeDate(dispatchDate)) missing.push(`${prefix}dispatch date`);
  if (!normalizeDate(estimatedDelivery)) missing.push(`${prefix}estimated delivery date`);
  if (missing.length) {
    throw new AppError(`${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} required before marking as shipped`, 400, "TRACKING_DETAILS_REQUIRED");
  }
}

function contentWindowEnded(campaign = {}, now = new Date()) {
  if (["completed", "content_deadline_missed", "expired"].includes(String(campaign.state || ""))) return true;
  const rawDate = campaign.contentCreationDeadline || campaign.campaignCompletedAt || campaign.endDate || campaign.deadline;
  if (!rawDate) return false;
  const date = new Date(rawDate);
  return !Number.isNaN(date.getTime()) && date <= now;
}

function logisticsVisibleForCampaign(campaign = {}) {
  return Boolean(campaign.acceptedAt || [
    "accepted",
    "active",
    "content_creation",
    "publish_scheduled",
    "live",
    "tracking_active",
    "completed",
    "content_deadline_missed",
    "expired",
  ].includes(String(campaign.state || "")));
}

async function notifyInfluencer(influencerId, payload) {
  const profile = await InfluencerProfile.findById(influencerId).select("userId").lean();
  if (!profile?.userId) return null;
  return notificationService.createNotification({
    userId: profile.userId,
    role: "INFLUENCER",
    module: "GROWTH",
    subModule: "CAMPAIGN_PRODUCT_SHIPPING",
    type: "INFLUENCER_COMMERCE",
    ...payload,
  }).catch(() => null);
}

async function notifyVendor(vendorId, payload) {
  return notificationService.notifyVendorUser(vendorId, {
    module: "GROWTH",
    subModule: "CAMPAIGN_PRODUCT_SHIPPING",
    type: "INFLUENCER_COMMERCE",
    ...payload,
  }).catch(() => null);
}

async function logShipmentAction(actor, action, shipment, metadata = {}) {
  if (!shipment?._id) return null;
  return auditService.log({
    actor,
    action,
    entityType: "CampaignProductShipment",
    entityId: shipment._id,
    metadata: {
      campaignId: String(shipment.campaignId || ""),
      vendorId: String(shipment.vendorId || ""),
      influencerId: String(shipment.influencerId || ""),
      shipmentStatus: shipment.shipmentStatus,
      ...metadata,
    },
  }).catch(() => null);
}

async function findVendorCampaign(userId, campaignId) {
  const vendor = await vendorRepo.findByUserId(userId);
  if (!vendor) throw new AppError("Vendor profile not found", 404, "VENDOR_NOT_FOUND");
  const id = objectId(campaignId);
  if (!id) throw new AppError("Campaign not found", 404, "NOT_FOUND");
  const campaign = await Campaign.findOne({ _id: id, vendorId: vendor._id }).lean();
  if (!campaign) throw new AppError("Campaign not found", 404, "NOT_FOUND");
  return { vendor, campaign };
}

async function findInfluencerCampaign(userId, campaignId) {
  const profile = await influencerService.getProfile(userId);
  const id = objectId(campaignId);
  if (!id) throw new AppError("Campaign not found", 404, "NOT_FOUND");
  const campaign = await Campaign.findOne({
    _id: id,
    $or: [{ influencerId: profile._id }, { applications: { $elemMatch: { influencerId: profile._id, status: { $in: ["approved", "accepted"] } } } }],
  }).lean();
  if (!campaign) throw new AppError("Campaign not found", 404, "NOT_FOUND");
  return { profile, campaign };
}

async function buildUpsert({ vendor, campaign, payload = {}, actorId }) {
  const productRequired = payload.productRequired === true;
  const influencerId = campaign.influencerId || payload.influencerId || null;
  if (productRequired && !influencerId) {
    throw new AppError("Select an influencer before enabling product shipment", 400, "INFLUENCER_REQUIRED_FOR_PRODUCT_SHIPMENT");
  }
  const delivery = influencerId
    ? await influencerDeliveryAddress(influencerId, payload)
    : { address: compactAddress(payload.deliveryAddressSnapshot || {}), addressId: objectId(payload.influencerAddressId) || undefined };
  const deliveryAddressSnapshot = delivery.address;
  const returnAddressSnapshot = vendorReturnAddress(vendor, payload);
  const returnRequired = payload.returnRequired !== false;
  if (productRequired && !hasUsableAddress(deliveryAddressSnapshot)) {
    throw new AppError("Influencer delivery address is required for product shipment", 400, "DELIVERY_ADDRESS_REQUIRED");
  }
  if (productRequired && returnRequired && !hasUsableAddress(returnAddressSnapshot)) {
    throw new AppError("Vendor return address is required when product return is enabled", 400, "RETURN_ADDRESS_REQUIRED");
  }
  const status = payload.shipmentStatus || (productRequired ? "placed" : "cancelled");
  return {
    $set: {
      campaignId: campaign._id,
      vendorId: vendor._id,
      influencerId,
      productIds: campaign.productIds || [],
      productRequired,
      returnRequired,
      influencerAddressId: delivery.addressId || objectId(payload.influencerAddressId) || undefined,
      vendorReturnAddressId: objectId(payload.vendorReturnAddressId) || undefined,
      deliveryAddressSnapshot,
      returnAddressSnapshot,
      courierCompany: payload.courierCompany || "",
      trackingNumber: payload.trackingNumber || "",
      trackingUrl: payload.trackingUrl || "",
      shipmentDate: normalizeDate(payload.shipmentDate),
      estimatedDelivery: normalizeDate(payload.estimatedDelivery),
      shippingCost: Number(payload.shippingCost || 0),
      packageWeight: payload.packageWeight || "",
      packageDimensions: {
        length: payload.packageDimensions?.length || "",
        width: payload.packageDimensions?.width || "",
        height: payload.packageDimensions?.height || "",
        unit: payload.packageDimensions?.unit || "cm",
      },
      notes: payload.notes || "",
      shipmentStatus: status,
    },
    $setOnInsert: {
      timeline: [timeline(status, productRequired ? "Product shipping enabled" : "Product shipping disabled", actorId, "vendor")],
    },
  };
}

async function upsertForCampaign({ userId, campaignId, payload = {} }) {
  const { vendor, campaign } = await findVendorCampaign(userId, campaignId);
  const acceptanceReady = Boolean(campaign.acceptedAt || ["content_creation", "active", "completed", "tracking_active", "publish_scheduled", "live"].includes(String(campaign.state || "")));
  await Campaign.updateOne(
    { _id: campaign._id },
    {
      $set: {
        productShippingConfig: {
          ...(campaign.productShippingConfig || {}),
          ...(payload || {}),
          productRequired: Boolean(payload.productRequired),
          returnRequired: payload.returnRequired !== false,
        },
      },
    }
  );
  if (!acceptanceReady) {
    return {
      productRequired: Boolean(payload.productRequired),
      returnRequired: payload.returnRequired !== false,
      shipmentStatus: payload.productRequired ? "awaiting_acceptance" : "cancelled",
      deliveryAddressSnapshot: compactAddress(payload.deliveryAddressSnapshot || {}),
      returnAddressSnapshot: vendorReturnAddress(vendor, payload),
    };
  }
  const update = await buildUpsert({ vendor, campaign, payload, actorId: userId });
  const shipment = await CampaignProductShipment.findOneAndUpdate({ campaignId: campaign._id }, update, {
    upsert: true,
    returnDocument: "after",
    setDefaultsOnInsert: true,
  }).lean();
  await logShipmentAction({ _id: userId, role: "vendor" }, "campaign.product_shipping.saved", shipment, { productRequired: shipment.productRequired });
  return shipmentSummary(shipment);
}

async function ensureCreatedFromCampaign({ userId, campaign, payload = {} }) {
  if (!payload?.productRequired) return null;
  const vendor = await vendorRepo.findByUserId(userId);
  const update = await buildUpsert({ vendor, campaign, payload, actorId: userId });
  const shipment = await CampaignProductShipment.findOneAndUpdate({ campaignId: campaign._id }, update, {
    upsert: true,
    returnDocument: "after",
    setDefaultsOnInsert: true,
  }).lean();
  await logShipmentAction({ _id: userId, role: "vendor" }, "campaign.product_shipping.created", shipment, { productRequired: shipment.productRequired });
  return shipmentSummary(shipment);
}

async function getVendorShipping(userId, campaignId) {
  const { campaign } = await findVendorCampaign(userId, campaignId);
  const shipment = await CampaignProductShipment.findOne({ campaignId: campaign._id }).lean();
  return shipmentSummary(shipment);
}

async function ensureCreatedAfterAcceptance({ campaign, actorId, actorRole = "influencer" }) {
  const payload = campaign.productShippingConfig || {};
  if (!payload?.productRequired) return null;
  const vendor = await vendorRepo.findById(campaign.vendorId);
  if (!vendor) throw new AppError("Vendor profile not found", 404, "VENDOR_NOT_FOUND");
  const update = await buildUpsert({ vendor, campaign, payload, actorId });
  const shipment = await CampaignProductShipment.findOneAndUpdate(
    { campaignId: campaign._id },
    {
      ...update,
      $set: {
        ...update.$set,
        shipmentStatus: "placed",
      },
      $setOnInsert: {
        timeline: [timeline("placed", "Delivery record created after campaign acceptance", actorId, actorRole)],
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  ).lean();
  await Promise.all([
    logShipmentAction({ _id: actorId, role: actorRole }, "campaign.product_delivery.created_after_acceptance", shipment, { productRequired: shipment.productRequired }),
    notifyVendor(shipment.vendorId, {
      title: "Campaign product delivery created",
      message: "The influencer accepted the campaign. Prepare the campaign product for shipping.",
      referenceId: String(shipment.campaignId),
      meta: { campaignId: String(shipment.campaignId), shipmentId: String(shipment._id) },
    }),
  ]);
  return shipmentSummary(shipment);
}

async function ensureReturnRecordsForDueCampaigns(vendorId = null) {
  const now = new Date();
  const filter = {
    productRequired: true,
    returnRequired: true,
    shipmentStatus: { $in: DELIVERY_STATUSES },
  };
  if (vendorId) filter.vendorId = vendorId;
  const rows = await CampaignProductShipment.find(filter)
    .populate({ path: "campaignId", select: "state contentCreationDeadline campaignCompletedAt endDate deadline" })
    .limit(500)
    .exec();
  const updated = [];
  for (const row of rows) {
    const campaign = row.campaignId && typeof row.campaignId === "object" ? row.campaignId : {};
    if (!contentWindowEnded(campaign, now)) continue;
    row.shipmentStatus = "return_placed";
    row.timeline.push(timeline("return_placed", "Return record created after content period ended", null, "system"));
    await row.save();
    updated.push(row._id);
    await notifyInfluencer(row.influencerId, {
      title: "Campaign product return is ready",
      message: "The content creation period has ended. Ship the campaign product back to the vendor return address.",
      referenceId: String(row.campaignId?._id || row.campaignId),
      meta: { campaignId: String(row.campaignId?._id || row.campaignId), shipmentId: String(row._id) },
    });
  }
  return updated;
}

async function ensureDeliveryRecordsForAcceptedCampaigns(vendor, actorId) {
  if (!vendor?._id) return [];
  const campaignFilter = {
    vendorId: vendor._id,
    "productShippingConfig.productRequired": true,
    influencerId: { $ne: null },
    $or: [
      { acceptedAt: { $ne: null } },
      {
        state: {
          $in: [
            "accepted",
            "active",
            "content_creation",
            "publish_scheduled",
            "live",
            "tracking_active",
            "completed",
            "content_deadline_missed",
            "expired",
          ],
        },
      },
    ],
  };
  const campaigns = await Campaign.find(campaignFilter)
    .select("_id vendorId influencerId productIds productShippingConfig state acceptedAt contentCreationDeadline campaignCompletedAt endDate deadline")
    .limit(500)
    .lean();
  if (!campaigns.length) return [];

  const campaignIds = campaigns.map((campaign) => campaign._id);
  const existingRows = await CampaignProductShipment.find({ campaignId: { $in: campaignIds } }).select("campaignId").lean();
  const existingIds = new Set(existingRows.map((row) => String(row.campaignId)));
  const missingCampaigns = campaigns.filter((campaign) => !existingIds.has(String(campaign._id)));
  if (!missingCampaigns.length) return [];

  const created = [];
  for (const campaign of missingCampaigns) {
    const payload = {
      ...(campaign.productShippingConfig || {}),
      productRequired: true,
      returnRequired: campaign.productShippingConfig?.returnRequired !== false,
    };
    const update = await buildUpsert({ vendor, campaign, payload, actorId });
    const shipment = await CampaignProductShipment.findOneAndUpdate(
      { campaignId: campaign._id },
      {
        ...update,
        $set: {
          ...update.$set,
          shipmentStatus: "placed",
        },
        $setOnInsert: {
          timeline: [timeline("placed", "Delivery record created for accepted campaign", actorId, "vendor")],
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    ).lean();
    created.push(shipment._id);
  }
  return created;
}

async function listVendorLogistics(userId, query = {}, type = "delivery") {
  const vendor = await vendorRepo.findByUserId(userId);
  if (!vendor) throw new AppError("Vendor profile not found", 404, "VENDOR_NOT_FOUND");
  await ensureDeliveryRecordsForAcceptedCampaigns(vendor, userId);
  await ensureReturnRecordsForDueCampaigns(vendor._id);
  const filter = {
    vendorId: vendor._id,
    productRequired: true,
  };
  if (type === "return") {
    filter.returnRequired = true;
    filter.shipmentStatus = { $in: RETURN_STATUSES };
  } else {
    filter.shipmentStatus = { $in: DELIVERY_STATUSES };
    if (query.status) filter.shipmentStatus = query.status;
  }
  const rows = await CampaignProductShipment.find(filter)
    .sort({ updatedAt: -1 })
    .populate({ path: "campaignId", select: "title campaignName state startDate endDate acceptedAt contentCreationDeadline campaignCompletedAt deadline" })
    .populate({ path: "influencerId", select: "displayName userId", populate: { path: "userId", select: "name username email" } })
    .populate({ path: "productIds", select: "name title productName sku productCode" })
    .lean();
  let items = rows.filter((row) => logisticsVisibleForCampaign(row.campaignId)).map(logisticsSummary);
  const searchFilter = buildSearchFilter(query.search);
  if (searchFilter) items = items.filter(searchFilter);
  if (query.status && type === "return") items = items.filter((row) => row.shipmentStatus === query.status);
  return paginate(items, query);
}

async function updateVendorDeliveryStatus(userId, shipmentId, payload = {}) {
  const vendor = await vendorRepo.findByUserId(userId);
  if (!vendor) throw new AppError("Vendor profile not found", 404, "VENDOR_NOT_FOUND");
  const current = await CampaignProductShipment.findOne({ _id: objectId(shipmentId), vendorId: vendor._id, productRequired: true }).lean();
  if (!current) throw new AppError("Delivery record not found", 404, "SHIPMENT_NOT_FOUND");
  const status = ensureValidTransition(DELIVERY_STATUS_FLOW, current.shipmentStatus, payload.shipmentStatus || nextStatus(DELIVERY_STATUS_FLOW, current.shipmentStatus));
  if (status === "shipped") requireTrackingDetails(payload, "delivery");
  const set = {
    shipmentStatus: status,
    courierCompany: payload.courierCompany ?? current.courierCompany,
    trackingNumber: payload.trackingNumber ?? current.trackingNumber,
    trackingUrl: payload.trackingUrl ?? current.trackingUrl,
    shipmentDate: normalizeDate(payload.shipmentDate) || current.shipmentDate,
    estimatedDelivery: normalizeDate(payload.estimatedDelivery) || current.estimatedDelivery,
    packageWeight: payload.packageWeight ?? current.packageWeight,
    notes: payload.notes ?? current.notes,
  };
  if (status === "delivered") set.deliveredAt = new Date();
  if (status === "delivery_confirmed") set.receivedAt = current.receivedAt || new Date();
  const shipment = await CampaignProductShipment.findOneAndUpdate(
    { _id: current._id, vendorId: vendor._id },
    { $set: set, $push: { timeline: timeline(status, "Delivery status updated", userId, "vendor", payload.note || payload.notes || "") } },
    { returnDocument: "after" }
  ).lean();
  await logShipmentAction({ _id: userId, role: "vendor" }, "campaign.product_delivery.status_updated", shipment, { shipmentStatus: status });
  return shipmentSummary(shipment);
}

async function updateVendorReturnStatus(userId, shipmentId, payload = {}) {
  const vendor = await vendorRepo.findByUserId(userId);
  if (!vendor) throw new AppError("Vendor profile not found", 404, "VENDOR_NOT_FOUND");
  const current = await CampaignProductShipment.findOne({ _id: objectId(shipmentId), vendorId: vendor._id, productRequired: true, returnRequired: true }).lean();
  if (!current) throw new AppError("Return record not found", 404, "SHIPMENT_NOT_FOUND");
  const status = ensureValidTransition(RETURN_STATUS_FLOW, current.shipmentStatus, payload.shipmentStatus || nextStatus(RETURN_STATUS_FLOW, current.shipmentStatus));
  if (status === "return_shipped") requireTrackingDetails(payload, "return");
  const set = {
    shipmentStatus: status,
    returnCourierCompany: payload.returnCourierCompany ?? payload.courierCompany ?? current.returnCourierCompany,
    returnTrackingNumber: payload.returnTrackingNumber ?? payload.trackingNumber ?? current.returnTrackingNumber,
    returnTrackingUrl: payload.returnTrackingUrl ?? payload.trackingUrl ?? current.returnTrackingUrl,
    returnShipmentDate: normalizeDate(payload.returnShipmentDate || payload.shipmentDate) || current.returnShipmentDate,
    returnEstimatedDelivery: normalizeDate(payload.returnEstimatedDelivery || payload.estimatedDelivery) || current.returnEstimatedDelivery,
    returnNotes: payload.returnNotes ?? payload.notes ?? current.returnNotes,
  };
  if (status === "return_received") set.returnDeliveredAt = new Date();
  const shipment = await CampaignProductShipment.findOneAndUpdate(
    { _id: current._id, vendorId: vendor._id },
    {
      $set: set,
      $push: { timeline: timeline(status, "Return status updated", userId, "vendor", payload.note || payload.returnNotes || payload.notes || "") },
    },
    { returnDocument: "after" }
  ).lean();
  await logShipmentAction({ _id: userId, role: "vendor" }, "campaign.product_return.status_updated", shipment, { shipmentStatus: status });
  return shipmentSummary(shipment);
}

async function dispatch(userId, campaignId, payload = {}) {
  const { campaign } = await findVendorCampaign(userId, campaignId);
  if (!present(payload.courierCompany) || !present(payload.trackingNumber)) {
    throw new AppError("Courier company and tracking number are required to dispatch the product", 400, "TRACKING_DETAILS_REQUIRED");
  }
  const current = await CampaignProductShipment.findOne({ campaignId: campaign._id }).lean();
  if (!current) throw new AppError("Product shipping setup not found", 404, "SHIPMENT_NOT_FOUND");
  if (!current.productRequired) throw new AppError("Product shipment is not enabled for this campaign", 400, "PRODUCT_SHIPMENT_NOT_ENABLED");
  if (!hasUsableAddress(current.deliveryAddressSnapshot)) {
    throw new AppError("Influencer delivery address is required before dispatch", 400, "DELIVERY_ADDRESS_REQUIRED");
  }
  const shipment = await CampaignProductShipment.findOneAndUpdate(
    { campaignId: campaign._id },
    {
      $set: {
        productRequired: true,
        courierCompany: payload.courierCompany || "",
        trackingNumber: payload.trackingNumber || "",
        trackingUrl: payload.trackingUrl || "",
        shipmentDate: normalizeDate(payload.shipmentDate) || new Date(),
        estimatedDelivery: normalizeDate(payload.estimatedDelivery),
        notes: payload.notes || "",
        shipmentStatus: payload.shipmentStatus || "dispatched",
      },
      $push: { timeline: timeline(payload.shipmentStatus || "dispatched", "Product dispatched", userId, "vendor", payload.notes || "") },
    },
    { upsert: false, returnDocument: "after" }
  ).lean();
  await Promise.all([
    logShipmentAction({ _id: userId, role: "vendor" }, "campaign.product_shipping.dispatched", shipment, { trackingNumber: shipment.trackingNumber }),
    notifyInfluencer(shipment.influencerId, {
      title: "Campaign product dispatched",
      message: `${shipment.courierCompany} tracking ${shipment.trackingNumber} has been added for your campaign product.`,
      referenceId: String(shipment.campaignId),
      meta: { campaignId: String(shipment.campaignId), shipmentId: String(shipment._id) },
    }),
  ]);
  return shipmentSummary(shipment);
}

async function updateReturn(userId, campaignId, payload = {}) {
  const { campaign } = await findVendorCampaign(userId, campaignId);
  const current = await CampaignProductShipment.findOne({ campaignId: campaign._id }).lean();
  if (!current) throw new AppError("Product shipping setup not found", 404, "SHIPMENT_NOT_FOUND");
  if (!current.returnRequired) throw new AppError("Product return is not required for this campaign", 400, "RETURN_NOT_REQUIRED");
  const status = payload.shipmentStatus || "return_dispatched";
  const shipment = await CampaignProductShipment.findOneAndUpdate(
    { campaignId: campaign._id },
    {
      $set: {
        returnCourierCompany: payload.returnCourierCompany || payload.courierCompany || "",
        returnTrackingNumber: payload.returnTrackingNumber || payload.trackingNumber || "",
        returnTrackingUrl: payload.returnTrackingUrl || payload.trackingUrl || "",
        returnShipmentDate: normalizeDate(payload.returnShipmentDate || payload.shipmentDate) || new Date(),
        returnEstimatedDelivery: normalizeDate(payload.returnEstimatedDelivery || payload.estimatedDelivery),
        returnNotes: payload.returnNotes || payload.notes || "",
        shipmentStatus: status,
      },
      $push: { timeline: timeline(status, "Return shipment updated", userId, "vendor", payload.returnNotes || payload.notes || "") },
    },
    { returnDocument: "after" }
  ).lean();
  await logShipmentAction({ _id: userId, role: "vendor" }, "campaign.product_shipping.return_updated", shipment, { shipmentStatus: status });
  return shipmentSummary(shipment);
}

async function getTracking(userId, campaignId) {
  const { campaign } = await findVendorCampaign(userId, campaignId);
  const shipment = await CampaignProductShipment.findOne({ campaignId: campaign._id }).lean();
  return shipmentSummary(shipment);
}

async function getInfluencerProduct(userId, campaignId) {
  const { campaign } = await findInfluencerCampaign(userId, campaignId);
  const shipment = await CampaignProductShipment.findOne({ campaignId: campaign._id }).lean();
  return shipmentSummary(shipment);
}

async function confirmDelivery(userId, campaignId, payload = {}) {
  const { campaign } = await findInfluencerCampaign(userId, campaignId);
  const shipment = await CampaignProductShipment.findOneAndUpdate(
    { campaignId: campaign._id },
    {
      $set: { shipmentStatus: "received", receivedAt: new Date(), deliveryProof: payload.deliveryProof || {} },
      $push: { timeline: timeline("received", "Product received by influencer", userId, "influencer", payload.note || "") },
    },
    { returnDocument: "after" }
  ).lean();
  if (!shipment) throw new AppError("Product shipping setup not found", 404, "SHIPMENT_NOT_FOUND");
  await Promise.all([
    logShipmentAction({ _id: userId, role: "influencer" }, "campaign.product_shipping.received", shipment),
    notifyVendor(shipment.vendorId, {
      title: "Campaign product received",
      message: "The influencer confirmed that the campaign product was received.",
      referenceId: String(shipment.campaignId),
      meta: { campaignId: String(shipment.campaignId), shipmentId: String(shipment._id) },
    }),
  ]);
  return shipmentSummary(shipment);
}

async function requestReturn(userId, campaignId, payload = {}) {
  const { campaign } = await findInfluencerCampaign(userId, campaignId);
  const current = await CampaignProductShipment.findOne({ campaignId: campaign._id }).lean();
  if (!current) throw new AppError("Product shipping setup not found", 404, "SHIPMENT_NOT_FOUND");
  if (!current.returnRequired) throw new AppError("Product return is not required for this campaign", 400, "RETURN_NOT_REQUIRED");
  if (!contentWindowEnded(campaign)) {
    throw new AppError("Product return starts after the content creation period ends", 409, "RETURN_WINDOW_NOT_OPEN");
  }
  const shipment = await CampaignProductShipment.findOneAndUpdate(
    { campaignId: campaign._id },
    {
      $set: { shipmentStatus: "return_placed", returnNotes: payload.note || "" },
      $push: { timeline: timeline("return_placed", "Return requested by influencer", userId, "influencer", payload.note || "") },
    },
    { returnDocument: "after" }
  ).lean();
  await Promise.all([
    logShipmentAction({ _id: userId, role: "influencer" }, "campaign.product_shipping.return_requested", shipment),
    notifyVendor(shipment.vendorId, {
      title: "Product return requested",
      message: "The influencer requested the return workflow for a campaign product.",
      referenceId: String(shipment.campaignId),
      meta: { campaignId: String(shipment.campaignId), shipmentId: String(shipment._id) },
    }),
  ]);
  return shipmentSummary(shipment);
}

async function confirmReturn(userId, campaignId, payload = {}) {
  const { campaign } = await findInfluencerCampaign(userId, campaignId);
  const current = await CampaignProductShipment.findOne({ campaignId: campaign._id }).lean();
  if (!current) throw new AppError("Product shipping setup not found", 404, "SHIPMENT_NOT_FOUND");
  if (!current.returnRequired) throw new AppError("Product return is not required for this campaign", 400, "RETURN_NOT_REQUIRED");
  if (!contentWindowEnded(campaign)) {
    throw new AppError("Product return starts after the content creation period ends", 409, "RETURN_WINDOW_NOT_OPEN");
  }
  requireTrackingDetails(payload, "return");
  const status = payload.shipmentStatus || "return_shipped";
  const shipment = await CampaignProductShipment.findOneAndUpdate(
    { campaignId: campaign._id },
    {
      $set: {
        shipmentStatus: status,
        returnCourierCompany: payload.returnCourierCompany || payload.courierCompany || "",
        returnTrackingNumber: payload.returnTrackingNumber || payload.trackingNumber || "",
        returnTrackingUrl: payload.returnTrackingUrl || payload.trackingUrl || "",
        returnShipmentDate: normalizeDate(payload.returnShipmentDate || payload.shipmentDate) || new Date(),
        returnEstimatedDelivery: normalizeDate(payload.returnEstimatedDelivery || payload.estimatedDelivery),
        returnNotes: payload.returnNotes || payload.notes || "",
        returnProof: payload.returnProof || {},
      },
      $push: { timeline: timeline(status, "Return dispatched by influencer", userId, "influencer", payload.note || payload.returnNotes || payload.notes || "") },
    },
    { returnDocument: "after" }
  ).lean();
  await Promise.all([
    logShipmentAction({ _id: userId, role: "influencer" }, "campaign.product_shipping.return_dispatched", shipment, { trackingNumber: shipment.returnTrackingNumber }),
    notifyVendor(shipment.vendorId, {
      title: "Campaign product return dispatched",
      message: `${shipment.returnCourierCompany} tracking ${shipment.returnTrackingNumber} has been added for the return shipment.`,
      referenceId: String(shipment.campaignId),
      meta: { campaignId: String(shipment.campaignId), shipmentId: String(shipment._id) },
    }),
  ]);
  return shipmentSummary(shipment);
}

module.exports = {
  ensureCreatedFromCampaign,
  ensureCreatedAfterAcceptance,
  ensureReturnRecordsForDueCampaigns,
  upsertForCampaign,
  getVendorShipping,
  listVendorLogistics,
  updateVendorDeliveryStatus,
  updateVendorReturnStatus,
  dispatch,
  updateReturn,
  getTracking,
  getInfluencerProduct,
  confirmDelivery,
  requestReturn,
  confirmReturn,
  shipmentSummary,
};
