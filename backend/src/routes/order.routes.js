const express = require("express");
const { authRequired, requireRole } = require("../middleware/auth");
const orderController = require("../controllers/order.controller");

const router = express.Router();

router.use(authRequired);

// User flows
router.post("/create", orderController.create);
router.get("/user", orderController.listUser);

// Seller/Admin flows
router.get("/seller/me", requireRole("vendor", "admin"), orderController.listSeller);
router.patch("/:id/status", requireRole("vendor", "admin"), orderController.updateStatus);

// Per-order routes (keep after more specific prefixes)
router.get("/:id", orderController.getById);
router.get("/:id/track", orderController.track);
router.patch("/:id/cancel", orderController.cancel);
router.patch("/:id/return", orderController.requestReturn);
router.patch("/:id/payment", orderController.updatePaymentStatus);

module.exports = router;

