const { AppError } = require("../utils/AppError");

class ProviderRegistry {
  constructor() {
    this.providers = new Map();
  }

  register(provider) {
    if (!provider || !provider.identifier) {
      throw new AppError("Invalid provider format", 500, "PROVIDER_REGISTRATION_FAILED");
    }
    this.providers.set(provider.identifier, provider);
  }

  getProvider(identifier) {
    const provider = this.providers.get(identifier);
    if (!provider) {
      // In backward compatibility mode, or if misconfigured
      throw new AppError(`Logistics provider ${identifier} not configured or missing`, 503, "LOGISTICS_PROVIDER_UNSUPPORTED");
    }
    return provider;
  }

  getAllProviders() {
    return Array.from(this.providers.values());
  }
  
  getEnabledProviders() {
    return this.getAllProviders().filter(p => p.isConfigured());
  }

  // To support legacy env routing
  getDefaultProviderId() {
    return (process.env.LOGISTICS_PROVIDER || "SHIPROCKET").trim().toUpperCase();
  }
}

// Export singleton instance
module.exports = new ProviderRegistry();
