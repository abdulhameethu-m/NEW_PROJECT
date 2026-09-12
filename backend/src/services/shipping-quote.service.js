const crypto = require("crypto");
const providerRegistry = require("../integrations/ProviderRegistry");
const configService = require("./config.service");
const { AppError } = require("../utils/AppError");

// In-memory simplistic cache for quotes. In production, Redis is strongly recommended.
const QuoteStore = new Map();

// Default fallback pricing per provider when no live API quote is available
const PROVIDER_FALLBACK_RATES = {
  SHIPROCKET: { baseRate: 65, estimatedDays: 5, service: "Express Air" },
  SHADOWFAX: { baseRate: 50, estimatedDays: 3, service: "Fast Delivery" },
  DELHIVERY: { baseRate: 55, estimatedDays: 4, service: "Surface" },
};

// Default providers to show even if no API credentials are set
const DEFAULT_ACTIVE_PROVIDERS = ["SHIPROCKET", "SHADOWFAX", "DELHIVERY"];

class ShippingQuoteService {
  /**
   * Generates a new shipping quote from all enabled providers.
   * Falls back to static pricing estimates if live API is unavailable.
   */
  async generateQuotes({ originPincode, destinationPincode, weightGrams, paymentMode = "PREPAID", cartId, userId }) {
    if (!destinationPincode || !originPincode) {
      throw new AppError("originPincode and destinationPincode are required", 400, "MISSING_QUOTE_PARAMS");
    }
    const safeWeight = Number(weightGrams) || 500;

    // Read admin configured active providers
    let activeList = [...DEFAULT_ACTIVE_PROVIDERS];
    try {
      const dbConfig = await configService.getConfigByKey("active_logistics_providers");
      activeList = Array.isArray(dbConfig?.value) && dbConfig.value.length ? dbConfig.value : activeList;
    } catch (_) {
      // Fallback safely
    }

    // Read admin configured pricing rules
    let partnerRules = {};
    try {
      const dbRules = await configService.getConfigByKey("logistics_partner_pricing_rules");
      partnerRules = (dbRules?.value && typeof dbRules.value === "object") ? dbRules.value : {};
    } catch (_) {
      // safely fallback
    }

    // Try live API quotes from fully-capable providers first
    const liveProviders = providerRegistry.getEnabledProviders()
      .filter(p => activeList.includes(p.identifier) && p.capabilities.rates);

    const liveResults = await Promise.allSettled(
      liveProviders.map(async (provider) => {
        if (provider.capabilities.serviceability) {
          try {
            const serv = await provider.getServiceability({ destinationPincode });
            if (!serv.isServiceable) return null;
          } catch (_) {
            return null;
          }
        }
        try {
          const quotePromise = provider.getShippingQuote({ originPincode, destinationPincode, weightGrams: safeWeight, paymentMode });
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000));
          return await Promise.race([quotePromise, timeoutPromise]);
        } catch (_) {
          return null;
        }
      })
    );

    const liveQuotes = liveResults
      .filter(res => res.status === "fulfilled" && res.value !== null)
      .map(res => res.value);

    // Build final quotes – start with live quotes, then fill remaining providers with fallback pricing
    const quotedProviders = new Set(liveQuotes.map(q => q.provider));
    const fallbackQuotes = activeList
      .filter(pid => !quotedProviders.has(pid) && PROVIDER_FALLBACK_RATES[pid])
      .map(pid => {
        const fallback = PROVIDER_FALLBACK_RATES[pid];
        // Scale cost with weight: base + 10 per 500g slab above first
        const weightSlabs = Math.max(1, Math.ceil(safeWeight / 500));
        const cost = fallback.baseRate + (weightSlabs - 1) * 10;
        return {
          provider: pid,
          service: fallback.service,
          cost,
          estimatedDeliveryDays: fallback.estimatedDays,
          isFallback: true,
        };
      });

    const allQuotes = [...liveQuotes, ...fallbackQuotes];

    if (allQuotes.length === 0) {
      throw new AppError("Delivery options are temporarily unavailable.", 503, "SHIPPING_QUOTES_UNAVAILABLE");
    }

    // Apply admin-configured markup and ETA buffer
    const quoteId = crypto.randomUUID();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes validity

    const options = allQuotes.map((q) => {
      const rule = partnerRules[q.provider] || { markupType: "PERCENTAGE", markupValue: 20, etaBuffer: 1 };
      const markupValue = Number(rule.markupValue || 0);
      const providerCost = q.cost || 100;
      let customerPrice;

      if (q.isFallback) {
        // No live API rate: admin's markup value IS the customer price directly
        // (FIXED = flat fee shown to customer; PERCENTAGE = base * multiplier)
        if (rule.markupType === "FIXED") {
          customerPrice = markupValue > 0 ? markupValue : providerCost;
        } else {
          customerPrice = markupValue > 0
            ? Math.round(providerCost * (1 + markupValue / 100) * 100) / 100
            : providerCost;
        }
      } else if (rule.markupType === "FIXED") {
        // Live API quote: add flat markup on top of real provider cost
        customerPrice = providerCost + markupValue;
      } else {
        customerPrice = providerCost + (providerCost * Number(rule.markupValue || 0) / 100);
      }
      customerPrice = Math.round(customerPrice * 100) / 100;

      const etaDays = (q.estimatedDeliveryDays || 5) + Number(rule.etaBuffer || 0);
      const estimatedDeliveryDate = new Date();
      estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + etaDays);

      return {
        quoteId,
        provider: q.provider,
        service: q.service || "Standard",
        providerCost,
        isFallback: Boolean(q.isFallback),
        price: customerPrice,
        currency: "INR",
        etaMinDays: etaDays,
        etaMaxDays: etaDays + 2,
        estimatedDeliveryDate: estimatedDeliveryDate.toISOString(),
        expiresAt: new Date(expiresAt).toISOString(),
      };
    });

    // Save in our active session store
    QuoteStore.set(quoteId, {
      cartId,
      userId,
      originPincode,
      destinationPincode,
      weightGrams: safeWeight,
      options,
      expiresAt,
    });

    // Cleanup very old quotes periodically
    if (QuoteStore.size > 10000) QuoteStore.clear();

    return {
      quoteId,
      expiresAt: new Date(expiresAt).toISOString(),
      shippingOptions: options.map(opt => ({
        quoteId: opt.quoteId,
        provider: opt.provider,
        service: opt.service,
        price: opt.price,
        currency: opt.currency,
        etaMinDays: opt.etaMinDays,
        etaMaxDays: opt.etaMaxDays,
        estimatedDeliveryDate: opt.estimatedDeliveryDate,
        isFallback: opt.isFallback,
      })),
    };
  }

  /**
   * Validate a quote during checkout submission securely
   */
  validateAndSelectQuote(quoteId, selectedProvider, { cartId, userId, destinationPincode }) {
    const session = QuoteStore.get(quoteId);
    if (!session) {
      throw new AppError("Shipping quote is invalid or expired", 400, "QUOTE_INVALID");
    }

    if (Date.now() > session.expiresAt) {
      throw new AppError("Shipping quote has expired. Please refresh delivery options.", 400, "QUOTE_EXPIRED");
    }

    if (session.destinationPincode !== destinationPincode) {
      throw new AppError("Shipping destination changed. Quote is invalid.", 400, "QUOTE_INVALID");
    }

    const selectedOption = session.options.find(opt => opt.provider === selectedProvider);
    if (!selectedOption) {
      throw new AppError("Selected shipping provider is not available in the quote", 400, "QUOTE_PROVIDER_INVALID");
    }

    return selectedOption;
  }
}

module.exports = new ShippingQuoteService();
