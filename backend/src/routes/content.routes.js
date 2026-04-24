const express = require("express");
const { authRequired, requireRole } = require("../middleware/auth");
const { requireVendorPermission } = require("../middleware/vendorModuleAccess");
const contentController = require("../controllers/content.controller");

const router = express.Router();

/**
 * ==========================================
 * PUBLIC ROUTES (No auth required)
 * ==========================================
 */

/**
 * GET /api/content/public/all
 * Get all active content (hero, promo, collection)
 * For homepage rendering
 */
router.get("/public/all", contentController.getActiveContent);

/**
 * GET /api/content/public?type=hero
 * Get active content by type
 */
router.get("/public", contentController.getActiveContentByType);

/**
 * POST /api/content/:id/view
 * Track view count
 */
router.post("/:id/view", contentController.trackView);

/**
 * POST /api/content/:id/click
 * Track click count
 */
router.post("/:id/click", contentController.trackClick);

/**
 * ==========================================
 * ADMIN ROUTES
 * ==========================================
 */

/**
 * POST /api/content
 * Create new content (ADMIN)
 */
router.post(
  "/",
  authRequired,
  requireRole("admin"),
  contentController.createContent
);

/**
 * GET /api/content
 * Get all content with filtering (ADMIN)
 */
router.get(
  "/",
  authRequired,
  requireRole("admin"),
  contentController.getAllContent
);

router.patch(
  "/batch/reorder",
  authRequired,
  requireRole("admin"),
  contentController.reorderContent
);

router.get(
  "/dashboard/stats",
  authRequired,
  requireRole("admin"),
  contentController.getContentStats
);

/**
 * GET /api/content/:id
 * Get single content by ID (ADMIN)
 */
router.get(
  "/:id",
  authRequired,
  requireRole("admin"),
  contentController.getContentById
);

/**
 * PATCH /api/content/:id
 * Update content (ADMIN)
 */
router.patch(
  "/:id",
  authRequired,
  requireRole("admin"),
  contentController.updateContent
);

/**
 * DELETE /api/content/:id
 * Delete content (ADMIN)
 */
router.delete(
  "/:id",
  authRequired,
  requireRole("admin"),
  contentController.deleteContent
);

/**
 * ==========================================
 * VENDOR ROUTES
 * (Only accessible if module is enabled)
 * ==========================================
 */

/**
 * GET /api/content/vendor/my-content
 * Get vendor's own content (VENDOR)
 */
router.get(
  "/vendor/my-content",
  authRequired,
  requireRole("vendor"),
  requireVendorPermission("homepage_content.read"),
  contentController.getMyContent
);

/**
 * POST /api/content/vendor
 * Create vendor content (VENDOR)
 */
router.post(
  "/vendor",
  authRequired,
  requireRole("vendor"),
  requireVendorPermission("homepage_content.create"),
  contentController.createVendorContent
);

/**
 * PATCH /api/content/vendor/:id
 * Update vendor's own content (VENDOR)
 */
router.patch(
  "/vendor/:id",
  authRequired,
  requireRole("vendor"),
  requireVendorPermission("homepage_content.update"),
  contentController.updateContent
);

/**
 * DELETE /api/content/vendor/:id
 * Delete vendor's own content (VENDOR)
 */
router.delete(
  "/vendor/:id",
  authRequired,
  requireRole("vendor"),
  requireVendorPermission("homepage_content.delete"),
  contentController.deleteContent
);

module.exports = router;
