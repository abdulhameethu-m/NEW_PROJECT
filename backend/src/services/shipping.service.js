const { AppError } = require("../utils/AppError");
const { SHIPPING_MODE } = require("../models/Vendor");
const { ORDER_STATUS, SHIPPING_STATUS, PICKUP_STATUS } = require("../models/Order");
const { logger } = require("../utils/logger");
const {
  resolveEnabledShippingModes,
  getShippingModesConfig,
  updateShippingModesConfig,
} = require("./shipping-config.service");
const inventoryService = require("./inventory.service");
const Shipment = require("../models/Shipment");

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

  if (shippingStatus === "PICKUP_SCHEDULED" && next.status === "Placed") {
    next.status = "Packed";
  }

  if (shippingStatus === "SHIPPED" && !["Shipped", "Out for Delivery", "Delivered"].includes(next.status)) {
    next.status = "Shipped";
  }

  if (shippingStatus === "IN_TRANSIT" && !["Out for Delivery", "Delivered"].includes(next.status)) {
    next.status = "Out for Delivery";
  }

  if (shippingStatus === "OUT_FOR_DELIVERY") {
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
  if (!order.inventoryCommittedAt) {
    await inventoryService.commitOrderInventory(order, {
      shipmentId: order.shipmentId || undefined,
      performedBy: vendorId,
    });
  }

  // Add to timeline
  if (!order.timeline) order.timeline = [];
  order.timeline.push({
    status: order.status,
    note: `Self-shipping submitted. Tracking ID: ${validTrackingId}, Courier: ${validCourierName}`,
    changedAt: new Date(),
  });

  await order.save();
  await Shipment.findOneAndUpdate(
    { orderId: order._id },
    {
      $set: {
        shipmentId: order.shipmentId || validTrackingId,
        shipmentStatus: "SHIPPED",
        courierName: validCourierName,
        trackingId: validTrackingId,
        trackingUrl: order.trackingUrl || "",
        codAmountCollectable: order.paymentMethod === "COD" && order.cod?.status !== "collected" ? Number(order.totalAmount || 0) : 0,
      },
    }
  ).catch(() => {});
  return order;
}

/**
 * Request platform shipping (shipment creation only)
 */
async function requestPlatformShipping(order, vendor) {
  const deliveryService = require("./delivery.service");

  // Check if already requested
  if (order.shipmentId || ["READY_FOR_PICKUP", "PICKUP_SCHEDULED", "SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"].includes(order.shippingStatus)) {
    throw new AppError("Shipment has already been created for this order", 400, "SHIPMENT_ALREADY_CREATED");
  }

  // Use the polymorphic delivery service to generate the shipment
  const shipmentData = await deliveryService.createShipment(order, vendor);

  // Update order
  order.shippingMode = "PLATFORM";
  order.shippingStatus = "READY_FOR_PICKUP";
  order.pickupStatus = "NOT_REQUESTED";
  order.pickupScheduled = false;
  order.pickupBatchId = "";
  order.shipmentId = shipmentData.shipmentId;
  order.trackingId = shipmentData.trackingId;
  order.courierName = shipmentData.courierName;
  order.trackingUrl = shipmentData.trackingUrl;
  order.logisticsProvider = shipmentData.provider;
  order.logisticsMetadata = shipmentData.raw || {};
  order.pickupRequestedAt = new Date();
  order.courierAssignedByRole = "SYSTEM";
  // Dynamically set deliveryPartner based on the actual provider used
  order.deliveryPartner = shipmentData.provider === "SHADOWFAX" ? "SHADOWFAX" : "SHIPROCKET";

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
    note: `Platform shipment created. Shipment ID: ${shipmentData.shipmentId}`,
    changedAt: new Date(),
  });

  await order.save();
  await Shipment.findOneAndUpdate(
    { orderId: order._id },
    {
      $set: {
        shipmentId: shipmentData.shipmentId,
        shipmentStatus: "READY",
        courierName: shipmentData.courierName,
        trackingId: shipmentData.trackingId,
        trackingUrl: shipmentData.trackingUrl,
        logisticsProvider: shipmentData.provider,
        codAmountCollectable: order.paymentMethod === "COD" && order.cod?.status !== "collected" ? Number(order.totalAmount || 0) : 0,
        meta: shipmentData.raw || {},
      },
    }
  ).catch(() => {});
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
    logger.webhook("Shiprocket webhook shipment not found", {
      source: "shipping.service",
      event: "shiprocket_shipment_not_found",
      shipmentId: String(shipmentId),
    });
    return null;
  }

  // Map Shiprocket status to our status
  const statusMapping = {
    pending: "PICKUP_SCHEDULED",
    ready_to_ship: "PICKUP_SCHEDULED",
    in_transit: "IN_TRANSIT",
    shipped: "SHIPPED",
    out_for_delivery: "OUT_FOR_DELIVERY",
    delivered: "DELIVERED",
    failed: "FAILED",
    rto_in_transit: "IN_TRANSIT",
    rto_delivered: "DELIVERED",
  };

  const shiprocketStatus = String(event.status || "").toLowerCase();
  const newShippingStatus = statusMapping[shiprocketStatus];

  if (newShippingStatus && newShippingStatus !== order.shippingStatus) {
    const previousShippingStatus = order.shippingStatus;
    order.shippingStatus = newShippingStatus;

    // Update pickup status
    if (newShippingStatus === "PICKUP_SCHEDULED") {
      order.pickupScheduled = true;
      order.pickupStatus = "SCHEDULED";
      order.pickupScheduledAt = new Date();
    } else if (newShippingStatus === "SHIPPED") {
      order.pickupStatus = "COMPLETED";
      order.pickupCompletedAt = new Date();
      order.pickupScheduled = true;
    } else if (newShippingStatus === "FAILED") {
      order.pickupStatus = "FAILED";
    } else if (newShippingStatus === "DELIVERED") {
      order.pickupStatus = "COMPLETED";
      order.deliveredAt = new Date();
      order.pickupScheduled = true;
    }

    // Apply lifecycle changes
    const lifecycle = applyShippingLifecycle({
      orderStatus: order.status,
      shippingMode: order.shippingMode,
      shippingStatus: order.shippingStatus,
      pickupStatus: order.pickupStatus,
    });

    order.status = lifecycle.status;
    if (newShippingStatus === "SHIPPED" && previousShippingStatus !== "SHIPPED" && !order.inventoryCommittedAt) {
      await inventoryService.commitOrderInventory(order, {
        shipmentId: order.shipmentId || shipmentId,
      });
    }

    // Add to timeline
    if (!order.timeline) order.timeline = [];
    order.timeline.push({
      status: order.status,
      note: `Shiprocket webhook: ${shiprocketStatus}`,
      changedAt: new Date(),
    });

    await order.save();
    await Shipment.findOneAndUpdate(
      { orderId: order._id },
      {
        $set: {
          shipmentId: order.shipmentId || String(shipmentId),
          shipmentStatus:
            newShippingStatus === "DELIVERED"
              ? "DELIVERED"
              : newShippingStatus === "FAILED"
                ? "FAILED"
                : newShippingStatus === "SHIPPED" || newShippingStatus === "IN_TRANSIT" || newShippingStatus === "OUT_FOR_DELIVERY"
                  ? "SHIPPED"
                  : "READY",
          trackingId: order.trackingId || "",
          trackingUrl: order.trackingUrl || "",
          courierName: order.courierName || "",
          logisticsProvider: order.logisticsProvider || "",
        },
      }
    ).catch(() => {});
  }

  return order;
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
