export const STAFF_MODULES = [
  {
    key: "dashboard",
    name: "Dashboard",
    description: "Overview, access visibility, and workspace health",
    icon: "LayoutDashboard",
    route: "/staff/dashboard",
    permission: null,
    section: "main",
    order: 0,
  },
  {
    key: "users",
    name: "Users",
    description: "Browse customer accounts and apply user-level actions",
    icon: "Users",
    route: "/staff/users",
    permission: "users.read",
    section: "management",
    order: 1,
    notificationModule: "MANAGEMENT",
    notificationSubModule: "USERS",
  },
  {
    key: "influencer-commerce",
    name: "Influencer Commerce",
    description: "Influencer commerce workspace",
    icon: "Megaphone",
    route: "/staff/influencer-commerce",
    permission: null,
    section: "growth",
    order: 1.5,
    notificationModule: "GROWTH",
    notificationSubModule: "INFLUENCER_COMMERCE",
    children: [
      {
        key: "overview",
        name: "Overview",
        icon: "BarChart3",
        children: [
          {
            key: "dashboard",
            name: "Dashboard",
            icon: "BarChart3",
            route: "/staff/influencer-commerce",
            exact: true,
            permission: "influencerCommerce.dashboardRead",
          },
        ],
      },
      {
        key: "people",
        name: "People",
        icon: "Users",
        children: [
          { key: "influencers", name: "Influencers", icon: "Users", route: "/staff/influencer-commerce/influencers", permission: "influencerCommerce.influencersRead" },
          { key: "vendors", name: "Vendors", icon: "Users", route: "/staff/influencer-commerce/vendors", permission: "influencerCommerce.vendorsRead" },
          { key: "matching", name: "Influencer-Vendor Matching", icon: "Search", route: "/staff/influencer-commerce/matching", permission: "influencerCommerce.influencerVendorMatchingRead" },
        ],
      },
      {
        key: "campaigns",
        name: "Campaigns",
        icon: "Megaphone",
        children: [
          { key: "campaign-management", name: "Campaign Management", icon: "Megaphone", route: "/staff/influencer-commerce/campaigns", permission: "influencerCommerce.campaignsRead" },
          { key: "vendor-campaign-commission", name: "Vendor Campaign Commission", icon: "Percent", route: "/staff/influencer-commerce/vendor-campaign-commission", permission: "influencerCommerce.vendorCampaignCommissionRead" },
        ],
      },
      {
        key: "affiliate-products",
        name: "Affiliate & Products",
        icon: "Link",
        children: [
          { key: "affiliate-links", name: "Affiliate Links", icon: "Link", route: "/staff/influencer-commerce/affiliate-links", permission: "influencerCommerce.affiliateLinksRead" },
          { key: "affiliate-tracking", name: "Affiliate Tracking", icon: "Search", route: "/staff/influencer-commerce/tracking", permission: "influencerCommerce.affiliateTrackingRead" },
          { key: "product-promotions", name: "Product Promotions", icon: "Package", route: "/staff/influencer-commerce/promotions", permission: "influencerCommerce.productPromotionsRead" },
        ],
      },
      {
        key: "finance",
        name: "Finance",
        icon: "Wallet",
        children: [
          { key: "settlements", name: "Escrow & Settlements", icon: "Wallet", route: "/staff/influencer-commerce/settlements", permission: "influencerCommerce.settlementsRead" },
          { key: "campaign-finance", name: "Campaign Finance", icon: "Wallet", route: "/staff/influencer-commerce/campaign-finance", permission: "influencerCommerce.campaignFinanceRead" },
          { key: "revenue", name: "Revenue Dashboard", icon: "Percent", route: "/staff/influencer-commerce/revenue", permission: "influencerCommerce.revenueDashboardRead" },
          { key: "payouts", name: "Payout Management", icon: "Wallet", route: "/staff/influencer-commerce/payouts", permission: "influencerCommerce.payoutsRead" },
        ],
      },
      {
        key: "configuration",
        name: "Configuration",
        icon: "Settings",
        children: [
          { key: "tier-score", name: "Tier & Score Config", icon: "Settings", route: "/staff/influencer-commerce/configuration", permission: "influencerCommerce.tierScoreConfigRead" },
          { key: "settings", name: "Settings", icon: "Settings", route: "/staff/influencer-commerce/settings", permission: "influencerCommerce.settingsRead" },
        ],
      },
    ],
  },
  {
    key: "orders",
    name: "Orders",
    description: "Track fulfillment, payment state, and status updates",
    icon: "ShoppingCart",
    route: "/staff/orders",
    permission: "orders.read",
    section: "management",
    order: 2,
    notificationModule: "MANAGEMENT",
    notificationSubModule: "ORDERS",
  },
  {
    key: "products",
    name: "Products",
    description: "Work the catalog with create, update, and moderation actions",
    icon: "Package",
    route: "/staff/products",
    permission: "products.read",
    section: "management",
    order: 3,
    notificationModule: "MANAGEMENT",
    notificationSubModule: "PRODUCTS",
  },
  {
    key: "reviews",
    name: "Reviews",
    description: "Manage product reviews and customer ratings",
    icon: "MessageCircle",
    route: "/staff/reviews",
    permission: "reviews.read",
    section: "management",
    order: 4,
    notificationModule: "GROWTH",
    notificationSubModule: "REVIEWS",
  },
  {
    key: "payments",
    name: "Payments",
    description: "Process and manage payment transactions",
    icon: "CreditCard",
    route: "/staff/payments",
    permission: "payments.read",
    section: "finance",
    order: 5,
    notificationModule: "FINANCE",
    notificationSubModule: "PAYMENTS",
  },
  {
    key: "payouts",
    name: "Payouts",
    description: "Review vendor disbursements and process payout operations",
    icon: "TrendingUp",
    route: "/staff/payouts",
    permission: "payouts.read",
    section: "finance",
    order: 6,
    notificationModule: "FINANCE",
    notificationSubModule: "PAYOUTS",
  },
  {
    key: "analytics",
    name: "Analytics",
    description: "Platform performance metrics and insights",
    icon: "BarChart3",
    route: "/staff/analytics",
    permission: "analytics.read",
    section: "finance",
    order: 7,
  },
  {
    key: "settings",
    name: "Settings",
    description: "Platform configuration and system preferences",
    icon: "Settings",
    route: "/staff/settings",
    permission: "settings.update",
    section: "admin",
    order: 8,
    notificationModule: "WORKSPACE",
    notificationSubModule: "SETTINGS",
  },
  {
    key: "roles",
    name: "Roles",
    description: "Create and manage staff roles with permissions",
    icon: "Lock",
    route: "/staff/roles",
    permission: "roles.read",
    section: "admin",
    order: 9,
  },
  {
    key: "staff",
    name: "Staff",
    description: "Manage staff members and their access levels",
    icon: "UserCheck",
    route: "/staff/staff",
    permission: "staff.read",
    section: "admin",
    order: 10,
  },
];

export const SIDEBAR_SECTIONS = {
  main: "Navigation",
  management: "Management",
  growth: "Growth",
  finance: "Finance",
  admin: "Administration",
};

export function getAccessibleModules(permissions, enabledModules = {}) {
  if (!permissions) return [STAFF_MODULES[0]];

  return STAFF_MODULES.filter((module) => {
    if (enabledModules?.[module.key] === false) return false;
    if (module.children?.length) return filterAccessibleChildren(module.children, permissions).length > 0;
    if (!module.permission) return true;
    const [moduleName, action] = module.permission.split(".");
    return permissions?.[moduleName]?.[action] === true;
  }).map((module) => (
    module.children?.length
      ? withAccessibleChildren(module, permissions)
      : module
  )).sort((left, right) => left.order - right.order);
}

function firstChildRoute(items = []) {
  for (const item of items) {
    if (item.route) return item.route;
    const nestedRoute = firstChildRoute(item.children || []);
    if (nestedRoute) return nestedRoute;
  }
  return null;
}

function withAccessibleChildren(module, permissions) {
  const children = filterAccessibleChildren(module.children, permissions);
  return {
    ...module,
    route: firstChildRoute(children) || module.route,
    children,
  };
}

function hasPermission(permissions, permission) {
  if (!permission) return true;
  const [moduleName, action] = permission.split(".");
  return permissions?.[moduleName]?.[action] === true;
}

function filterAccessibleChildren(items = [], permissions) {
  return items
    .map((item) => {
      if (item.children?.length) {
        const children = filterAccessibleChildren(item.children, permissions);
        return children.length ? { ...item, children } : null;
      }
      return hasPermission(permissions, item.permission) ? item : null;
    })
    .filter(Boolean);
}

export function getDefaultStaffRoute(permissions, enabledModules = {}) {
  return getAccessibleModules(permissions, enabledModules)[0]?.route || "/staff/dashboard";
}

export function getStaffModuleByRoute(pathname) {
  return (
    STAFF_MODULES.find((module) => pathname === module.route || pathname.startsWith(`${module.route}/`)) ||
    STAFF_MODULES[0]
  );
}

export function getDisplayPermissionEntries(permissions = {}, enabledModules = {}) {
  const displayPermissions = new Map();

  for (const module of STAFF_MODULES) {
    collectDisplayPermissions(module, permissions, enabledModules, displayPermissions);
  }

  return Array.from(displayPermissions.entries()).map(([moduleName, actions]) => [
    moduleName,
    Object.fromEntries(Array.from(actions).map((action) => [action, true])),
  ]);
}

export function getDisplayPermissionCount(permissions = {}, enabledModules = {}) {
  return getDisplayPermissionEntries(permissions, enabledModules).reduce(
    (count, [, actions]) => count + Object.keys(actions).length,
    0
  );
}

function collectDisplayPermissions(item, permissions, enabledModules, output) {
  if (item.key && enabledModules?.[item.key] === false) return;

  if (item.children?.length) {
    item.children.forEach((child) => collectDisplayPermissions(child, permissions, enabledModules, output));
    return;
  }

  if (!item.permission || !hasPermission(permissions, item.permission)) return;
  const [moduleName, action] = item.permission.split(".");
  if (!output.has(moduleName)) output.set(moduleName, new Set());
  output.get(moduleName).add(action);
}
