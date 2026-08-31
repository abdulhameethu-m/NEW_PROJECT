const STAFF_PERMISSION_CATALOG = Object.freeze({
  users: ["read", "block", "delete"],
  orders: ["read", "update", "delete"],
  products: ["create", "read", "update", "delete", "review", "deactivate"],
  payments: ["read", "update"],
  payouts: ["read", "approve", "reject"],
  reviews: ["read", "approve", "delete"],
  analytics: ["read"],
  revenue: ["read"],
  auditLogs: ["read"],
  sellers: ["read", "update", "approve", "reject"],
  inventory: ["read", "update"],
  pickups: ["read", "update"],
  categories: ["read", "create", "update", "delete"],
  subcategories: ["read", "create", "update", "delete"],
  returnRules: ["read", "create", "update", "delete"],
  catalogRequests: ["read", "create", "update", "delete"],
  attributes: ["read", "create", "update", "delete"],
  productModules: ["read", "create", "update", "delete"],
  homepageContainers: ["read", "create", "update", "delete"],
  homepageBuilder: ["read", "create", "update", "delete"],
  vendorAccess: ["read", "update"],
  shippingAccess: ["read", "update"],
  recommendationSettings: ["read", "create", "update", "delete"],
  relatedProducts: ["read", "create", "update", "delete"],
  frequentlyBoughtTogether: ["read", "create", "update", "delete"],
  crossSellRules: ["read", "create", "update", "delete"],
  upsellRules: ["read", "create", "update", "delete"],
  recommendationAnalytics: ["read", "create", "update", "delete"],
  aiScoringRules: ["read", "create", "update", "delete"],
  recommendationPreview: ["read", "create", "update", "delete"],
  cacheManagement: ["read", "create", "update", "delete"],
  refunds: ["read", "refund"],
  returns: ["read", "update"],

  escrowRefunds: ["read", "refund", "reject"],
  cancellationPolicies: ["read", "create", "update", "delete"],
  codAdvance: ["read", "create", "update", "delete"],
  invoices: ["read", "update", "delete"],
  commission: ["read", "create", "update", "delete"],
  financeInfluencers: ["read", "accept", "delete"],
  maintenance: ["read", "create", "update", "delete"],
  shipping: ["read", "create", "update", "delete"],
  pricing: ["read", "create", "update", "delete"],
  pricingCategories: ["read", "create", "update", "delete"],
  influencerCommerce: [
    "read",
    "invite",
    "manage",
    "approve",
    "export",
    "dashboard",
    "influencers",
    "vendors",
    "campaigns",
    "applications",
    "content",
    "commissions",
    "settlements",
    "payouts",
    "analytics",
    "fraud",
    "settings",
    "influencerVendorMatching",
    "vendorCampaignCommission",
    "affiliateLinks",
    "affiliateTracking",
    "productPromotions",
    "campaignFinance",
    "revenueDashboard",
    "tierScoreConfig",
    "dashboardRead",
    "influencersCreate",
    "influencersRead",
    "influencersUpdate",
    "influencersDelete",
    "vendorsCreate",
    "vendorsRead",
    "vendorsUpdate",
    "vendorsDelete",
    "influencerVendorMatchingCreate",
    "influencerVendorMatchingRead",
    "influencerVendorMatchingUpdate",
    "influencerVendorMatchingDelete",
    "campaignsRead",
    "campaignsUpdate",
    "campaignsDelete",
    "vendorCampaignCommissionCreate",
    "vendorCampaignCommissionRead",
    "vendorCampaignCommissionUpdate",
    "vendorCampaignCommissionDelete",
    "affiliateLinksCreate",
    "affiliateLinksRead",
    "affiliateLinksUpdate",
    "affiliateLinksDelete",
    "affiliateTrackingCreate",
    "affiliateTrackingRead",
    "affiliateTrackingUpdate",
    "affiliateTrackingDelete",
    "productPromotionsCreate",
    "productPromotionsRead",
    "productPromotionsUpdate",
    "productPromotionsDelete",
    "settlementsCreate",
    "settlementsRead",
    "settlementsUpdate",
    "settlementsDelete",
    "campaignFinanceCreate",
    "campaignFinanceRead",
    "campaignFinanceUpdate",
    "campaignFinanceDelete",
    "revenueDashboardCreate",
    "revenueDashboardRead",
    "revenueDashboardUpdate",
    "revenueDashboardDelete",
    "payoutsCreate",
    "payoutsRead",
    "payoutsUpdate",
    "payoutsDelete",
    "tierScoreConfigCreate",
    "tierScoreConfigRead",
    "tierScoreConfigUpdate",
    "tierScoreConfigDelete",
    "settingsRead",
  ],
  settings: ["update"],
  branding: ["view", "create", "update", "delete"],
  roles: ["read", "create", "update", "delete"],
  staff: ["read", "create", "update", "delete"],
});

const STAFF_PERMISSION_LAYOUT = Object.freeze({
  influencerCommerce: {
    label: "Influencer Commerce",
    groups: [
      {
        label: "Overview",
        items: [{ key: "dashboard", label: "Dashboard", actions: ["view"] }],
      },
      {
        label: "People",
        items: [
          { key: "influencers", label: "Influencers", actions: ["view"] },
          { key: "vendors", label: "Vendors", actions: ["view"] },
          { key: "influencerVendorMatching", label: "Influencer-Vendor Matching", actions: ["view"] },
        ],
      },
      {
        label: "Campaigns",
        items: [
          { key: "campaigns", label: "Campaign Management", actions: ["read", "update", "delete"] },
          { key: "vendorCampaignCommission", label: "Vendor Campaign Commission" },
        ],
      },
      {
        label: "Affiliate & Products",
        items: [
          { key: "affiliateLinks", label: "Affiliate Links" },
          { key: "affiliateTracking", label: "Affiliate Tracking" },
          { key: "productPromotions", label: "Product Promotions" },
        ],
      },
      {
        label: "Finance",
        items: [
          { key: "settlements", label: "Escrow & Settlements" },
          { key: "campaignFinance", label: "Campaign Finance", actions: ["view"] },
          { key: "revenueDashboard", label: "Revenue Dashboard", actions: ["view"] },
          { key: "payouts", label: "Payout Management" },
        ],
      },
      {
        label: "Configuration",
        items: [
          { key: "tierScoreConfig", label: "Tier & Score Config" },
          { key: "settings", label: "Settings", actions: ["view"] },
        ],
      },
    ],
  },
});
function createEmptyPermissions() {
  return Object.fromEntries(
    Object.entries(STAFF_PERMISSION_CATALOG).map(([moduleName, actions]) => [
      moduleName,
      Object.fromEntries(actions.map((action) => [action, false])),
    ])
  );
}
function normalizePermissions(input = {}) {
  const normalized = createEmptyPermissions();
  for (const [moduleName, actions] of Object.entries(STAFF_PERMISSION_CATALOG)) {
    const source = input?.[moduleName] || {};
    for (const action of actions) {
      normalized[moduleName][action] = Boolean(source?.[action]);
    }
    if (actions.includes("read")) {
      const hasMutatingPermission = actions.some(
        (action) => action !== "read" && normalized[moduleName][action]
      );
      if (hasMutatingPermission) {
        normalized[moduleName].read = true;
      }
    }
  }
  if (normalized.influencerCommerce) {
    const commerce = normalized.influencerCommerce;
    const viewOnlyNestedKeys = [
      "dashboard",
      "influencers",
      "vendors",
      "influencerVendorMatching",
      "campaignFinance",
      "revenueDashboard",
      "settings",
    ];
    viewOnlyNestedKeys.forEach((key) => {
      ["Create", "Update", "Delete"].forEach((suffix) => {
        const action = `${key}${suffix}`;
        if (action in commerce) commerce[action] = false;
      });
    });
    const nestedCrudKeys = [
      "dashboard",
      "influencers",
      "vendors",
      "influencerVendorMatching",
      "campaigns",
      "vendorCampaignCommission",
      "affiliateLinks",
      "affiliateTracking",
      "productPromotions",
      "settlements",
      "campaignFinance",
      "revenueDashboard",
      "payouts",
      "tierScoreConfig",
      "settings",
    ];
    nestedCrudKeys.forEach((key) => {
      const hasNestedMutation = ["Create", "Update", "Delete"].some((suffix) => commerce[`${key}${suffix}`]);
      if (hasNestedMutation && `${key}Read` in commerce) {
        commerce[`${key}Read`] = true;
      }
    });
    const hasCrudMutation = Object.entries(commerce).some(
      ([action, enabled]) => enabled && /(Create|Update|Delete)$/.test(action)
    );
    const hasCrudRead = Object.entries(commerce).some(
      ([action, enabled]) => enabled && /Read$/.test(action)
    );
    if (hasCrudRead || hasCrudMutation) commerce.read = true;
    if (hasCrudMutation) commerce.manage = true;
    if (commerce.payoutsRead || commerce.payoutsCreate || commerce.payoutsUpdate || commerce.payoutsDelete) {
      commerce.payouts = true;
    }
    if (commerce.settingsCreate || commerce.settingsUpdate || commerce.settingsDelete) {
      commerce.settings = true;
    }
  }
  return normalized;
}
function permissionExists(permission) {
  const [moduleName, action] = String(permission || "").split(".");
  return Boolean(STAFF_PERMISSION_CATALOG[moduleName]?.includes(action));
}
function hasStaffPermission(permissions, permission) {
  if (!permissionExists(permission)) return false;
  const [moduleName, action] = permission.split(".");
  return Boolean(permissions?.[moduleName]?.[action]);
}

module.exports = {
  STAFF_PERMISSION_CATALOG,
  STAFF_PERMISSION_LAYOUT,
  createEmptyPermissions,
  normalizePermissions,
  hasStaffPermission,
};
