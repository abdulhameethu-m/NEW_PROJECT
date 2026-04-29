import {
  BarChart3,
  Bell,
  Boxes,
  CreditCard,
  FileSearch,
  FolderTree,
  HeadphonesIcon,
  Image,
  LayoutDashboard,
  Package,
  Package2,
  Percent,
  RotateCcw,
  Settings,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Star,
  Tags,
  Truck,
  Users,
  Wallet,
  UserCog,
} from "lucide-react";

export const ADMIN_PRIMARY_ITEM = {
  name: "Dashboard",
  path: "/admin/dashboard",
  icon: LayoutDashboard,
};

export const ADMIN_SECTION_ITEMS = [
  {
    section: "Overview",
    key: "overview",
    items: [
      { name: "Analytics", path: "/admin/analytics", permission: "analytics.read", icon: BarChart3 },
      { name: "Revenue", path: "/admin/revenue", permission: "analytics.read", icon: Wallet, legacyOnly: true },
      { name: "Audit Logs", path: "/admin/audit-logs", permission: "audit.read", icon: FileSearch, legacyOnly: true },
    ],
  },
  {
    section: "Management",
    key: "management",
    items: [
      { name: "Users", path: "/admin/users", permission: "users.read", icon: Users },
      { name: "Sellers", path: "/admin/sellers", permission: "vendors.read", icon: ShoppingBag, legacyOnly: true },
      { name: "Products", path: "/admin/products", permission: "products.read", icon: Boxes },
      { name: "Orders", path: "/admin/orders", permission: "orders.read", icon: ShoppingCart },
      { name: "Pickups", path: "/admin/pickups", permission: "orders.read", icon: Truck },
    ],
  },
  {
    section: "Catalog",
    key: "catalog",
    items: [
      { name: "Categories", path: "/admin/categories", permission: "categories.read", icon: FolderTree, legacyOnly: true },
      { name: "Subcategories", path: "/admin/subcategories", permission: "categories.read", icon: Tags, legacyOnly: true },
      { name: "Attributes", path: "/admin/attributes", permission: "categories.read", icon: Tags, legacyOnly: true },
      { name: "Product Modules", path: "/admin/product-modules", permission: "categories.read", icon: Boxes, legacyOnly: true },
      { name: "Homepage Content", path: "/admin/content", permission: "dashboard.read", icon: Image, legacyOnly: true },
      { name: "Vendor Access", path: "/admin/vendor-access", permission: "dashboard.read", icon: ShieldCheck, legacyOnly: true },
      { name: "Shipping Access", path: "/admin/vendor-access/shipping", permission: "settings.update", icon: Truck, legacyOnly: true },
    ],
  },
  {
    section: "Finance",
    key: "finance",
    items: [
      { name: "Payments", path: "/admin/payments", permission: "payments.read", icon: CreditCard },
      { name: "Refunds", path: "/admin/refunds", permission: "payments.read", icon: RotateCcw },
      { name: "Payout Management", path: "/admin/finance/payouts", permission: "payouts.read", icon: Wallet },
    ],
  },
  {
    section: "Workspace",
    key: "workspace",
    items: [
      { name: "Settings", path: "/admin/settings", permission: "settings.update", icon: Settings },
      { name: "Pricing", path: "/admin/pricing", permission: "settings.update", icon: Percent },
      { name: "Pricing Categories", path: "/admin/pricing-categories", permission: "settings.update", icon: Tags },
      { name: "Staff Roles", path: "/admin/roles", permission: "roles.read", icon: ShieldCheck, legacyOnly: true },
      { name: "Staff Accounts", path: "/admin/staff", permission: "staff.read", icon: UserCog, legacyOnly: true },
    ],
  },
];

export const VENDOR_PRIMARY_ITEM = {
  name: "Dashboard",
  path: "/vendor/dashboard",
  icon: LayoutDashboard,
};

export const VENDOR_DYNAMIC_MODULE_META = {
  analytics: { section: "Finance", path: "/vendor/analytics", icon: BarChart3 },
  delivery: { section: "Management", path: "/vendor/delivery", icon: Truck },
  homepage_content: { section: "Marketing", path: "/vendor/content", icon: Image },
  inventory: { section: "Management", path: "/vendor/inventory", icon: Package2 },
  orders: { section: "Management", path: "/vendor/orders", icon: ShoppingCart },
  payments: { section: "Finance", path: "/vendor/finance", icon: CreditCard },
  products: { section: "Management", path: "/vendor/products", icon: Package },
  returns: { section: "Management", path: "/vendor/returns", icon: RotateCcw },
  reviews: { section: "Growth", path: "/vendor/reviews", icon: Star },
};

export const VENDOR_STATIC_ITEMS = [
  {
    section: "Workspace",
    key: "workspace",
    items: [
      { name: "Notifications", path: "/vendor/notifications", icon: Bell, badgeKey: "notificationsUnread" },
      { name: "Ready for Pickup", path: "/vendor/pickups", icon: Truck },
      { name: "Offers", path: "/vendor/offers", icon: Percent },
      { name: "Support", path: "/vendor/support", icon: HeadphonesIcon },
      { name: "Settings", path: "/vendor/settings", icon: Settings },
    ],
  },
];
