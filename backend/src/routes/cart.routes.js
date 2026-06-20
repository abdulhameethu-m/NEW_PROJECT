const express = require("express");
const { authRequired, authOptional } = require("../middleware/auth");
const cartController = require("../controllers/cart.controller");
const { logger } = require("../utils/logger");
const crypto = require("crypto");

const router = express.Router();

router.use((req, res, next) => {
  const startedAt = Date.now();
  const requestId = req.get("x-request-id") || crypto.randomUUID();
  res.setHeader("x-request-id", requestId);
  res.on("finish", () => {
    logger.info("Cart request completed", {
      requestId,
      endpoint: `${req.method} ${req.baseUrl}${req.path}`,
      durationMs: Date.now() - startedAt,
      statusCode: res.statusCode,
      userId: req.user?.sub ? String(req.user.sub) : "",
      guestCartId: String(req.get("x-guest-cart-id") || ""),
    });
  });
  next();
});

/**
 * GUEST VALIDATION ENDPOINTS
 * Allow guests to validate items without authentication
 * Used by frontend to validate cart before checkout
 */
router.post("/validate-item", authOptional, cartController.validateItem);
router.post("/validate", authOptional, cartController.validateCart);
router.post("/summary", authOptional, cartController.getCartSummary);

/**
 * AUTHENTICATED USER ENDPOINTS
 * Traditional cart operations - require authentication
 */
router.post("/add", authRequired, cartController.add);
router.get("/", authRequired, cartController.getCart);
router.patch("/update", authRequired, cartController.update);
router.delete("/remove", authRequired, cartController.remove);
router.delete("/clear", authRequired, cartController.clear);

/**
 * MERGE ENDPOINTS
 * After guest login - merge guest cart into user cart
 */
router.post("/merge", authRequired, cartController.mergeGuestCart);
router.post("/merge-summary", authRequired, cartController.getMergeSummary);

module.exports = router;


