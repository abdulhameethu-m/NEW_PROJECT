
    const existingTiers = await InfluencerTier.countDocuments();
    if (!existingTiers) {
      await InfluencerTier.insertMany([
        { tierName: "Starter", color: "#64748b", priority: 1, minScore: 0, maxScore: 20, displayOrder: 1, benefits: ["Basic campaign access"], approval: { status: "active", version: 1 } },
        { tierName: "Bronze", color: "#b45309", priority: 2, minScore: 21, maxScore: 40, displayOrder: 2, benefits: ["Entry campaign access"], approval: { status: "active", version: 1 } },
        { tierName: "Silver", color: "#64748b", priority: 3, minScore: 41, maxScore: 60, displayOrder: 3, benefits: ["Mid-tier campaign access"], approval: { status: "active", version: 1 } },
        { tierName: "Gold", color: "#ca8a04", priority: 4, minScore: 61, maxScore: 80, displayOrder: 4, benefits: ["Priority discovery"], approval: { status: "active", version: 1 } },
        { tierName: "Diamond", color: "#0891b2", priority: 5, minScore: 81, maxScore: 90, displayOrder: 5, benefits: ["Premium campaign access"], approval: { status: "active", version: 1 } },
        { tierName: "Platinum", color: "#7c3aed", priority: 6, minScore: 91, maxScore: 100, displayOrder: 6, benefits: ["Top marketplace ranking"], approval: { status: "active", version: 1 } },
      ]);
    }

    const [scoreConfigCount, rankingRuleCount, budgetRuleCount] = await Promise.all([
      InfluencerScoreConfig.countDocuments(nonArchivedQuery()),
      MarketplaceRankingRule.countDocuments(nonArchivedQuery()),
      BudgetProtectionRule.countDocuments(nonArchivedQuery()),
    ]);
    if (!scoreConfigCount) await InfluencerScoreConfig.create({ approval: { status: "active", version: 1 } });
    if (!rankingRuleCount) await MarketplaceRankingRule.create({ approval: { status: "active", version: 1 } });
    if (!budgetRuleCount) await BudgetProtectionRule.create({ approval: { status: "active", version: 1 } });

    const plans = await VendorSubscriptionPlan.countDocuments();
    if (!plans) {
      const tiers = await InfluencerTier.find(activeQuery()).sort({ displayOrder: 1 }).lean();
      await VendorSubscriptionPlan.insertMany([
        ...tiers.map((tier) => ({
          planName: tier.tierName,
          monthlyPrice: ({ Silver: 999, Gold: 2999, Diamond: 6999 }[tier.tierName] ?? 0),
          yearlyPrice: ({ Silver: 9990, Gold: 29990, Diamond: 69990 }[tier.tierName] ?? 0),
          campaignLimit: ({ Starter: 1, Bronze: 3, Silver: 5, Gold: 10, Diamond: 20, Platinum: 30 }[tier.tierName] ?? 1),
          influencerVisibilityLimit: ({ Starter: 20, Bronze: 50, Silver: 100, Gold: 500, Diamond: -1, Platinum: -1 }[tier.tierName] ?? 20),
          linkedTierId: tier._id,
          allowedTiers: [tier._id],
          allowAllTiers: false,
          prioritySupport: tier.tierName === "Platinum",
          featuredCampaigns: ["Gold", "Diamond", "Platinum"].includes(tier.tierName),
          advancedAnalytics: ["Diamond", "Platinum"].includes(tier.tierName),
          dedicatedManager: tier.tierName === "Platinum",
          displayOrder: tier.displayOrder || tier.priority || 0,
          approval: { status: "active", version: 1 },
        })),
      ]);
    }

    const [
      serviceTypeCount,
      packageTemplateCount,
      categoryOptionCount,
      languageOptionCount,
      attributionWindowCount,
      paymentModelCount,
      campaignTypeConfigCount,
      campaignPaymentModelOptionCount,
      campaignPaymentRuleConfigCount,
      campaignDynamicFieldConfigCount,
      campaignValidationRuleConfigCount,
      campaignTemplateCount,
      discoveryRuleCount,
      campaignRuleCount,
      dynamicFormFieldCount,
    ] = await Promise.all([
      InfluencerServiceType.countDocuments(),
      InfluencerPackageTemplate.countDocuments(),
      InfluencerCategoryOption.countDocuments(),
      InfluencerLanguageOption.countDocuments(),
      CampaignAttributionWindow.countDocuments(),
      CampaignPaymentModelConfig.countDocuments(),
      CampaignTypeConfig.countDocuments(),
      CampaignPaymentModelOption.countDocuments(),
      CampaignPaymentRuleConfig.countDocuments(),
      CampaignDynamicFieldConfig.countDocuments(),
      CampaignValidationRuleConfig.countDocuments(),
      InfluencerCampaignTemplate.countDocuments(),
      InfluencerDiscoveryRule.countDocuments(),
      InfluencerCampaignRule.countDocuments(),
      InfluencerDynamicFormField.countDocuments(),
    ]);

    if (!serviceTypeCount) await InfluencerServiceType.insertMany(SERVICE_TYPE_DEFAULTS);
    if (!packageTemplateCount) await InfluencerPackageTemplate.insertMany(PACKAGE_TEMPLATE_DEFAULTS);
    if (!categoryOptionCount) await InfluencerCategoryOption.insertMany(CATEGORY_OPTION_DEFAULTS);
    if (!languageOptionCount) await InfluencerLanguageOption.insertMany(LANGUAGE_OPTION_DEFAULTS);
    if (!attributionWindowCount) await CampaignAttributionWindow.insertMany(ATTRIBUTION_WINDOW_DEFAULTS);
    if (!paymentModelCount) await CampaignPaymentModelConfig.insertMany(PAYMENT_MODEL_DEFAULTS);
    if (!campaignTypeConfigCount) await CampaignTypeConfig.insertMany(CAMPAIGN_TYPE_DEFAULTS);
    if (!campaignPaymentModelOptionCount) await CampaignPaymentModelOption.insertMany(PAYMENT_MODEL_OPTION_DEFAULTS);
    if (!campaignPaymentRuleConfigCount || !campaignDynamicFieldConfigCount || !campaignValidationRuleConfigCount) {
      const [campaignTypes, paymentOptions] = await Promise.all([
        CampaignTypeConfig.find({}).lean(),
        CampaignPaymentModelOption.find({}).lean(),
      ]);
      const typeBySlug = new Map(campaignTypes.map((row) => [row.slug, row]));
      const paymentBySlug = new Map(paymentOptions.map((row) => [row.slug, row]));

      if (!campaignPaymentRuleConfigCount) {
        const rules = Object.entries(CAMPAIGN_PAYMENT_RULE_MATRIX).flatMap(([campaignType, allowedModels]) => {
          const campaignTypeId = typeBySlug.get(campaignType)?._id;
          if (!campaignTypeId) return [];
          return [...paymentBySlug.entries()].map(([paymentType, paymentModel]) => ({
            campaignTypeId,
            paymentModelId: paymentModel._id,
            allowed: allowedModels.includes(paymentType),
            status: "active",
            reason: allowedModels.includes(paymentType)
              ? `${paymentModel.name} is allowed for ${typeBySlug.get(campaignType)?.name}`
              : `${paymentModel.name} is blocked for ${typeBySlug.get(campaignType)?.name}`,
            approval: { status: "active", version: 1 },
          }));
        });
        if (rules.length) await CampaignPaymentRuleConfig.insertMany(rules);
      }

      if (!campaignDynamicFieldConfigCount) {
        const fields = Object.entries(CAMPAIGN_PAYMENT_RULE_MATRIX).flatMap(([campaignType, allowedModels]) => {
          const campaignTypeId = typeBySlug.get(campaignType)?._id;
          if (!campaignTypeId) return [];
          return allowedModels.flatMap((paymentType) => {
            const paymentModelId = paymentBySlug.get(paymentType)?._id;
            if (!paymentModelId) return [];
            return (CAMPAIGN_DYNAMIC_FIELD_DEFAULTS[paymentType] || []).map(([fieldName, label, fieldType, required, configuration], index) => ({
              campaignTypeId,
              paymentModelId,
              fieldName,
              label,
              fieldType,
              required,
              configuration,
              displayOrder: index + 1,
              approval: { status: "active", version: 1 },
            }));
          });
        });
        if (fields.length) await CampaignDynamicFieldConfig.insertMany(fields);
      }

      if (!campaignValidationRuleConfigCount) {
        const validationRules = Object.entries(CAMPAIGN_PAYMENT_RULE_MATRIX).flatMap(([campaignType, allowedModels]) => {
          const campaignTypeId = typeBySlug.get(campaignType)?._id;
          if (!campaignTypeId) return [];
          return allowedModels.flatMap((paymentType) => {
            const paymentModelId = paymentBySlug.get(paymentType)?._id;
            if (!paymentModelId) return [];
            const rules = [{
              campaignTypeId,
              paymentModelId,
              ruleName: "payment_model_allowed",
              ruleConfiguration: { campaignType, paymentType },
              severity: "error",
              approval: { status: "active", version: 1 },
            }];
            if (["commission", "hybrid"].includes(paymentType)) {
              rules.push({
                campaignTypeId,
                paymentModelId,
                ruleName: "attribution_window_required",
                ruleConfiguration: { allowedWindows: [30, 60, 90], customVendorWindowAllowed: false },
                severity: "error",
                approval: { status: "active", version: 1 },
              });
              rules.push({
                campaignTypeId,
                paymentModelId,
                ruleName: "affiliate_tracking_required",
                ruleConfiguration: { clickTracking: true, conversionTracking: true, commissionLedger: true, payoutTracking: true },
                severity: "error",
                approval: { status: "active", version: 1 },
              });
            }
            return rules;
          });
        });
        if (validationRules.length) await CampaignValidationRuleConfig.insertMany(validationRules);
      }
    }
    if (!campaignTemplateCount) {
      await InfluencerCampaignTemplate.insertMany([
        {
          key: "direct_creator_campaign",
          label: "Direct Creator Campaign",
          campaignType: "sponsored",
          defaultPaymentType: "fixed",
          defaultDeliverables: ["content", "tracking_link"],
          displayOrder: 1,
          approval: { status: "active", version: 1 },
        },
        {
          key: "global_marketplace_campaign",
          label: "Global Marketplace Campaign",
          campaignType: "affiliate",
          defaultPaymentType: "commission",
          defaultDeliverables: ["tracking_link", "content"],
          displayOrder: 2,
          approval: { status: "active", version: 1 },
        },
      ]);
    }
    if (!discoveryRuleCount) {
      await InfluencerDiscoveryRule.create({
        key: "default_discovery",
        label: "Default Discovery Rules",
        rules: { filters: ["subscriptionPlan", "category", "language", "location", "score", "followers"] },
        approval: { status: "active", version: 1 },
      });
    }
    if (!campaignRuleCount) {
      await InfluencerCampaignRule.create({
        key: "default_campaign_contract",
        label: "Default Campaign Rules",
        rules: { immutableSnapshots: true, lockOnAcceptance: true, backendRateAuthority: true },
        approval: { status: "active", version: 1 },
      });
    }
    if (!dynamicFormFieldCount) await InfluencerDynamicFormField.insertMany(DYNAMIC_FORM_FIELD_DEFAULTS);

    await this.syncTierPlanPairs();
  }

  