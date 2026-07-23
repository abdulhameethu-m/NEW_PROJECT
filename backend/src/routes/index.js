const { Router } = require("express");
const { authOptional, authRequired, requireRole } = require("../middleware/auth");
const { influencerCommerceGate } = require("../middleware/influencerCommerceGate");
const { logger } = require("../utils/logger");

// Import all routes
const authRoutes = require("./auth.routes");
const vendorRoutes = require("./vendor.routes");
const vendorStorefrontRoutes = require("./vendor-storefront.routes");
const vendorPublicRoutes = require("./vendor-public.routes");
const adminRoutes = require("./admin.routes");
const productRoutes = require("./product.routes");
const cartRoutes = require("./cart.routes");
const orderRoutes = require("./order.routes");
const checkoutRoutes = require("./checkout.routes");
const paymentRoutes = require("./payment.routes");
const payoutRoutes = require("./payout.routes");
const deliveryRoutes = require("./delivery.routes");
const shippingRoutes = require("./shipping.routes");
const pickupRoutes = require("./pickup.routes");
const webhookRoutes = require("./webhook.routes");
const wishlistRoutes = require("./wishlist.routes");
const compareRoutes = require("./compare.routes");
const userRoutes = require("./user.routes");
const categoryRoutes = require("./category.routes");
const subcategoryRoutes = require("./subcategory.routes");
const attributeRoutes = require("./attribute.routes");
const productModuleRoutes = require("./product-module.routes");
const catalogRequestRoutes = require("./catalog-request.routes");
const exportRoutes = require("./export.routes");
const vendorModuleRoutes = require("./vendorModule.routes");
const homepageContainerRoutes = require("./homepage-container.routes");
const homepageLayoutRoutes = require("./homepage-layout.routes");
const pricingRoutes = require("./pricing.routes");
const staffRoutes = require("../modules/staff/routes");
const settlementRoutes = require("./settlement.routes");
const marketplaceSettlementRoutes = require("./marketplace-settlement.routes");
const reviewRoutes = require("./review.routes");
const inventoryRoutes = require("./inventory.routes");
const publicFeatureRoutes = require("./public.routes");
const configRoutes = require("./config.routes");
const systemRoutes = require("./system.routes");
const privateDocumentRoutes = require("./private-document.routes");
const invoiceRoutes = require("./invoice.routes");

const influencerRoutes = require("../modules/influencer/routes");
const campaignRoutes = require("../modules/campaign/routes");
const escrowRoutes = require("../modules/campaign/escrow.routes");
const reelRoutes = require("../modules/reel/routes");
const trackingRoutes = require("../modules/tracking/routes");
const commissionRoutes = require("../modules/commission/routes");
const campaignFinanceRoutes = require("../modules/campaignFinance/routes");
const campaignFinanceController = require("../modules/campaignFinance/controller");
const recommendationRoutes = require("../modules/recommendation/routes");
const analyticsRoutes = require("../modules/analytics/routes");

function deprecatedApiAlias(canonicalPath) {
  return (_req, res, next) => {
    res.setHeader("Deprecation", "true");
    res.setHeader("Link", `<${canonicalPath}>; rel="successor-version"`);
    next();
  };
}

const router = Router();

router.use("/auth", authRoutes);
router.use("/vendor", vendorRoutes);
router.use("/vendor-stores", vendorStorefrontRoutes);
router.use("/vendor-store", deprecatedApiAlias("/api/vendor-stores"), vendorStorefrontRoutes);
router.use("/vendors", vendorPublicRoutes);
router.use("/admin", adminRoutes);
router.use("/products", productRoutes);
router.use("/cart", cartRoutes);
router.use("/orders", orderRoutes);
router.use("/checkout", checkoutRoutes);
router.use("/payments", paymentRoutes);
router.use("/payment", deprecatedApiAlias("/api/payments"), paymentRoutes);
router.use("/payouts", payoutRoutes);
router.use("/delivery", deliveryRoutes);
router.use("/shipping", shippingRoutes);
router.use("/", pickupRoutes);
router.use("/webhooks", webhookRoutes);
router.use("/wishlist", wishlistRoutes);
router.use("/compare", compareRoutes);
router.use("/user", userRoutes);
router.use("/categories", categoryRoutes);
router.use("/subcategories", subcategoryRoutes);
router.use("/attributes", attributeRoutes);
router.use("/product-modules", productModuleRoutes);
router.use("/catalog", catalogRequestRoutes);
router.use("/export", exportRoutes);
router.use("/modules", vendorModuleRoutes);
router.use("/homepage-containers", homepageContainerRoutes);
router.use("/homepage-builder", homepageLayoutRoutes);
router.use("/pricing", pricingRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/staff", staffRoutes);
router.use("/admin", settlementRoutes);
router.use("/", marketplaceSettlementRoutes);
router.use("/reviews", reviewRoutes);
router.use("/public", publicFeatureRoutes);
router.use("/config/initialize-defaults", (req, res) => {
  logger.warn("Blocked platform bootstrap HTTP attempt", {
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    environment: process.env.NODE_ENV || "development",
  });
  return res.status(404).json({ success: false, message: "Not found" });
});
router.use("/config", configRoutes);
router.use("/system", systemRoutes);
router.use("/private-documents", privateDocumentRoutes);
router.use("/invoices", invoiceRoutes);

// Influencer Commerce Routes
router.use("/influencer", authOptional, influencerCommerceGate, influencerRoutes);
router.use("/campaign", authOptional, influencerCommerceGate, campaignRoutes);
router.use("/campaigns/escrow", authOptional, influencerCommerceGate, escrowRoutes);
router.use("/reel", authOptional, influencerCommerceGate, reelRoutes);
router.use("/tracking", authOptional, influencerCommerceGate, trackingRoutes);
router.use("/commission", authOptional, influencerCommerceGate, commissionRoutes);
router.use("/campaign-finance", authOptional, influencerCommerceGate, campaignFinanceRoutes);
router.get(
  "/campaigns/:campaignId/finance",
  authRequired,
  requireRole("vendor", "influencer", "admin", "super_admin", "support_admin", "finance_admin"),
  influencerCommerceGate,
  campaignFinanceController.campaign
);

router.use("/recommendations", recommendationRoutes);
router.use("/", analyticsRoutes);

module.exports = router;
