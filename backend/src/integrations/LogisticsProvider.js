const { AppError } = require("../utils/AppError");

class LogisticsProvider {
  /**
   * Return a canonical identifier, e.g. 'SHADOWFAX'
   */
  get identifier() {
    throw new AppError("Not implemented", 500, "NOT_IMPLEMENTED");
  }

  /**
   * Return feature flags for this provider
   */
  get capabilities() {
    return {
      serviceability: false,
      rates: false,
      shipmentCreation: false,
      label: false,
      pickup: false,
      tracking: false,
      cancellation: false,
      webhook: false,
    };
  }

  /**
   * Initialize or check provider configuration
   */
  isConfigured() {
    return false;
  }

  /**
   * Get serviceability status for pincodes
   */
  async getServiceability(params) {
    throw new AppError("Not implemented", 500, "NOT_IMPLEMENTED");
  }

  /**
   * Get shipping quote/rates
   */
  async getShippingQuote(params) {
    throw new AppError("Not implemented", 500, "NOT_IMPLEMENTED");
  }

  /**
   * Create a forward shipment
   */
  async createShipment(requestPayload) {
    throw new AppError("Not implemented", 500, "NOT_IMPLEMENTED");
  }

  /**
   * Create a reverse pickup shipment
   */
  async createReverseShipment(requestPayload) {
    throw new AppError("Not implemented", 500, "NOT_IMPLEMENTED");
  }

  /**
   * Generate/fetch shipping label
   */
  async generateLabel(trackingId) {
    throw new AppError("Not implemented", 500, "NOT_IMPLEMENTED");
  }

  /**
   * Default schedule pickup logic
   */
  async requestPickup(params = {}) {
    throw new AppError("Not implemented", 500, "NOT_IMPLEMENTED");
  }

  /**
   * Fetch tracking via API
   */
  async trackShipment(trackingId) {
    throw new AppError("Not implemented", 500, "NOT_IMPLEMENTED");
  }

  /**
   * Cancel shipment
   */
  async cancelShipment(trackingId) {
    throw new AppError("Not implemented", 500, "NOT_IMPLEMENTED");
  }

  /**
   * Validate incoming webhook signatures
   */
  verifyWebhookSignature(rawBody, signature) {
    return true; 
  }

  /**
   * Process webhook payload
   */
  async handleWebhook(event) {
    throw new AppError("Not implemented", 500, "NOT_IMPLEMENTED");
  }
}

module.exports = LogisticsProvider;
