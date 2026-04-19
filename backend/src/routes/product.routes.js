const express = require("express");
const { authRequired, requireRole } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const productController = require("../controllers/product.controller");
const {
  createProductSchema,
  updateProductSchema,
  rejectProductSchema,
} = require("../utils/validators/product.validation");

const router = express.Router();

/**
 * ==========================================
 * PUBLIC ROUTES (No auth required)
 * ==========================================
 */

/**
 * GET /products/public
 * Get all approved and active products (PUBLIC STOREFRONT)
 */
router.get("/public", productController.getPublicProducts);

/**
 * GET /products/:id
 * Get single product by ID
 * (Anyone can view approved products)
 */
router.get("/:id", productController.getProductById);

/**
 * ==========================================
 * USER ROUTES (All authenticated users)
 * ==========================================
 */

/**
 * GET /products
 * List products with filtering
 * - Users: see only APPROVED & ACTIVE
 * - Sellers: see only their own
 * - Admins: see all
 */
router.get("/", authRequired, productController.getProducts);

/**
 * ==========================================
 * SELLER ROUTES
 * ==========================================
 */

/**
 * POST /products
 * Create a new product
 * For sellers: auto-pending approval
 * For admins: auto-approved
 */
router.post(
  "/",
  authRequired,
  validate(createProductSchema),
  productController.createProduct
);

/**
 * PATCH /products/:id
 * Update product
 * Sellers: only their own
 * Admins: any product
 */
router.patch(
  "/:id",
  authRequired,
  validate(updateProductSchema),
  productController.updateProduct
);

/**
 * DELETE /products/:id
 * Delete product (soft delete)
 * Sellers: only their own
 * Admins: any product
 */
router.delete("/:id", authRequired, productController.deleteProduct);

/**
 * ==========================================
 * ADMIN ROUTES
 * ==========================================
 */

/**
 * GET /admin/products/pending
 * Get all pending products for approval
 * Admin only
 */
router.get(
  "/admin/pending",
  authRequired,
  requireRole("admin"),
  productController.getPendingProducts
);

/**
 * PATCH /admin/products/:id/approve
 * Approve a product
 * Admin only
 */
router.patch(
  "/admin/:id/approve",
  authRequired,
  requireRole("admin"),
  productController.approveProduct
);

/**
 * PATCH /admin/products/:id/reject
 * Reject a product with reason
 * Admin only
 */
router.patch(
  "/admin/:id/reject",
  authRequired,
  requireRole("admin"),
  validate(rejectProductSchema),
  productController.rejectProduct
);

/**
 * GET /admin/products/stats
 * Get product statistics
 * Admin only
 */
router.get(
  "/admin/stats",
  authRequired,
  requireRole("admin"),
  productController.getProductStats
);

module.exports = router;
