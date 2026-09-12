const { AppError } = require("../utils/AppError");
const providerRegistry = require("../integrations/ProviderRegistry");

// Register providers to the registry
const shadowfaxProvider = require("../integrations/shadowfax/shadowfax.provider");
const shiprocketProvider = require("../integrations/shiprocket/shiprocket.provider");
const delhiveryProvider = require("../integrations/delhivery/delhivery.provider");

providerRegistry.register(shadowfaxProvider);
providerRegistry.register(shiprocketProvider);
providerRegistry.register(delhiveryProvider);

class LogisticsService {
  constructor() {
    this.registry = providerRegistry;
  }

  get providerName() {
    return this.registry.getDefaultProviderId();
  }

  isConfigured() {
    try {
      const provider = this.registry.getProvider(this.providerName);
      return provider.isConfigured();
    } catch {
      return false;
    }
  }

  // Maintains backwards compatibility for Shiprocket specific callers
  async getShiprocketToken() {
    const provider = this.registry.getProvider("SHIPROCKET");
    return provider.getShiprocketToken();
  }

  verifyWebhookSignature(rawBody, signature, targetProvider = null) {
    const providerId = targetProvider || this.providerName;
    const provider = this.registry.getProvider(providerId);
    return provider.verifyWebhookSignature(rawBody, signature);
  }

  verifyShadowfaxWebhookSignature(rawBody, signature) {
    return this.verifyWebhookSignature(rawBody, signature, "SHADOWFAX");
  }

  /**
   * Resolves target provider based on payload or fallbacks to default setup
   */
  _resolveDispatchProvider(requestPayload) {
    // If dynamic checkout populated provider, use it. Otherwise fallback to old logistics configuration
    const assignedProviderId = requestPayload?.order?.logisticsProvider || requestPayload?.provider || this.providerName;
    return this.registry.getProvider(assignedProviderId);
  }

  async createPlatformShipment(requestPayload) {
    const provider = this._resolveDispatchProvider(requestPayload);
    return provider.createShipment(requestPayload);
  }

  async createShadowfaxShipment(requestPayload) {
    const provider = this.registry.getProvider("SHADOWFAX");
    return provider.createShipment(requestPayload);
  }

  async createPlatformReverseShipment(requestPayload) {
    const provider = this._resolveDispatchProvider(requestPayload);
    
    // Safety check as previously only shadowfax supported reverse
    if (provider.identifier !== "SHADOWFAX" && !provider.capabilities.cancellation) {
        throw new AppError("Only Shadowfax is supported for reverse pickups currently.", 503, "LOGISTICS_PROVIDER_UNSUPPORTED");
    }
    return provider.createReverseShipment(requestPayload);
  }

  async createShadowfaxReversePickup(requestPayload) {
    const provider = this.registry.getProvider("SHADOWFAX");
    return provider.createReverseShipment(requestPayload);
  }

  async schedulePickup(params = {}) {
    // Determine provider based on shipmentIds or default if none strictly provided
    // Previously scheduling pickup implicitly used this.providerName. Assumes legacy routing for now unless explicitly mapped later
    const providerId = params.provider || this.providerName;
    const provider = this.registry.getProvider(providerId);
    return provider.requestPickup(params);
  }

  async getShippingLabel(trackingId, targetProvider = null) {
    if (!trackingId) throw new AppError("Tracking ID is required", 400, "MISSING_AWB");
    
    // Resolve the provider safely via legacy input checking
    const providerId = targetProvider || this.providerName;
    const provider = this.registry.getProvider(providerId);
    
    return provider.generateLabel(trackingId);
  }
}

module.exports = new LogisticsService();
