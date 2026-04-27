const { AppError } = require("../utils/AppError");
const orderRepo = require("../repositories/order.repository");
const vendorRepo = require("../repositories/vendor.repository");
const logisticsService = require("./logistics.service");
const {
  applyShippingLifecycle,
  validateCourierName,
  validateTrackingId,
} = require("./shipping.service");

const SERVICEABLE_PINCODE_PATTERN = /^\d{6}$/;

function normalizePickupAddress(vendor) {
  const primary =
    vendor?.pickupLocations?.find?.((location) => location?.isDefault) ||
    vendor?.pickupLocations?.[0] ||
    vendor?.pickupAddress ||
    null;

  if (!primary) {
    throw new AppError(
      "Vendor pickup address is missing. Add a pickup address in vendor settings before requesting pickup.",
      400,
      "PICKUP_ADDRESS_MISSING"
    );
  }

  return {
    name: String(primary.name || vendor?.shopName || vendor?.companyName || "").trim(),
    phone: String(primary.phone || vendor?.supportPhone || "").trim(),
    addressLine1: String(primary.addressLine1 || primary.address || "").trim(),
    addressLine2: String(primary.addressLine2 || "").trim(),
    city: String(primary.city || "").trim(),
    state: String(primary.state || "").trim(),
    pincode: String(primary.pincode || primary.postalCode || "").trim(),
    country: String(primary.country || "India").trim(),
    latitude: Number.isFinite(Number(primary.latitude)) ? Number(primary.latitude) : undefined,
    longitude: Number.isFinite(Number(primary.longitude)) ? Number(primary.longitude) : undefined,
  };
}

function assertPickupAddressIsComplete(pickupAddress) {
  const requiredFields = ["name", "phone", "addressLine1", "city", "state", "pincode", "country"];
  for (const field of requiredFields) {
    if (!pickupAddress[field]) {
      throw new AppError(`Vendor pickup address is incomplete. Missing ${field}.`, 400, "PICKUP_ADDRESS_INCOMPLETE");
    }
  }

  if (!SERVICEABLE_PINCODE_PATTERN.test(pickupAddress.pincode)) {
    throw new AppError("Vendor pickup pincode must be a valid 6-digit serviceable pincode.", 400, "PICKUP_PINCODE_INVALID");
  }
}

function buildPlatformShipmentRequest(order, vendor) {
  const pickupAddress = normalizePickupAddress(vendor);
  assertPickupAddressIsComplete(pickupAddress);

  if (!order?.shippingAddress?.postalCode || !SERVICEABLE_PINCODE_PATTERN.test(String(order.shippingAddress.postalCode).trim())) {
    throw new AppError("Customer delivery pincode is invalid for platform shipping.", 400, "DELIVERY_PINCODE_INVALID");
  }

  return {
    provider: "SHIPROCKET",
    pickupAddress,
    deliveryAddress: {
      fullName: order.shippingAddress.fullName,
      phone: order.shippingAddress.phone,
      line1: order.shippingAddress.line1,
      line2: order.shippingAddress.line2 || "",
      city: order.shippingAddress.city,
      state: order.shippingAddress.state,
      postalCode: order.shippingAddress.postalCode,
      country: order.shippingAddress.country,
    },
    orderDetails: {
      orderId: order.orderNumber,
      orderDate: order.createdAt,
      paymentMethod: order.paymentMethod,
      subtotal: order.subtotal,
      customerEmail: order.userId?.email || vendor?.supportEmail || "support@example.com",
      items: (order.items || []).map((item) => ({
        name: item.name,
        sku: item.variantSku || String(item.productId),
        units: item.quantity,
        sellingPrice: item.price,
      })),
    },
  };
}

function buildShiprocketPayload(platformRequest, vendor) {
  const { orderDetails, deliveryAddress, pickupAddress } = platformRequest;
  return {
    order_id: orderDetails.orderId,
    order_date: new Date(orderDetails.orderDate).toISOString(),
    pickup_location: vendor?.shippingSettings?.preferredPickupLocation || pickupAddress.name || "Primary",
    comment: "Marketplace order shipment",
    billing_customer_name: deliveryAddress.fullName,
    billing_last_name: "",
    billing_address: deliveryAddress.line1,
    billing_address_2: deliveryAddress.line2 || "",
    billing_city: deliveryAddress.city,
    billing_pincode: deliveryAddress.postalCode,
    billing_state: deliveryAddress.state,
    billing_country: deliveryAddress.country,
    billing_email: orderDetails.customerEmail,
    billing_phone: deliveryAddress.phone,
    shipping_is_billing: true,
    order_items: (orderDetails.items || []).map((item) => ({
      name: item.name,
      sku: item.sku,
      units: item.units,
      selling_price: item.sellingPrice,
    })),
    payment_method: orderDetails.paymentMethod === "COD" ? "COD" : "Prepaid",
    sub_total: orderDetails.subtotal,
    length: 10,
    breadth: 10,
    height: 10,
    weight: 1,
  };
}

class DeliveryService {
  async createShipment(order, vendor) {
    let resolvedOrder = order;
    let resolvedVendor = vendor;
    if (typeof order === "string") {
      resolvedOrder = await orderRepo.findById(order);
      if (!resolvedOrder) throw new AppError("Order not found", 404, "NOT_FOUND");
      resolvedVendor = resolvedOrder.sellerId ? await vendorRepo.findById(resolvedOrder.sellerId._id || resolvedOrder.sellerId) : null;
    }
    if (!resolvedOrder) throw new AppError("Order not found", 404, "NOT_FOUND");
    const platformRequest = buildPlatformShipmentRequest(resolvedOrder, resolvedVendor);
    const shipment = await logisticsService.createPlatformShipment({
      ...platformRequest,
      providerPayload: buildShiprocketPayload(platformRequest, resolvedVendor),
    });
    return {
      ...shipment,
      pickupAddress: platformRequest.pickupAddress,
    };
  }

  buildSelfShippingUpdate({ trackingId, courierName }) {
    const nextTrackingId = validateTrackingId(trackingId);
    const nextCourierName = validateCourierName(courierName);
    const lifecycle = applyShippingLifecycle({
      orderStatus: "Packed",
      shippingMode: "SELF",
      shippingStatus: "SHIPPED",
      pickupStatus: "NOT_REQUESTED",
    });

    return {
      trackingId: nextTrackingId,
      courierName: nextCourierName,
      deliveryPartner: nextCourierName,
      trackingUrl: "",
      ...lifecycle,
      deliveryStatus: "SHIPPED",
      courierAssignedAt: new Date(),
    };
  }

  buildPlatformShippingUpdate(order, shipment) {
    const lifecycle = applyShippingLifecycle({
      orderStatus: order.status,
      shippingMode: "PLATFORM",
      shippingStatus: shipment.trackingId ? "IN_TRANSIT" : "READY_FOR_PICKUP",
      pickupStatus: shipment.pickupStatus === "REQUESTED" ? "REQUESTED" : "SCHEDULED",
    });

    return {
      shipmentId: shipment.shipmentId,
      trackingId: shipment.trackingId || order.trackingId,
      trackingUrl: shipment.trackingUrl || order.trackingUrl,
      courierName: shipment.courierName || order.courierName,
      deliveryPartner: shipment.provider,
      logisticsProvider: shipment.provider,
      pickupAddressSnapshot: shipment.pickupAddress,
      logisticsMetadata: shipment.raw,
      pickupStatus: lifecycle.pickupStatus,
      pickupRequestedAt: new Date(),
      shippingMode: "PLATFORM",
      shippingStatus: lifecycle.shippingStatus,
      status: lifecycle.status,
      deliveryStatus: shipment.trackingId ? "SHIPPED" : order.deliveryStatus,
      courierAssignedAt: new Date(),
    };
  }
}

module.exports = new DeliveryService();
