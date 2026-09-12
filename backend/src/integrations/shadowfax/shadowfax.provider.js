const axios = require("axios");
const crypto = require("crypto");
const LogisticsProvider = require("../LogisticsProvider");
const { AppError } = require("../../utils/AppError");

class ShadowfaxProvider extends LogisticsProvider {
  get identifier() {
    return "SHADOWFAX";
  }

  get capabilities() {
    return {
      serviceability: false, // not natively used right now in old pipeline for dynamic UI yet
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
    return Boolean(process.env.SHADOWFAX_API_KEY);
  }

  async createShipment(requestPayload) {
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

  async createReverseShipment(requestPayload) {
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

  async requestPickup({ shipmentIds = [], idempotencyKey = "" } = {}) {
    // Shadowfax handles pickup natively through the Order submission flow. No distinct schedule call.
    return {
      provider: "SHADOWFAX",
      pickupStatus: "SCHEDULED",
      courierName: "Shadowfax",
      pickupDate: new Date().toISOString(),
      raw: { note: "Shadowfax handles pickup based on order creation" }
    };
  }

  async generateLabel(trackingId) {
    if (!trackingId) throw new AppError("Tracking ID is required", 400, "MISSING_AWB");
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

  verifyWebhookSignature(rawBody, signature) {
    const secret = process.env.SHADOWFAX_WEBHOOK_SECRET;
    if (!secret) return true; // Accept in test
    if (!signature) throw new AppError("Missing Shadowfax signature", 400, "INVALID_SIGNATURE");
    const expected = crypto.createHmac("sha256", secret).update(String(rawBody || "")).digest("hex");
    if (expected !== signature) {
      throw new AppError("Invalid Shadowfax signature", 400, "INVALID_SIGNATURE");
    }
    return true;
  }
}

module.exports = new ShadowfaxProvider();
