const crypto = require("crypto");
const mongoose = require("mongoose");
const { AppError } = require("../utils/AppError");
const { Order } = require("../models/Order");
const { PickupBatch } = require("../models/PickupBatch");
const vendorRepo = require("../repositories/vendor.repository");
const logisticsService = require("./logistics.service");
const { logger } = require("../utils/logger");

const READY_FOR_PICKUP_STATUS = "READY_FOR_PICKUP";
const PICKUP_SCHEDULED_STATUS = "PICKUP_SCHEDULED";
const RECOMMENDED_THRESHOLD = 10;

function normalizeShipmentIds(shipmentIds = []) {
  return [...new Set((Array.isArray(shipmentIds) ? shipmentIds : []).map((id) => String(id || "").trim()).filter(Boolean))];
}

function buildIdempotencyKey(vendorId, shipmentIds = []) {
  const hash = crypto
    .createHash("sha1")
    .update(`${String(vendorId)}:${[...shipmentIds].sort().join(",")}`)
    .digest("hex");
  return `pickup:${String(vendorId)}:${hash}`;
}

function attachSession(query, session) {
  if (session) {
    query.session(session);
  }
  return query;
}

function startOfDay(date = new Date()) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date = new Date()) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

async function executeWithOptionalTransaction(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (error) {
    const message = String(error?.message || "");
    if (
      message.includes("Transaction numbers are only allowed") ||
      message.includes("replica set") ||
      message.includes("standalone")
    ) {
      logger.warn("Mongo transaction unavailable, falling back to non-transactional pickup scheduling flow", {
        source: "pickup.service",
      });
      return await work(null);
    }
    throw error;
  } finally {
    await session.endSession().catch(() => {});
  }
}

async function generateBatchId(vendorId, date = new Date(), session = null) {
  const datePart = new Date(date).toISOString().slice(0, 10);
  const vendorToken = `V${String(vendorId).slice(-6).toUpperCase()}`;
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  const baseCount = await attachSession(PickupBatch.countDocuments({
    vendorId,
    scheduledAt: { $gte: dayStart, $lte: dayEnd },
  }), session);

  for (let offset = 1; offset <= 50; offset += 1) {
    const sequence = String(baseCount + offset).padStart(3, "0");
    const batchId = `PICKUP-${datePart}-${vendorToken}-${sequence}`;
    const existing = await attachSession(PickupBatch.exists({ batchId }), session);
    if (!existing) {
      return batchId;
    }
  }

  throw new AppError("Unable to generate a unique pickup batch id", 500, "PICKUP_BATCH_ID_GENERATION_FAILED");
}

function validateReadyShipment(order, expectedVendorId) {
  if (String(order.sellerId) !== String(expectedVendorId)) {
    throw new AppError("All shipments must belong to the same vendor", 400, "MIXED_VENDOR_SHIPMENTS");
  }
  if (!order.shipmentId) {
    throw new AppError(`Shipment not created yet for order ${order.orderNumber}`, 400, "SHIPMENT_NOT_CREATED");
  }
  if (order.shippingMode !== "PLATFORM") {
    throw new AppError(`Shipment ${order.shipmentId} is not a platform shipment`, 400, "INVALID_SHIPPING_MODE");
  }
  if (order.shippingStatus !== READY_FOR_PICKUP_STATUS) {
    throw new AppError(`Shipment ${order.shipmentId} is not ready for pickup`, 400, "SHIPMENT_NOT_READY");
  }
  if (order.pickupScheduled === true) {
    throw new AppError(`Shipment ${order.shipmentId} is already scheduled for pickup`, 409, "PICKUP_ALREADY_SCHEDULED");
  }
}

class PickupService {
  async getVendorContext(userId) {
    const vendor = await vendorRepo.findByUserId(userId);
    if (!vendor) {
      throw new AppError("Vendor profile not found", 404, "VENDOR_NOT_FOUND");
    }
    return vendor;
  }

  async listReadyQueueForVendor(userId, query = {}) {
    const vendor = await this.getVendorContext(userId);
    return await this.listReadyQueueByVendorId(vendor._id, query);
  }

  async listReadyQueueByVendorId(vendorId, query = {}) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter = {
      sellerId: vendorId,
      shipmentId: { $exists: true, $ne: "" },
      shippingMode: "PLATFORM",
      shippingStatus: READY_FOR_PICKUP_STATUS,
      pickupScheduled: false,
      isActive: true,
    };

    const [shipments, total] = await Promise.all([
      Order.find(filter)
        .populate("userId", "name email phone")
        .sort({ pickupRequestedAt: 1, createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .select("orderNumber shipmentId shippingStatus pickupStatus pickupScheduled pickupBatchId courierName deliveryPartner trackingId trackingUrl totalAmount createdAt pickupRequestedAt shippingAddress")
        .lean(),
      Order.countDocuments(filter),
    ]);

    return {
      shipments,
      summary: {
        readyCount: total,
        recommendedThreshold: RECOMMENDED_THRESHOLD,
        recommendation: total >= RECOMMENDED_THRESHOLD ? `Recommended to schedule pickup now: ${total} shipments are ready.` : "",
      },
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async listVendorBatches(userId, query = {}) {
    const vendor = await this.getVendorContext(userId);
    return await this.listBatches({
      vendorId: vendor._id,
      page: query.page,
      limit: query.limit,
      batchId: query.batchId,
      status: query.status,
    });
  }

  async listAdminBatches(query = {}) {
    return await this.listBatches(query);
  }

  async listBatches({ vendorId, page = 1, limit = 20, batchId, status } = {}) {
    const normalizedPage = Math.max(Number(page) || 1, 1);
    const normalizedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const skip = (normalizedPage - 1) * normalizedLimit;
    const filter = {};

    if (vendorId) filter.vendorId = vendorId;
    if (batchId) filter.batchId = { $regex: String(batchId).trim(), $options: "i" };
    if (status) filter.status = status;

    const [batches, total] = await Promise.all([
      PickupBatch.find(filter)
        .populate("vendorId", "shopName companyName supportPhone")
        .sort({ scheduledAt: -1 })
        .skip(skip)
        .limit(normalizedLimit)
        .lean(),
      PickupBatch.countDocuments(filter),
    ]);

    return {
      batches,
      pagination: {
        total,
        page: normalizedPage,
        limit: normalizedLimit,
        pages: Math.ceil(total / normalizedLimit),
      },
    };
  }

  async scheduleVendorPickup(userId, payload = {}) {
    const vendor = await this.getVendorContext(userId);
    return await this.schedulePickupForVendor({
      vendorId: vendor._id,
      shipmentIds: payload.shipmentIds,
      actorRole: "VENDOR",
      actorId: vendor._id,
    });
  }

  async scheduleAdminPickup(payload = {}, actor = {}) {
    return await this.schedulePickupForVendor({
      vendorId: payload.vendorId,
      shipmentIds: payload.shipmentIds,
      actorRole: "ADMIN",
      actorId: actor?.sub || actor?._id,
    });
  }

  async schedulePickupForVendor({ vendorId, shipmentIds, actorRole = "VENDOR", actorId = null }) {
    const normalizedShipmentIds = normalizeShipmentIds(shipmentIds);
    if (!normalizedShipmentIds.length) {
      throw new AppError("shipmentIds must contain at least one shipment id", 400, "SHIPMENT_IDS_REQUIRED");
    }

    const existingOrders = await Order.find({ shipmentId: { $in: normalizedShipmentIds }, isActive: true })
      .select("_id orderNumber sellerId shipmentId shippingMode shippingStatus pickupScheduled pickupBatchId pickupStatus courierName")
      .lean();

    if (existingOrders.length !== normalizedShipmentIds.length) {
      throw new AppError("One or more shipment ids are invalid", 404, "SHIPMENTS_NOT_FOUND");
    }

    const resolvedVendorId = vendorId || existingOrders[0]?.sellerId;
    if (!resolvedVendorId) {
      throw new AppError("Unable to resolve vendor for shipment batch", 400, "VENDOR_RESOLUTION_FAILED");
    }

    existingOrders.forEach((order) => validateReadyShipment(order, resolvedVendorId));

    const idempotencyKey = buildIdempotencyKey(resolvedVendorId, normalizedShipmentIds);
    const existingBatch = await PickupBatch.findOne({ idempotencyKey }).lean();
    if (existingBatch) {
      return {
        batch: existingBatch,
        idempotentReplay: true,
      };
    }

    const pickupResponse = await logisticsService.schedulePickup({
      shipmentIds: normalizedShipmentIds,
      idempotencyKey,
    });

    const now = new Date();
    const scheduledPickupDate = pickupResponse.pickupDate ? new Date(pickupResponse.pickupDate) : now;

    const result = await executeWithOptionalTransaction(async (session) => {
      const orders = await attachSession(Order.find({
        shipmentId: { $in: normalizedShipmentIds },
        isActive: true,
      }), session).exec();

      if (orders.length !== normalizedShipmentIds.length) {
        throw new AppError("One or more shipment ids are no longer available", 409, "SHIPMENTS_CHANGED");
      }

      orders.forEach((order) => validateReadyShipment(order, resolvedVendorId));

      const replayBatch = await attachSession(PickupBatch.findOne({ idempotencyKey }), session).lean();
      if (replayBatch) {
        return {
          batch: replayBatch,
          idempotentReplay: true,
        };
      }

      const batchId = await generateBatchId(resolvedVendorId, now, session);
      const batchPayload = {
        batchId,
        vendorId: resolvedVendorId,
        shipmentIds: normalizedShipmentIds,
        totalShipments: normalizedShipmentIds.length,
        status: "SCHEDULED",
        scheduledAt: now,
        pickupDate: scheduledPickupDate,
        courier: pickupResponse.courierName || orders[0]?.courierName || "",
        idempotencyKey,
        logisticsMetadata: pickupResponse.raw,
        scheduledByRole: actorRole,
        scheduledById: actorId || undefined,
      };

      const [createdBatch] = await PickupBatch.create([batchPayload], { session: session || undefined });

      await Order.updateMany(
        { _id: { $in: orders.map((order) => order._id) } },
        {
          $set: {
            pickupScheduled: true,
            pickupBatchId: batchId,
            shippingStatus: PICKUP_SCHEDULED_STATUS,
            pickupStatus: "SCHEDULED",
            pickupScheduledAt: now,
          },
          $push: {
            timeline: {
              status: "Packed",
              note: `Pickup batch ${batchId} scheduled for shipment ${normalizedShipmentIds.length === 1 ? normalizedShipmentIds[0] : "multiple shipments"}.`,
              changedAt: now,
            },
          },
        },
        { session: session || undefined }
      );

      logger.info("Pickup batch scheduled", {
        source: "pickup.service",
        batchId,
        vendorId: String(resolvedVendorId),
        totalShipments: normalizedShipmentIds.length,
        actorRole,
        actorId: actorId ? String(actorId) : "",
      });

      return {
        batch: createdBatch.toObject(),
        idempotentReplay: false,
      };
    });

    return result;
  }
}

module.exports = new PickupService();
