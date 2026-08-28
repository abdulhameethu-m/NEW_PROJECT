const { AppError } = require("../utils/AppError");
const orderRepo = require("../repositories/order.repository");
const vendorRepo = require("../repositories/vendor.repository");
const logisticsService = require("./logistics.service");
const { VendorPickupAddress } = require("../models/VendorPickupAddress");
const {
  applyShippingLifecycle,
  validateCourierName,
  validateTrackingId,
} = require("./shipping.service");

const SERVICEABLE_PINCODE_PATTERN = /^\d{6}$/;

async function normalizePickupAddress(vendor) {
  const externalPickup = vendor?._id
    ? await VendorPickupAddress.findOne({ vendorId: vendor._id, isActive: true }).lean()
    : null;
  const primary =
    externalPickup
      ? {
          name: externalPickup.name,
          phone: externalPickup.phone,
          addressLine1: externalPickup.address,
          city: externalPickup.city,
          state: externalPickup.state,
          pincode: externalPickup.pincode,
          country: "India",
        }
      :
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

async function buildPlatformShipmentRequest(order, vendor) {
  const pickupAddress = await normalizePickupAddress(vendor);
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
      items: (order.items || []).map((item) => {
        const itemWeight = Number(item?.weight?.value || 0);
        return {
          name: item.name,
          sku: item.variantSku || String(item.productId),
          units: item.quantity,
          sellingPrice: item.price,
          weight: itemWeight > 0 ? itemWeight : undefined,
        };
      }),
    },
  };
}

function buildShiprocketPayload(platformRequest, vendor) {
  const { orderDetails, deliveryAddress, pickupAddress } = platformRequest;
  const totalWeight = (orderDetails.items || []).reduce(
    (sum, item) => sum + Number(item.weight || 0) * Number(item.units || 0),
    0
  );
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
    weight: totalWeight > 0 ? Number(totalWeight.toFixed(3)) : 1,
  };
}

function buildShadowfaxPayload(platformRequest, vendor) {
  const { orderDetails, deliveryAddress, pickupAddress } = platformRequest;
  const totalWeight = (orderDetails.items || []).reduce(
    (sum, item) => sum + Number(item.weight || 0) * Number(item.units || 0),
    0
  );
  
  const isSandbox = (process.env.SHADOWFAX_BASE_URL || "staging").includes("staging");
  const overridePickupPincode = isSandbox ? 560007 : pickupAddress.pincode;
  const overrideCustomerPincode = isSandbox ? 110009 : deliveryAddress.postalCode;

  return {
    order_type: "marketplace",
    order_details: {
      client_order_id: String(orderDetails.orderId),
      product_value: orderDetails.subtotal,
      payment_mode: orderDetails.paymentMethod === "COD" ? "COD" : "Prepaid",
      cod_amount: orderDetails.paymentMethod === "COD" ? orderDetails.total : 0,
      total_amount: orderDetails.total || orderDetails.subtotal,
      actual_weight: totalWeight > 0 ? Number(totalWeight.toFixed(3)) : 1,
    },
    customer_details: {
      name: deliveryAddress.fullName,
      contact: deliveryAddress.phone,
      address_line_1: deliveryAddress.line1,
      address_line_2: deliveryAddress.line2 || "",
      city: deliveryAddress.city,
      state: deliveryAddress.state,
      pincode: overrideCustomerPincode,
    },
    pickup_details: {
      name: vendor?.shopName || pickupAddress.name || "Vendor",
      contact: pickupAddress.phone,
      address_line_1: pickupAddress.addressLine1,
      address_line_2: pickupAddress.addressLine2 || "",
      city: pickupAddress.city,
      state: pickupAddress.state,
      pincode: overridePickupPincode,
    },
    rts_details: {
      name: vendor?.shopName || pickupAddress.name || "Vendor",
      contact: pickupAddress.phone,
      address_line_1: pickupAddress.addressLine1,
      address_line_2: pickupAddress.addressLine2 || "",
      city: pickupAddress.city,
      state: pickupAddress.state,
      pincode: overridePickupPincode,
    },
    product_details: (orderDetails.items || []).map((item) => ({
      sku_name: item.name,
      category: "electronics", // Mandatory field in most shadowfax implementations
      price: item.sellingPrice,
      seller_details: {
        seller_name: vendor?.shopName || "Vendor",
        seller_address: pickupAddress.addressLine1,
        seller_state: pickupAddress.state,
      },
      additional_details: {
        quantity: item.units,
      }
    }))
  };
}

function buildShadowfaxReversePickupPayload(returnRequest, order, vendor, pickupAddress) {
  const isSandbox = (process.env.SHADOWFAX_BASE_URL || "staging").includes("staging");
  const overrideVendorPincode = isSandbox ? 560007 : pickupAddress.pincode;
  const overrideCustomerPincode = isSandbox ? 110009 : order.shippingAddress.postalCode;

  return {
    client_order_number: String(returnRequest._id),
    warehouse_name: vendor?.shopName || vendor?.companyName || pickupAddress.name || "Vendor",
    warehouse_address: pickupAddress.addressLine1 || "",
    destination_pincode: overrideVendorPincode,
    pickup_type: "regular",
    price: Number(returnRequest.unitPrice || 0) * Number(returnRequest.quantity || 1),
    total_amount: Number(returnRequest.unitPrice || 0) * Number(returnRequest.quantity || 1),
    address_attributes: {
      name: order.shippingAddress.fullName,
      address_line: order.shippingAddress.line1,
      city: order.shippingAddress.city,
      state: order.shippingAddress.state,
      pincode: overrideCustomerPincode,
      phone_number: order.shippingAddress.phone,
    },
    skus_attributes: [
      {
        name: returnRequest.productName || "Return Item",
        client_sku_id: String(returnRequest.productId),
        price: Number(returnRequest.unitPrice || 0),
        return_reason: returnRequest.reasonCode || "Customer Return",
        seller_details: {
          regd_name: vendor?.shopName || vendor?.companyName || pickupAddress.name || "Vendor",
          regd_address: pickupAddress.addressLine1 || "Vendor Address",
          state: pickupAddress.state || "State",
          gstin: vendor?.taxDetails?.gstin || vendor?.gstin || "22AAAAA0000A1Z5" 
        },
        taxes: {
          cgst_amount: 0.0,
          sgst_amount: 0.0,
          igst_amount: 0.0,
          total_tax_amount: 0.0
        },
        hsn_code: "85171200", 
        invoice_id: order?.invoiceNumber || "INV-" + (order?.orderNumber || "1")
      }
    ]
  };
}

class DeliveryService {
  async createReverseShipment(returnRequest, order, vendor) {
    const pickupAddress = await normalizePickupAddress(vendor);
    assertPickupAddressIsComplete(pickupAddress);

    if (!order?.shippingAddress?.postalCode || !SERVICEABLE_PINCODE_PATTERN.test(String(order.shippingAddress.postalCode).trim())) {
      throw new AppError("Customer pickup pincode is invalid for platform reverse shipping.", 400, "PICKUP_PINCODE_INVALID");
    }

    const platformRequest = {
      pickupAddress,
      order,
      returnRequest
    };

    const isShadowfax = logisticsService.providerName === "SHADOWFAX";
    
    if (!isShadowfax) {
      throw new AppError("Only Shadowfax is currently supported for Reverse Pickups.", 503, "LOGISTICS_PROVIDER_UNSUPPORTED");
    }

    const providerPayload = buildShadowfaxReversePickupPayload(returnRequest, order, vendor, pickupAddress);

    const shipment = await logisticsService.createPlatformReverseShipment({
      ...platformRequest,
      providerPayload,
    });
    
    return {
      ...shipment,
      vendorAddress: pickupAddress,
    };
  }

  async createShipment(order, vendor) {
    let resolvedOrder = order;
    let resolvedVendor = vendor;
    if (typeof order === "string") {
      resolvedOrder = await orderRepo.findById(order);
      if (!resolvedOrder) throw new AppError("Order not found", 404, "NOT_FOUND");
      resolvedVendor = resolvedOrder.sellerId ? await vendorRepo.findById(resolvedOrder.sellerId._id || resolvedOrder.sellerId) : null;
    }
    if (!resolvedOrder) throw new AppError("Order not found", 404, "NOT_FOUND");
    const platformRequest = await buildPlatformShipmentRequest(resolvedOrder, resolvedVendor);
    
    // Choose correct payload builder based on `.env` configuration
    const isShadowfax = logisticsService.providerName === "SHADOWFAX";
    const providerPayload = isShadowfax 
      ? buildShadowfaxPayload(platformRequest, resolvedVendor) 
      : buildShiprocketPayload(platformRequest, resolvedVendor);

    const shipment = await logisticsService.createPlatformShipment({
      ...platformRequest,
      providerPayload,
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
      shippingStatus: "READY_FOR_PICKUP",
      pickupStatus: "NOT_REQUESTED",
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
      pickupScheduled: false,
      pickupBatchId: "",
      pickupStatus: lifecycle.pickupStatus,
      pickupRequestedAt: new Date(),
      shippingMode: "PLATFORM",
      shippingStatus: lifecycle.shippingStatus,
      status: lifecycle.status,
      deliveryStatus: order.deliveryStatus,
      courierAssignedAt: new Date(),
    };
  }
}

module.exports = new DeliveryService();
