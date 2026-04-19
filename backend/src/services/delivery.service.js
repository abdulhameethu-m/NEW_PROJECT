const axios = require("axios");
const { AppError } = require("../utils/AppError");
const orderRepo = require("../repositories/order.repository");

class DeliveryService {
  async createShipment(orderId) {
    const order = await orderRepo.findById(orderId);
    if (!order) throw new AppError("Order not found", 404, "NOT_FOUND");

    const apiKey = process.env.SHIPROCKET_API_KEY;
    const secret = process.env.SHIPROCKET_SECRET;
    if (!apiKey || !secret) throw new AppError("Shiprocket not configured", 500, "SHIPROCKET_NOT_CONFIGURED");

    // Get token
    const tokenResponse = await axios.post("https://apiv2.shiprocket.in/v1/external/auth/login", {
      email: "your-email@example.com", // Replace with actual
      password: "your-password",
    });
    const token = tokenResponse.data.token;

    // Create shipment
    const shipmentData = {
      order_id: order.orderNumber,
      order_date: order.createdAt.toISOString(),
      pickup_location: "Primary",
      channel_id: "", // Set channel
      comment: "Order shipment",
      billing_customer_name: order.shippingAddress.fullName,
      billing_last_name: "",
      billing_address: order.shippingAddress.line1,
      billing_address_2: order.shippingAddress.line2,
      billing_city: order.shippingAddress.city,
      billing_pincode: order.shippingAddress.postalCode,
      billing_state: order.shippingAddress.state,
      billing_country: order.shippingAddress.country,
      billing_email: "customer@example.com", // From user
      billing_phone: order.shippingAddress.phone,
      shipping_is_billing: true,
      order_items: order.items.map(item => ({
        name: item.name,
        sku: item.productId.toString(),
        units: item.quantity,
        selling_price: item.price,
      })),
      payment_method: order.paymentMethod === "COD" ? "COD" : "Prepaid",
      sub_total: order.subtotal,
      length: 10, // Placeholder
      breadth: 10,
      height: 10,
      weight: 1,
    };

    const response = await axios.post("https://apiv2.shiprocket.in/v1/external/orders/create/adhoc", shipmentData, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const shipment = response.data.shipment_id;
    const trackingId = response.data.awb_code;
    const trackingUrl = `https://shiprocket.in/tracking/${trackingId}`;

    // Update order
    await orderRepo.update(orderId, {
      trackingId,
      trackingUrl,
      deliveryStatus: "SHIPPED",
    });

    return { shipmentId: shipment, trackingId, trackingUrl };
  }
}

module.exports = new DeliveryService();