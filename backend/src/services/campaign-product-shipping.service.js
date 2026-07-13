const mongoose = require("mongoose");
const vendorRepo = require("../repositories/vendor.repository");
const influencerService = require("../modules/influencer/service");
const { AppError } = require("../utils/AppError");
const { Campaign } = require("../modules/campaign/model");
const { InfluencerBusinessProfile } = require("../modules/influencer/model");
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
    addressLine1: address.addressLine1 || address.address1 || address.address || "",
    addressLine2: address.addressLine2 || address.address2 || "",
    city: address.city || "",
    state: address.state || "",
    postalCode: address.postalCode || address.pincode || "",
    country: address.country || "India",
  };
  return Object.fromEntries(Object.entries(normalized).filter(([, value]) => present(value)));
}

function hasUsableAddress(address = {}) {
  return Boolean(address.addressLine1 || address.address1 || address.address || address.city || address.postalCode || address.pincode);
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
  if (hasUsableAddress(payload.deliveryAddressSnapshot)) return compactAddress(payload.deliveryAddressSnapshot);
  const business = await InfluencerBusinessProfile.findOne({ influencerId }).sort({ updatedAt: -1 }).lean();
  if (business && hasUsableAddress(business)) {
    return compactAddress({
      name: business.legalName || business.businessName,
      address1: business.address1,
      address2: business.address2,
      city: business.city,
      state: business.state,
      postalCode: business.postalCode,
      phone: business.phone,
      country: business.country,
    });
  }
  return {};
}

function timeline(status, label, actorId, actorRole, note = "") {
  return { status, label, note, actorId, actorRole, at: new Date() };
}

function normalizeDate(value) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
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
  };
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
  const deliveryAddressSnapshot = influencerId ? await influencerDeliveryAddress(influencerId, payload) : compactAddress(payload.deliveryAddressSnapshot || {});
  const returnAddressSnapshot = vendorReturnAddress(vendor, payload);
  const status = payload.shipmentStatus || (productRequired ? "pending_shipment" : "cancelled");
  return {
    $set: {
      campaignId: campaign._id,
      vendorId: vendor._id,
      influencerId,
      productIds: campaign.productIds || [],
      productRequired,
      returnRequired: payload.returnRequired !== false,
      influencerAddressId: objectId(payload.influencerAddressId) || undefined,
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
  const update = await buildUpsert({ vendor, campaign, payload, actorId: userId });
  const shipment = await CampaignProductShipment.findOneAndUpdate({ campaignId: campaign._id }, update, {
    upsert: true,
    returnDocument: "after",
    setDefaultsOnInsert: true,
  }).lean();
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
  return shipmentSummary(shipment);
}

async function getVendorShipping(userId, campaignId) {
  const { campaign } = await findVendorCampaign(userId, campaignId);
  const shipment = await CampaignProductShipment.findOne({ campaignId: campaign._id }).lean();
  return shipmentSummary(shipment);
}

async function dispatch(userId, campaignId, payload = {}) {
  const { campaign } = await findVendorCampaign(userId, campaignId);
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
  if (!shipment) throw new AppError("Product shipping setup not found", 404, "SHIPMENT_NOT_FOUND");
  return shipmentSummary(shipment);
}

async function updateReturn(userId, campaignId, payload = {}) {
  const { campaign } = await findVendorCampaign(userId, campaignId);
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
  if (!shipment) throw new AppError("Product shipping setup not found", 404, "SHIPMENT_NOT_FOUND");
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
  return shipmentSummary(shipment);
}

async function requestReturn(userId, campaignId, payload = {}) {
  const { campaign } = await findInfluencerCampaign(userId, campaignId);
  const shipment = await CampaignProductShipment.findOneAndUpdate(
    { campaignId: campaign._id },
    {
      $set: { shipmentStatus: "return_pending", returnNotes: payload.note || "" },
      $push: { timeline: timeline("return_pending", "Return requested by influencer", userId, "influencer", payload.note || "") },
    },
    { returnDocument: "after" }
  ).lean();
  if (!shipment) throw new AppError("Product shipping setup not found", 404, "SHIPMENT_NOT_FOUND");
  return shipmentSummary(shipment);
}

async function confirmReturn(userId, campaignId, payload = {}) {
  const { campaign } = await findInfluencerCampaign(userId, campaignId);
  const status = payload.shipmentStatus || "return_dispatched";
  const shipment = await CampaignProductShipment.findOneAndUpdate(
    { campaignId: campaign._id },
    {
      $set: {
        shipmentStatus: status,
        returnCourierCompany: payload.returnCourierCompany || payload.courierCompany || "",
        returnTrackingNumber: payload.returnTrackingNumber || payload.trackingNumber || "",
        returnTrackingUrl: payload.returnTrackingUrl || payload.trackingUrl || "",
        returnShipmentDate: normalizeDate(payload.returnShipmentDate || payload.shipmentDate) || new Date(),
        returnProof: payload.returnProof || {},
      },
      $push: { timeline: timeline(status, "Return dispatched by influencer", userId, "influencer", payload.note || "") },
    },
    { returnDocument: "after" }
  ).lean();
  if (!shipment) throw new AppError("Product shipping setup not found", 404, "SHIPMENT_NOT_FOUND");
  return shipmentSummary(shipment);
}

module.exports = {
  ensureCreatedFromCampaign,
  upsertForCampaign,
  getVendorShipping,
  dispatch,
  updateReturn,
  getTracking,
  getInfluencerProduct,
  confirmDelivery,
  requestReturn,
  confirmReturn,
  shipmentSummary,
};
