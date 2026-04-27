const axios = require("axios");
const { AppError } = require("../utils/AppError");

class LogisticsService {
  constructor() {
    this.cachedToken = null;
    this.cachedTokenExpiresAt = 0;
  }

  get providerName() {
    return (process.env.LOGISTICS_PROVIDER || "SHIPROCKET").trim().toUpperCase();
  }

  isConfigured() {
    if (this.providerName !== "SHIPROCKET") return false;
    return Boolean(process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD);
  }

  async getShiprocketToken() {
    if (!this.isConfigured()) {
      throw new AppError("Platform shipping is not configured", 500, "LOGISTICS_NOT_CONFIGURED");
    }

    const now = Date.now();
    if (this.cachedToken && this.cachedTokenExpiresAt > now + 60_000) {
      return this.cachedToken;
    }

    const response = await axios.post("https://apiv2.shiprocket.in/v1/external/auth/login", {
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD,
    });

    const token = response?.data?.token;
    if (!token) {
      throw new AppError("Failed to authenticate logistics provider", 502, "LOGISTICS_AUTH_FAILED");
    }

    this.cachedToken = token;
    this.cachedTokenExpiresAt = now + 8 * 60 * 60 * 1000;
    return token;
  }

  async createPlatformShipment(payload) {
    if (this.providerName !== "SHIPROCKET") {
      throw new AppError("Unsupported logistics provider", 500, "LOGISTICS_PROVIDER_UNSUPPORTED");
    }

    const token = await this.getShiprocketToken();
    const headers = { Authorization: `Bearer ${token}` };

    const createOrderResponse = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/orders/create/adhoc",
      payload,
      { headers }
    );

    const orderData = createOrderResponse?.data || {};
    const shipmentId = orderData?.shipment_id || orderData?.shipment_details?.shipment_id || null;
    if (!shipmentId) {
      throw new AppError("Logistics provider did not return a shipment id", 502, "SHIPMENT_CREATE_FAILED");
    }

    let pickupResponseData = null;
    try {
      const pickupResponse = await axios.post(
        "https://apiv2.shiprocket.in/v1/external/courier/generate/pickup",
        { shipment_id: [shipmentId] },
        { headers }
      );
      pickupResponseData = pickupResponse?.data || null;
    } catch (error) {
      throw new AppError(
        error?.response?.data?.message || "Pickup scheduling failed with logistics provider",
        502,
        "PICKUP_REQUEST_FAILED"
      );
    }

    return {
      provider: "SHIPROCKET",
      shipmentId: String(shipmentId),
      trackingId: orderData?.awb_code || orderData?.awb || "",
      courierName: orderData?.courier_name || "",
      trackingUrl: orderData?.tracking_url || "",
      pickupStatus: pickupResponseData?.pickup_status || "REQUESTED",
      raw: {
        createOrder: orderData,
        pickup: pickupResponseData,
      },
    };
  }
}

module.exports = new LogisticsService();
