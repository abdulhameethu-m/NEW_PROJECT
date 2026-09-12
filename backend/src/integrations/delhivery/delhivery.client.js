const axios = require("axios");
const qs = require("querystring");
const { AppError } = require("../../utils/AppError");

class DelhiveryClient {
  constructor() {
    this.baseUrl = process.env.DELHIVERY_BASE_URL || "https://staging-express.delhivery.com";
    this.apiToken = process.env.DELHIVERY_API_TOKEN;

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: Number(process.env.DELHIVERY_TIMEOUT_MS) || 12000,
      headers: {
        // Delhivery uses "Token <value>" not "Bearer"
        Authorization: `Token ${this.apiToken}`,
        "Content-Type": "application/json",
      },
    });

    // Intercept errors to format them securely
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const status = error?.response?.status;
        const data = error?.response?.data;
        let message = "Delhivery API Error";
        if (data?.error) message = typeof data.error === "string" ? data.error : JSON.stringify(data.error);
        if (data?.message) message = data.message;
        if (data?.detail) message = data.detail;
        console.error(`[DelhiveryClient] Error ${status}: ${message}`, data);
        throw new AppError(message, 502, "DELHIVERY_API_ERROR");
      }
    );
  }

  /**
   * Pincode Serviceability
   * GET /c/api/pin-codes/json/?filter_codes=<pincode>
   */
  async checkServiceability(pincode) {
    if (!pincode) throw new AppError("Pincode required for serviceability", 400, "MISSING_PINCODE");
    // Note: correct path is  /c/api/pin-codes/json/  (plural, with dash)
    const response = await this.client.get(`/c/api/pin-codes/json/?filter_codes=${pincode}`);
    return response.data;
  }

  /**
   * Shipping Cost Estimate
   * GET /api/kinko/v1/invoice/charges/.json
   * md: S=Surface, A=Air
   * ss: EXP=Express, STD=Standard
   * pt: Pre-paid | COD
   * cgm: weight in grams
   */
  async getShippingCost({ originPincode, destinationPincode, weightGrams, paymentMode = "Pre-paid" }) {
    const response = await this.client.get("/api/kinko/v1/invoice/charges/.json", {
      params: {
        md: "S",        // Surface mode
        ss: "Delivered", // Service type - must be: Delivered, RTO, DTO
        d_pin: destinationPincode,
        o_pin: originPincode,
        cgm: Math.ceil(weightGrams / 100) * 100, // round to nearest 100g slab
        pt: paymentMode,
        cod: paymentMode === "COD" ? 1 : 0,
      },
    });
    return response.data;
  }

  /**
   * Create Shipment (Manifestation)
   * POST /api/cmu/create.json
   * Body MUST be form-encoded: format=json&data=<json-string>
   */
  async createShipment(shipmentData) {
    const dataString = typeof shipmentData === "string" ? shipmentData : JSON.stringify(shipmentData);
    const body = `format=json&data=${encodeURIComponent(dataString)}`;
    const response = await this.client.post("/api/cmu/create.json", body, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return response.data;
  }

  /**
   * Schedule Pickup
   * POST /fm/request/new/
   */
  async requestPickup(payload) {
    const response = await this.client.post("/fm/request/new/", payload);
    return response.data;
  }

  /**
   * Track a shipment
   * GET /api/v1/packages/json/?waybill=<awb>
   */
  async trackShipment(waybill) {
    const response = await this.client.get(`/api/v1/packages/json/?waybill=${waybill}&verbose=0`);
    return response.data;
  }

  /**
   * Download shipping label (PDF)
   * GET /api/p/packingslip?wbns=<waybill>&pdf=true
   */
  async getLabel(waybill) {
    const response = await this.client.get(`/api/p/packingslip?wbns=${waybill}&pdf=true`, {
      responseType: "arraybuffer",
    });
    return response.data;
  }
}

module.exports = DelhiveryClient;
