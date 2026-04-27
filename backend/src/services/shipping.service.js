const { AppError } = require("../utils/AppError");
const { SHIPPING_MODE } = require("../models/Vendor");
const { ORDER_STATUS, SHIPPING_STATUS, PICKUP_STATUS } = require("../models/Order");
const { resolveEnabledShippingModes, getShippingModesConfig } = require("./shipping-config.service");

const TRACKING_ID_PATTERN = /^[A-Z0-9][A-Z0-9\-_/.]{5,39}$/i;

function normalizeShippingMode(value, fallback = "SELF") {
  const mode = String(value || fallback).trim().toUpperCase();
  return SHIPPING_MODE.includes(mode) ? mode : fallback;
}

function sanitizeAllowedModes(modes = []) {
  const normalized = Array.from(new Set((Array.isArray(modes) ? modes : []).map((item) => normalizeShippingMode(item, "")).filter(Boolean)));
  return normalized.length ? normalized : ["SELF"];
}

function validateTrackingId(trackingId) {
  const value = String(trackingId || "").trim();
  if (!value || !TRACKING_ID_PATTERN.test(value)) {
    throw new AppError("Enter a valid tracking ID", 400, "INVALID_TRACKING_ID");
  }
  return value;
}

function validateCourierName(courierName) {
  const value = String(courierName || "").trim();
  if (!value || value.length < 2 || value.length > 80) {
    throw new AppError("Enter a valid courier name", 400, "INVALID_COURIER_NAME");
  }
  return value;
}

async function getPlatformShippingState() {
  const config = await getShippingModesConfig();
  return {
    config,
    enabledModes: resolveEnabledShippingModes(config.value),
  };
}

async function resolveVendorShippingModes(vendor) {
  const { enabledModes, config } = await getPlatformShippingState();
  const requestedModes = sanitizeAllowedModes(vendor?.shippingSettings?.allowedShippingModes || enabledModes);
  const effectiveModes = requestedModes.filter((mode) => enabledModes.includes(mode));
  const defaultShippingMode = effectiveModes.includes(vendor?.shippingSettings?.defaultShippingMode)
    ? vendor.shippingSettings.defaultShippingMode
    : effectiveModes[0] || enabledModes[0] || "SELF";

  return {
    adminConfig: config.value,
    enabledModes,
    requestedModes,
    effectiveModes,
    defaultShippingMode,
  };
}

async function assertVendorCanUseShippingMode(vendor, requestedMode) {
  const vendorModes = await resolveVendorShippingModes(vendor);
  const mode = normalizeShippingMode(requestedMode, vendorModes.defaultShippingMode);
  if (!vendorModes.effectiveModes.includes(mode)) {
    throw new AppError("Selected shipping mode is not enabled for this vendor", 400, "SHIPPING_MODE_DISABLED");
  }
  return { mode, vendorModes };
}

function applyShippingLifecycle({ orderStatus, shippingMode, shippingStatus, pickupStatus }) {
  const next = {
    status: orderStatus,
    shippingMode,
    shippingStatus,
    pickupStatus,
  };

  if (shippingStatus === "READY_FOR_PICKUP" && next.status === "Placed") {
    next.status = "Packed";
  }

  if (shippingStatus === "SHIPPED" && !["Shipped", "Out for Delivery", "Delivered"].includes(next.status)) {
    next.status = "Shipped";
  }

  if (shippingStatus === "IN_TRANSIT" && !["Out for Delivery", "Delivered"].includes(next.status)) {
    next.status = "Out for Delivery";
  }

  if (shippingStatus === "DELIVERED") {
    next.status = "Delivered";
  }

  return next;
}

function buildVendorShippingSettingsPayload(payload = {}, vendorModes = null) {
  const requestedAllowedModes = payload.allowedShippingModes !== undefined
    ? sanitizeAllowedModes(payload.allowedShippingModes)
    : vendorModes?.requestedModes;

  const enabledModes = vendorModes?.enabledModes || requestedAllowedModes || ["SELF"];
  const allowedShippingModes = (requestedAllowedModes || ["SELF"]).filter((mode) => enabledModes.includes(mode));
  if (!allowedShippingModes.length) {
    throw new AppError("At least one enabled shipping mode must remain selected", 400, "INVALID_SHIPPING_SETTINGS");
  }

  const defaultShippingMode = normalizeShippingMode(payload.defaultShippingMode, allowedShippingModes[0]);
  if (!allowedShippingModes.includes(defaultShippingMode)) {
    throw new AppError("Default shipping mode must be one of the allowed shipping modes", 400, "INVALID_SHIPPING_SETTINGS");
  }

  return {
    allowedShippingModes,
    defaultShippingMode,
    preferredPickupLocation: String(payload.preferredPickupLocation || "Primary").trim() || "Primary",
    selfShippingEnabledAt: allowedShippingModes.includes("SELF") ? new Date() : null,
    platformShippingEnabledAt: allowedShippingModes.includes("PLATFORM") ? new Date() : null,
  };
}

module.exports = {
  ORDER_STATUS,
  SHIPPING_STATUS,
  PICKUP_STATUS,
  normalizeShippingMode,
  sanitizeAllowedModes,
  validateTrackingId,
  validateCourierName,
  resolveVendorShippingModes,
  assertVendorCanUseShippingMode,
  applyShippingLifecycle,
  buildVendorShippingSettingsPayload,
};
