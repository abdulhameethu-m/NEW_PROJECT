const axios = require("axios");
const crypto = require("crypto");
const LogisticsProvider = require("../LogisticsProvider");
const { AppError } = require("../../utils/AppError");

class ShiprocketProvider extends LogisticsProvider {
  constructor() {
    super();
    this.cachedToken = null;
    this.cachedTokenExpiresAt = 0;
  }

  get identifier() {
    return "SHIPROCKET";
  }

  get capabilities() {
    return {
      serviceability: false,
      rates: false,
      shipmentCreation: true,
      label: true,
      pickup: true,
      tracking: false,
      cancellation: false,
      webhook: true,
    };
  }

  isConfigured() {
    return Boolean(process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD);
  }

  async getShiprocketToken() {
    if (!this.isConfigured()) {
      throw new AppError(
        "Platform shipping is not configured. Add SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD in backend/.env.",
        503,
        "LOGISTICS_NOT_CONFIGURED"
      );
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

  async createShipment(requestPayload) {
    const token = await this.getShiprocketToken();
    const headers = { Authorization: `Bearer ${token}` };
    const providerPayload = requestPayload?.providerPayload || requestPayload || {};

    const createOrderResponse = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/orders/create/adhoc",
      providerPayload,
      { headers }
    );

    const orderData = createOrderResponse?.data || {};
    const shipmentId = orderData?.shipment_id || orderData?.shipment_details?.shipment_id || null;
    if (!shipmentId) {
      throw new AppError("Logistics provider did not return a shipment id", 502, "SHIPMENT_CREATE_FAILED");
    }

    return {
      provider: "SHIPROCKET",
      shipmentId: String(shipmentId),
      trackingId: orderData?.awb_code || orderData?.awb || "",
      courierName: orderData?.courier_name || "",
      trackingUrl: orderData?.tracking_url || "",
      raw: {
        request: requestPayload,
        createOrder: orderData,
      },
    };
  }

  async requestPickup({ shipmentIds = [], idempotencyKey = "" } = {}) {
    const normalizedShipmentIds = [...new Set((Array.isArray(shipmentIds) ? shipmentIds : []).map((id) => String(id).trim()).filter(Boolean))];
    if (!normalizedShipmentIds.length) {
      throw new AppError("At least one shipment is required to schedule pickup", 400, "SHIPMENT_IDS_REQUIRED");
    }

    const token = await this.getShiprocketToken();
    const headers = { Authorization: `Bearer ${token}` };
    if (idempotencyKey) {
      headers["X-Idempotency-Key"] = idempotencyKey;
    }

    try {
      const pickupResponse = await axios.post(
        "https://apiv2.shiprocket.in/v1/external/courier/generate/pickup",
        { shipment_id: normalizedShipmentIds },
        { headers }
      );
      const pickupResponseData = pickupResponse?.data || {};
      return {
        provider: "SHIPROCKET",
        pickupStatus: pickupResponseData?.pickup_status || "SCHEDULED",
        courierName: pickupResponseData?.courier_name || pickupResponseData?.data?.courier_name || "",
        pickupDate: pickupResponseData?.pickup_scheduled_date || pickupResponseData?.pickup_date || pickupResponseData?.data?.pickup_date || null,
        raw: pickupResponseData,
      };
    } catch (error) {
      throw new AppError(
        error?.response?.data?.message || "Pickup scheduling failed with logistics provider",
        502,
        "PICKUP_REQUEST_FAILED"
      );
    }
  }

  async generateLabel(trackingId) {
    if (!trackingId) throw new AppError("Tracking ID is required", 400, "MISSING_AWB");
    
    const token = await this.getShiprocketToken();
    try {
      const response = await axios.post("https://apiv2.shiprocket.in/v1/external/courier/generate/awb", { awb: [trackingId] }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const url = response.data?.awb_url;
      if (!url) throw new Error("No URL returned from Shiprocket");
      const pdfResponse = await axios.get(url, { responseType: "arraybuffer" });
      return { buffer: pdfResponse.data, contentType: "application/pdf" };
    } catch (error) {
      throw new AppError("Failed to fetch Shiprocket label", 502, "LABEL_DOWNLOAD_FAILED");
    }
  }

  verifyWebhookSignature(rawBody, signature) {
    const secret = process.env.SHIPROCKET_WEBHOOK_SECRET;
    if (!secret) {
      if (process.env.NODE_ENV === "production") {
        throw new AppError("Logistics webhook secret is not configured", 500, "WEBHOOK_NOT_CONFIGURED");
      }
      return true;
    }
    if (!signature) {
      throw new AppError("Missing logistics webhook signature", 400, "INVALID_SIGNATURE");
    }

    const expected = crypto.createHmac("sha256", secret).update(String(rawBody || "")).digest("hex");
    const left = Buffer.from(String(expected));
    const right = Buffer.from(String(signature));
    if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
      throw new AppError("Invalid logistics webhook signature", 400, "INVALID_SIGNATURE");
    }

    return true;
  }
}

module.exports = new ShiprocketProvider();
