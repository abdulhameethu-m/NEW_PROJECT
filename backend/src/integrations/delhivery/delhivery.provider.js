const LogisticsProvider = require("../LogisticsProvider");
const DelhiveryClient = require("./delhivery.client");
const { AppError } = require("../../utils/AppError");

class DelhiveryProvider extends LogisticsProvider {
  constructor() {
    super();
    this._client = null;
  }

  get client() {
    if (!this._client) {
      if (!this.isConfigured()) throw new AppError("Delhivery properties not set", 503, "NOT_CONFIGURED");
      this._client = new DelhiveryClient();
    }
    return this._client;
  }

  get identifier() {
    return "DELHIVERY";
  }

  get capabilities() {
    return {
      serviceability: true,
      rates: true,
      shipmentCreation: true,
      label: true,
      pickup: true,
      tracking: true,
      cancellation: true,
      webhook: true,
    };
  }

  isConfigured() {
    return Boolean(process.env.DELHIVERY_API_TOKEN && process.env.DELHIVERY_BASE_URL);
  }

  async getServiceability(params) {
    const { destinationPincode } = params;
    try {
      const response = await this.client.checkServiceability(destinationPincode);
      // Delhivery returns: { delivery_codes: [{ postal_code: { pin, cod, pre_paid, pickup } }] }
      const postalData = response?.delivery_codes?.[0]?.postal_code;
      const isServiceable = !!(postalData?.pre_paid === "Y" || postalData?.cod === "Y");
      return {
        provider: this.identifier,
        isServiceable,
        metadata: postalData || {}
      };
    } catch (e) {
      // If serviceability API call fails, treat as serviceable to not block checkout
      console.warn("[Delhivery] Serviceability check failed:", e.message);
      return { provider: this.identifier, isServiceable: true, metadata: {} };
    }
  }

  async getShippingQuote(params) {
    const { originPincode, destinationPincode, weightGrams, paymentMode } = params;
    try {
      const response = await this.client.getShippingCost({
        originPincode,
        destinationPincode,
        weightGrams,
        paymentMode: paymentMode === "COD" ? "COD" : "Pre-paid",
      });
      // Delhivery rate response is an array of charge objects
      // Fields: total_amount, freight_charge, cod_charges, etc.
      const rateData = Array.isArray(response) ? response[0] : response;
      const cost = rateData?.total_amount || rateData?.freight_charge || rateData?.charge || 0;
      const etaDays = rateData?.estimated_days || rateData?.tat || 4;
      return {
        provider: this.identifier,
        service: "Surface Express",
        cost: Number(cost) || 0,
        estimatedDeliveryDays: Number(etaDays) || 4,
        raw: response,
      };
    } catch (e) {
      console.warn("[Delhivery] Rate fetch failed:", e.message);
      throw new AppError("Delhivery quote retrieval failed: " + e.message, 502, "RATE_UNAVAILABLE");
    }
  }

  async createShipment(requestPayload) {
    // Expected to receive UCHOOSEME internal unified payload format
    // Map to Delhivery format: { format: 'json', data: JSON.stringify({...}) }
    const mappedData = requestPayload?.providerPayload || {}; 
    const payload = `format=json&data=${encodeURIComponent(JSON.stringify(mappedData))}`;

    const apiResponse = await this.client.createShipment(payload);
    
    // Delhivery usually returns 'packages' array
    const awb = apiResponse?.packages?.[0]?.waybill;
    if (!awb) throw new AppError("Delhivery did not return waybill", 502, "SHIPMENT_CREATE_FAILED");

    return {
      provider: this.identifier,
      shipmentId: apiResponse?.packages?.[0]?.client || String(awb),
      trackingId: String(awb),
      courierName: "Delhivery",
      trackingUrl: `https://www.delhivery.com/track/package/${awb}`,
      raw: {
        request: requestPayload,
        createOrder: apiResponse,
      }
    };
  }

  async createReverseShipment(requestPayload) {
    // Reverse usually shares the same API logic conceptually for creation but a different shipment mode 'Return'
    throw new AppError("Delhivery reverse shipment not implemented in MVP", 500, "NOT_IMPLEMENTED");
  }

  async requestPickup(params = {}) {
    const data = params?.providerPayload || {};
    const apiResponse = await this.client.requestPickup(data);
    return {
      provider: this.identifier,
      pickupStatus: "SCHEDULED",
      courierName: "Delhivery",
      pickupDate: apiResponse?.pickup_date || new Date().toISOString(),
      raw: apiResponse
    };
  }

  async generateLabel(trackingId) {
    if (!trackingId) throw new AppError("Tracking ID is required", 400, "MISSING_AWB");
    try {
      const buffer = await this.client.getLabel(trackingId);
      return { buffer, contentType: "application/pdf" };
    } catch (error) {
      throw new AppError("Delhivery label retrieval failed", 502, "LABEL_DOWNLOAD_FAILED");
    }
  }

  verifyWebhookSignature(rawBody, signature) {
    // Delhivery has a distinct mechanism for verification based on IP filtering usually, or basic auth / token matching
    // Keeping permissive unless strictly defined by docs
    return true;
  }
}

module.exports = new DelhiveryProvider();
