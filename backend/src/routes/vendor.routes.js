const express = require("express");
const { authRequired, requireRole } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { upload } = require("../middleware/upload");
const vendorController = require("../controllers/vendor.controller");
const {
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
} = require("../utils/validators/vendor.validation");
const {
  createProductSchema,
  updateProductSchema,
} = require("../utils/validators/product.validation");
const vendorDashboardController = require("../modules/vendorDashboard/vendor-dashboard.controller");

const router = express.Router();

router.use(authRequired, requireRole("vendor"));

router.post("/step1", validate(step1Schema), vendorController.step1);
router.post(
  "/step2",
  upload.array("documents", 10),
  validate(step2Schema),
  vendorController.step2
);
router.post("/step3", validate(step3Schema), vendorController.step3);
router.post(
  "/step4",
  upload.array("shopImages", 5),
  validate(step4Schema),
  vendorController.step4
);

router.get("/me", vendorController.me);
router.get("/dashboard", vendorDashboardController.getDashboard);

router.route("/products").get(vendorDashboardController.listProducts).post(validate(createProductSchema), vendorDashboardController.createProduct);
router.route("/products/:id").patch(validate(updateProductSchema), vendorDashboardController.updateProduct).delete(vendorDashboardController.deleteProduct);

router.get("/orders", vendorDashboardController.listOrders);
router.patch("/orders/:id/status", vendorDashboardController.updateOrderStatus);

router.get("/inventory", vendorDashboardController.getInventory);
router.patch("/inventory/:id", vendorDashboardController.updateInventory);

router.get("/analytics", vendorDashboardController.getAnalytics);
router.get("/payouts", vendorDashboardController.getPayouts);

router.get("/delivery", vendorDashboardController.getDelivery);
router.patch("/delivery/:id", vendorDashboardController.updateDelivery);

router.route("/settings").get(vendorDashboardController.getSettings).patch(vendorDashboardController.updateSettings);

router.get("/notifications", vendorDashboardController.getNotifications);
router.patch("/notifications/:id/read", vendorDashboardController.markNotificationRead);

router.get("/reviews", vendorDashboardController.getReviews);
router.post("/reviews/:id/respond", vendorDashboardController.respondToReview);

router.get("/returns", vendorDashboardController.getReturns);
router.patch("/returns/:id", vendorDashboardController.updateReturnStatus);

router.route("/offers").get(vendorDashboardController.getOffers).post(vendorDashboardController.createOffer);
router.patch("/offers/:id", vendorDashboardController.updateOffer);

router.route("/support").get(vendorDashboardController.getSupportTickets).post(vendorDashboardController.createSupportTicket);
router.post("/support/:id/reply", vendorDashboardController.replyToSupportTicket);

module.exports = router;
