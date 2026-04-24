const { ok, fail } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const contentRepo = require("../repositories/content.repository");
const vendorRepo = require("../repositories/vendor.repository");

/**
 * ========================================
 * ADMIN ENDPOINTS
 * ========================================
 */

/**
 * CREATE CONTENT (ADMIN)
 * POST /api/content
 */
const createContent = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    image,
    mediaType,
    altText,
    type,
    position,
    startDate,
    endDate,
    ctaUrl,
    ctaText,
    tags,
    linkedProducts,
    isActive,
  } = req.body;

  // Validate required fields
  if (!title || !image || !type) {
    return fail(res, 400, "Title, image, and type are required");
  }

  const contentData = {
    title,
    description,
    image,
    mediaType: mediaType === "video" ? "video" : "image",
    altText,
    type,
    position: position || 0,
    isActive: typeof isActive === "boolean" ? isActive : true,
    startDate: startDate || new Date(),
    endDate: endDate || null,
    createdBy: "admin",
    createdByUserId: req.user.sub,
    ctaUrl: ctaUrl || "",
    ctaText: ctaText || "View More",
    tags: tags || [],
    linkedProducts: linkedProducts || [],
  };

  const content = await contentRepo.create(contentData);

  return ok(res, content, "Content created successfully", 201);
});

/**
 * GET ALL CONTENT (ADMIN)
 * GET /api/content?type=hero&page=1&limit=20
 */
const getAllContent = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type, isActive, search, sortBy = "position", sortOrder = 1 } = req.query;

  const result = await contentRepo.list({
    page: parseInt(page),
    limit: parseInt(limit),
    type,
    isActive: isActive !== undefined ? isActive === "true" : undefined,
    search,
    sortBy,
    sortOrder: parseInt(sortOrder),
  });

  return ok(res, result, "Content retrieved successfully");
});

/**
 * GET SINGLE CONTENT
 * GET /api/content/:id
 */
const getContentById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const content = await contentRepo.findById(id);

  if (!content) {
    return fail(res, 404, "Content not found");
  }

  return ok(res, content, "Content retrieved successfully");
});

/**
 * UPDATE CONTENT
 * PATCH /api/content/:id
 */
const updateContent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Validate ownership (admin or creator)
  const content = await contentRepo.findById(id);
  if (!content) {
    return fail(res, 404, "Content not found");
  }

  // For vendors: only their own content
  if (req.user.role === "vendor") {
    const vendor = await vendorRepo.findByUserId(req.user.sub);
    if (!vendor || content.vendorId.toString() !== vendor._id.toString()) {
      return fail(res, 403, "Unauthorized to update this content");
    }
  }

  const updatedContent = await contentRepo.update(id, updates);

  return ok(res, updatedContent, "Content updated successfully");
});

/**
 * DELETE CONTENT
 * DELETE /api/content/:id
 */
const deleteContent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate ownership
  const content = await contentRepo.findById(id);
  if (!content) {
    return fail(res, 404, "Content not found");
  }

  if (req.user.role === "vendor") {
    const vendor = await vendorRepo.findByUserId(req.user.sub);
    if (!vendor || content.vendorId.toString() !== vendor._id.toString()) {
      return fail(res, 403, "Unauthorized to delete this content");
    }
  }

  await contentRepo.delete(id);

  return ok(res, null, "Content deleted successfully");
});

/**
 * UPDATE CONTENT POSITIONS (reorder)
 * PATCH /api/content/reorder
 * Body: [{ id: "...", position: 1 }, ...]
 */
const reorderContent = asyncHandler(async (req, res) => {
  const { items } = req.body;

  if (!Array.isArray(items)) {
    return fail(res, 400, "Items must be an array");
  }

  await contentRepo.updatePositions(items);

  return ok(res, null, "Content reordered successfully");
});

/**
 * ========================================
 * PUBLIC ENDPOINTS
 * ========================================
 */

/**
 * GET ACTIVE CONTENT BY TYPE (PUBLIC)
 * GET /api/content/public?type=hero
 * Returns only active, valid-date content
 */
const getActiveContentByType = asyncHandler(async (req, res) => {
  const { type } = req.query;

  if (!type) {
    return fail(res, 400, "Type parameter is required");
  }

  const contents = await contentRepo.getActiveByType(type);

  return ok(res, contents, "Active content retrieved successfully");
});

/**
 * GET ACTIVE CONTENT (ALL TYPES, PUBLIC)
 * GET /api/content/public/all
 * For homepage rendering
 */
const getActiveContent = asyncHandler(async (req, res) => {
  const [heroContent, promoContent, collectionContent] = await Promise.all([
    contentRepo.getActiveByType("hero"),
    contentRepo.getActiveByType("promo"),
    contentRepo.getActiveByType("collection"),
  ]);

  return ok(res, {
    hero: heroContent,
    promo: promoContent,
    collection: collectionContent,
  }, "Active content retrieved successfully");
});

/**
 * TRACK VIEW
 * POST /api/content/:id/view
 */
const trackView = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await contentRepo.incrementViewCount(id);

  return ok(res, null, "View tracked");
});

/**
 * TRACK CLICK
 * POST /api/content/:id/click
 */
const trackClick = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await contentRepo.incrementClickCount(id);

  return ok(res, null, "Click tracked");
});

/**
 * ========================================
 * VENDOR ENDPOINTS
 * ========================================
 */

/**
 * GET MY CONTENT (VENDOR)
 * GET /api/content/vendor/my-content
 */
const getMyContent = asyncHandler(async (req, res) => {
  const vendor = await vendorRepo.findByUserId(req.user.sub);

  if (!vendor) {
    return fail(res, 404, "Vendor profile not found");
  }

  const contents = await contentRepo.getByVendor(vendor._id);

  return ok(res, contents, "Your content retrieved successfully");
});

/**
 * CREATE VENDOR CONTENT
 * POST /api/content/vendor
 */
const createVendorContent = asyncHandler(async (req, res) => {
  const vendor = await vendorRepo.findByUserId(req.user.sub);

  if (!vendor) {
    return fail(res, 404, "Vendor profile not found");
  }

  const {
    title,
    description,
    image,
    mediaType,
    altText,
    type,
    position,
    startDate,
    endDate,
    ctaUrl,
    ctaText,
    tags,
    linkedProducts,
    isActive,
  } = req.body;

  if (!title || !image || !type) {
    return fail(res, 400, "Title, image, and type are required");
  }

  const contentData = {
    title,
    description,
    image,
    mediaType: mediaType === "video" ? "video" : "image",
    altText,
    type,
    position: position || 0,
    isActive: typeof isActive === "boolean" ? isActive : true,
    startDate: startDate || new Date(),
    endDate: endDate || null,
    createdBy: "vendor",
    createdByUserId: req.user.sub,
    vendorId: vendor._id,
    ctaUrl: ctaUrl || "",
    ctaText: ctaText || "View More",
    tags: tags || [],
    linkedProducts: linkedProducts || [],
  };

  const content = await contentRepo.create(contentData);

  return ok(res, content, "Content created successfully", 201);
});

/**
 * ========================================
 * DASHBOARD STATS
 * ========================================
 */

/**
 * GET CONTENT STATS
 * GET /api/content/stats
 */
const getContentStats = asyncHandler(async (req, res) => {
  const stats = await contentRepo.getStats();

  return ok(res, stats, "Content stats retrieved successfully");
});

module.exports = {
  createContent,
  getAllContent,
  getContentById,
  updateContent,
  deleteContent,
  reorderContent,
  getActiveContentByType,
  getActiveContent,
  trackView,
  trackClick,
  getMyContent,
  createVendorContent,
  getContentStats,
};
