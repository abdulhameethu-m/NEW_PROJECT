const axios = require("axios");
const { AppError } = require("../utils/AppError");
const crypto = require("crypto");

class LogisticsService {
  constructor() {
    this.cachedToken = null;
    this.cachedTokenExpiresAt = 0;
  }

  get providerName() {
    return (process.env.LOGISTICS_PROVIDER || "SHIPROCKET").trim().toUpperCase();
  }

  isConfigured() {
    if (this.providerName === "SHADOWFAX") {
      return Boolean(process.env.SHADOWFAX_API_KEY);
    }
    if (this.providerName === "SHIPROCKET") {
      return Boolean(process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD);
    }
    return false;
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

  verifyWebhookSignature(rawBody, signature) {
    if (this.providerName === "SHADOWFAX") {
      return this.verifyShadowfaxWebhookSignature(rawBody, signature);
    }
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

  verifyShadowfaxWebhookSignature(rawBody, signature) {
    const secret = process.env.SHADOWFAX_WEBHOOK_SECRET;
    if (!secret) return true; // Accept in test
    
    // Shadowfax uses HMAC SHA256 usually
    if (!signature) throw new AppError("Missing Shadowfax signature", 400, "INVALID_SIGNATURE");
    const expected = crypto.createHmac("sha256", secret).update(String(rawBody || "")).digest("hex");
    if (expected !== signature) {
      throw new AppError("Invalid Shadowfax signature", 400, "INVALID_SIGNATURE");
    }
    return true;
  }

  async createPlatformShipment(requestPayload) {
    if (this.providerName === "SHADOWFAX") {
      return this.createShadowfaxShipment(requestPayload);
    }
    
    if (this.providerName !== "SHIPROCKET") {
      throw new AppError("Unsupported logistics provider", 503, "LOGISTICS_PROVIDER_UNSUPPORTED");
    }

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

  async createShadowfaxShipment(requestPayload) {
    const providerPayload = requestPayload?.providerPayload || {};
    const apiKey = process.env.SHADOWFAX_API_KEY;
    const baseUrl = process.env.SHADOWFAX_BASE_URL || "https://dale.staging.shadowfax.in";
    
    const headers = { 
      "Authorization": `Token ${apiKey}`,
      "Content-Type": "application/json"
    };

    try {
      const response = await axios.post(`${baseUrl}/api/v3/clients/orders`, providerPayload, { headers });
      const apiResponse = response?.data || {};
      const payloadData = apiResponse.data || apiResponse;
      
      const trackingId = payloadData.awb_number || payloadData.tracking_id;
      if (!trackingId) {
        throw new AppError("Shadowfax did not return an AWB on forward shipment. Response: " + JSON.stringify(apiResponse), 502, "SHIPMENT_CREATE_FAILED");
      }

      return {
        provider: "SHADOWFAX",
        shipmentId: payloadData.client_order_id || payloadData.client_order_number || String(trackingId),
        trackingId: String(trackingId),
        courierName: "Shadowfax",
        trackingUrl: payloadData.tracking_url || `https://track.shadowfax.in/track?awb=${trackingId}`,
        raw: {
          request: requestPayload,
          createOrder: apiResponse,
        }
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      const errorData = error?.response?.data;
      const errorMsg = errorData?.message || (errorData ? JSON.stringify(errorData) : error.message || "Shadowfax shipment creation failed");
      console.error("Shadowfax API Error:", errorMsg, "Payload:", JSON.stringify(providerPayload));
      throw new AppError(errorMsg, 502, "SHIPMENT_CREATE_FAILED");
    }
  }

  async createPlatformReverseShipment(requestPayload) {
    if (this.providerName === "SHADOWFAX") {
      return this.createShadowfaxReversePickup(requestPayload);
    }
    throw new AppError("Only Shadowfax is supported for reverse pickups currently.", 503, "LOGISTICS_PROVIDER_UNSUPPORTED");
  }

  async createShadowfaxReversePickup(requestPayload) {
    const providerPayload = requestPayload?.providerPayload || {};
    const apiKey = process.env.SHADOWFAX_API_KEY;
    const baseUrl = process.env.SHADOWFAX_BASE_URL || "https://dale.staging.shadowfax.in";
    
    const headers = { 
      "Authorization": `Token ${apiKey}`,
      "Content-Type": "application/json"
    };

    try {
      const response = await axios.post(`${baseUrl}/api/v3/clients/requests`, providerPayload, { headers });
      const apiResponse = response?.data || {};
      const payloadData = apiResponse.data || apiResponse;
      
      const trackingId = payloadData.client_request_id || payloadData.awb_number || payloadData.tracking_id;
      if (!trackingId) {
        throw new AppError("Shadowfax did not return an AWB for reverse pickup. Response: " + JSON.stringify(apiResponse), 502, "REVERSE_CREATE_FAILED");
      }

      return {
        provider: "SHADOWFAX",
        shipmentId: payloadData.client_order_number || String(trackingId),
        trackingId: String(trackingId),
        courierName: "Shadowfax",
        trackingUrl: payloadData.tracking_url || `https://track.shadowfax.in/track?awb=${trackingId}`,
        raw: {
          request: requestPayload,
          createOrder: apiResponse,
        }
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      const errorData = error?.response?.data;
      const errorMsg = errorData?.message || (errorData ? JSON.stringify(errorData) : error.message || "Shadowfax reverse pickup creation failed");
      console.error("Shadowfax Reverse API Error:", errorMsg, "Payload:", JSON.stringify(providerPayload));
      throw new AppError(errorMsg, 502, "REVERSE_CREATE_FAILED");
    }
  }

  async schedulePickup({ shipmentIds = [], idempotencyKey = "" } = {}) {
    if (this.providerName === "SHADOWFAX") {
      return {
        provider: "SHADOWFAX",
        pickupStatus: "SCHEDULED",
        courierName: "Shadowfax",
        pickupDate: new Date().toISOString(),
        raw: { note: "Shadowfax handles pickup based on order creation" }
      };
    }

    if (this.providerName !== "SHIPROCKET") {
      throw new AppError("Unsupported logistics provider", 503, "LOGISTICS_PROVIDER_UNSUPPORTED");
    }

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

  async getShippingLabel(trackingId, targetProvider) {
    if (!trackingId) throw new AppError("Tracking ID is required", 400, "MISSING_AWB");
    
    const provider = targetProvider || this.providerName;

    if (provider === "SHADOWFAX") {
      const apiKey = process.env.SHADOWFAX_API_KEY;
      const baseUrl = process.env.SHADOWFAX_BASE_URL || "https://dale.staging.shadowfax.in";
      try {
        const response = await axios.get(`${baseUrl}/api/v2/clients/awb/pdf/?awb_numbers=${trackingId}`, {
          headers: { Authorization: `Token ${apiKey}` },
          responseType: "arraybuffer"
        });
        return { buffer: response.data, contentType: "application/pdf" };
      } catch (error) {
        console.error("Shadowfax PDF API failed, falling back to generated label:", error?.response?.data?.toString?.() || error.message);
        try {
          const PDFDocument = require("pdfkit");
          return await new Promise((resolve) => {
            const doc = new PDFDocument({ size: [288, 432], margin: 15 }); // 4x6 inch label
            const chunks = [];
            doc.on("data", (chunk) => chunks.push(chunk));
            doc.on("end", () => resolve({ buffer: Buffer.concat(chunks), contentType: "application/pdf" }));
            
            doc.rect(5, 5, 278, 422).stroke();
            doc.fontSize(20).font("Helvetica-Bold").text("SHADOWFAX", { align: "center" });
            doc.moveDown(0.5);
            doc.fontSize(10).font("Helvetica").text("STANDARD SHIPPING LABEL", { align: "center" });
            doc.moveDown(2);
            doc.fontSize(12).text(`AWB / Tracking ID:`, { align: "center" });
            doc.fontSize(16).font("Helvetica-Bold").text(`${trackingId}`, { align: "center" });
            
            doc.moveDown(2);
            doc.rect(44, 180, 200, 60).stroke();
            doc.fontSize(10).font("Helvetica").text("* B A R C O D E *", 44, 205, { align: "center", width: 200 });
            
            doc.moveDown(5);
            doc.fontSize(10).text("Date Generated: " + new Date().toLocaleDateString(), { align: "center" });
            doc.end();
          });
        } catch (pdfError) {
          throw new AppError("Failed to download standard Shadowfax label format.", 502, "LABEL_DOWNLOAD_FAILED");
        }
      }
    }

    if (provider === "SHIPROCKET") {
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

    throw new AppError("Unsupported provider for shipping label", 400, "PROVIDER_UNSUPPORTED");
  }
}

module.exports = new LogisticsService();
