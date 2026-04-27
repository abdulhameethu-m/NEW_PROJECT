const { AppError } = require("../utils/AppError");
const orderRepo = require("../repositories/order.repository");
const vendorRepo = require("../repositories/vendor.repository");
const logisticsService = require("./logistics.service");
const {
  applyShippingLifecycle,
  validateCourierName,
  validateTrackingId,
} = require("./shipping.service");

function buildShiprocketPayload(order, vendor) {
  return {
    order_id: order.orderNumber,
    order_date: order.createdAt.toISOString(),
    pickup_location: vendor?.shippingSettings?.preferredPickupLocation || "Primary",
    comment: "Marketplace order shipment",
    billing_customer_name: order.shippingAddress.fullName,
    billing_last_name: "",
    billing_address: order.shippingAddress.line1,
    billing_address_2: order.shippingAddress.line2 || "",
    billing_city: order.shippingAddress.city,
    billing_pincode: order.shippingAddress.postalCode,
    billing_state: order.shippingAddress.state,
    billing_country: order.shippingAddress.country,
    billing_email: order.userId?.email || vendor?.supportEmail || "support@example.com",
    billing_phone: order.shippingAddress.phone,
    shipping_is_billing: true,
    order_items: (order.items || []).map((item) => ({
      name: item.name,
      sku: item.variantSku || String(item.productId),
      units: item.quantity,
      selling_price: item.price,
    })),
    payment_method: order.paymentMethod === "COD" ? "COD" : "Prepaid",
    sub_total: order.subtotal,
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
    const payload = buildShiprocketPayload(resolvedOrder, resolvedVendor);
    return await logisticsService.createPlatformShipment(payload);
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
