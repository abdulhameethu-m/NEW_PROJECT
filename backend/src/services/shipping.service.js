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

/**
 * Submit self-shipping tracking information for an order
 */
async function submitSelfShipping(order, { trackingId, courierName, trackingUrl, vendorId }) {
  // Validate inputs
  const validTrackingId = validateTrackingId(trackingId);
  const validCourierName = validateCourierName(courierName);

  // Prevent duplicate submissions
  if (order.shippingStatus === "SHIPPED" && order.trackingId) {
    throw new AppError("Tracking already submitted for this order", 400, "TRACKING_ALREADY_SUBMITTED");
  }

  // Update order
  order.shippingMode = "SELF";
  order.shippingStatus = "SHIPPED";
  order.pickupStatus = "NOT_REQUESTED";
  order.trackingId = validTrackingId;
  order.courierName = validCourierName;
  if (trackingUrl) {
    order.trackingUrl = String(trackingUrl).trim();
  }
  order.trackingAssignedAt = new Date();
  order.courierAssignedByRole = "VENDOR";
  order.courierAssignedById = vendorId;

  // Apply lifecycle changes
  const lifecycle = applyShippingLifecycle({
    orderStatus: order.status,
    shippingMode: order.shippingMode,
    shippingStatus: order.shippingStatus,
    pickupStatus: order.pickupStatus,
  });

  order.status = lifecycle.status;

  // Add to timeline
  if (!order.timeline) order.timeline = [];
  order.timeline.push({
    status: order.status,
    note: `Self-shipping submitted. Tracking ID: ${validTrackingId}, Courier: ${validCourierName}`,
    changedAt: new Date(),
  });

  await order.save();
  return order;
}

/**
 * Request platform shipping (Shiprocket pickup)
 */
async function requestPlatformShipping(order, vendor) {
  const logisticsService = require("./logistics.service");

  // Check if already requested
  if (order.pickupStatus !== "NOT_REQUESTED") {
    throw new AppError("Pickup has already been requested for this order", 400, "PICKUP_ALREADY_REQUESTED");
  }

  // Build shipment payload for Shiprocket
  const shipmentPayload = {
    order_id: order.orderNumber,
    order_date: order.createdAt.toISOString().split("T")[0],
    pickup_location: vendor.shippingSettings?.preferredPickupLocation || "Primary",
    channel_id: 0,
    billing_customer_name: order.shippingAddress?.fullName || "Customer",
    billing_customer_phone: order.shippingAddress?.phone || "",
    billing_customer_email: order.userId?.email || "",
    billing_customer_address: order.shippingAddress?.line1 || "",
    billing_customer_address_2: order.shippingAddress?.line2 || "",
    billing_customer_city: order.shippingAddress?.city || "",
    billing_customer_state: order.shippingAddress?.state || "",
    billing_customer_country: order.shippingAddress?.country || "India",
    billing_customer_pincode: order.shippingAddress?.postalCode || "",
    shipping_is_billing: true,
    order_items: (order.items || []).map((item) => ({
      name: item.name,
      sku: item.variantSku || item.productId.toString(),
      units: item.quantity,
      selling_price: item.price,
    })),
    payment_method: "Prepaid",
    sub_total: order.subtotal,
    length: 10,
    breadth: 10,
    height: 10,
    weight: 0.5,
  };

  // Call logistics provider
  const shipmentData = await logisticsService.createPlatformShipment(shipmentPayload);

  // Update order
  order.shippingMode = "PLATFORM";
  order.shippingStatus = "READY_FOR_PICKUP";
  order.pickupStatus = "REQUESTED";
  order.shipmentId = shipmentData.shipmentId;
  order.trackingId = shipmentData.trackingId;
  order.courierName = shipmentData.courierName;
  order.trackingUrl = shipmentData.trackingUrl;
  order.logisticsProvider = shipmentData.provider;
  order.logisticsMetadata = shipmentData.raw || {};
  order.pickupRequestedAt = new Date();
  order.courierAssignedByRole = "SYSTEM";

  // Apply lifecycle changes
  const lifecycle = applyShippingLifecycle({
    orderStatus: order.status,
    shippingMode: order.shippingMode,
    shippingStatus: order.shippingStatus,
    pickupStatus: order.pickupStatus,
  });

  order.status = lifecycle.status;

  // Add to timeline
  if (!order.timeline) order.timeline = [];
  order.timeline.push({
    status: order.status,
    note: `Platform pickup requested. Shipment ID: ${shipmentData.shipmentId}`,
    changedAt: new Date(),
  });

  await order.save();
  return order;
}

/**
 * Process Shiprocket webhook events
 */
async function processShiprocketWebhook(event) {
  const orderRepo = require("../repositories/order.repository");

  const shipmentId = event.shipment_id;
  if (!shipmentId) return null;

  // Find order by shipment ID
  const order = await orderRepo.findOne({ shipmentId: String(shipmentId) });
  if (!order) {
    console.warn(`Webhook: Shipment ${shipmentId} not found`);
    return null;
  }

  // Map Shiprocket status to our status
  const statusMapping = {
    pending: "READY_FOR_PICKUP",
    ready_to_ship: "READY_FOR_PICKUP",
    in_transit: "IN_TRANSIT",
    shipped: "SHIPPED",
    delivered: "DELIVERED",
    failed: "NOT_SHIPPED",
    rto_in_transit: "IN_TRANSIT",
    rto_delivered: "DELIVERED",
  };

  const shiprocketStatus = String(event.status || "").toLowerCase();
  const newShippingStatus = statusMapping[shiprocketStatus];

  if (newShippingStatus && newShippingStatus !== order.shippingStatus) {
    order.shippingStatus = newShippingStatus;

    // Update pickup status
    if (newShippingStatus === "READY_FOR_PICKUP") {
      order.pickupStatus = "SCHEDULED";
      order.pickupScheduledAt = new Date();
    } else if (newShippingStatus === "SHIPPED") {
      order.pickupStatus = "COMPLETED";
      order.pickupCompletedAt = new Date();
    } else if (newShippingStatus === "DELIVERED") {
      order.pickupStatus = "COMPLETED";
      order.deliveredAt = new Date();
    }

    // Apply lifecycle changes
    const lifecycle = applyShippingLifecycle({
      orderStatus: order.status,
      shippingMode: order.shippingMode,
      shippingStatus: order.shippingStatus,
      pickupStatus: order.pickupStatus,
    });

    order.status = lifecycle.status;

    // Add to timeline
    if (!order.timeline) order.timeline = [];
    order.timeline.push({
      status: order.status,
      note: `Shiprocket webhook: ${shiprocketStatus}`,
      changedAt: new Date(),
    });

    await order.save();
  }

  return order;
}

/**
 * Get shipping modes configuration from PlatformConfig
 */
async function getShippingModesConfig() {
  const PlatformConfig = require("../models/PlatformConfig");

  let config = await PlatformConfig.findOne({ key: "shipping_modes" });

  if (!config) {
    // Create default config if not exists
    config = await PlatformConfig.create({
      key: "shipping_modes",
      value: {
        selfShipping: true,
        platformShipping: true,
      },
      category: "shipping",
      type: "object",
      description: "Platform shipping modes configuration",
    });
  }

  return config;
}

/**
 * Update shipping modes configuration
 */
async function updateShippingModesConfig({ selfShipping, platformShipping, updatedBy }) {
  const PlatformConfig = require("../models/PlatformConfig");

  const config = await getShippingModesConfig();
  config.value = {
    selfShipping: Boolean(selfShipping),
    platformShipping: Boolean(platformShipping),
  };
  config.updatedBy = updatedBy;

  await config.save();
  return config;
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
  submitSelfShipping,
  requestPlatformShipping,
  processShiprocketWebhook,
  getShippingModesConfig,
  updateShippingModesConfig,
};
