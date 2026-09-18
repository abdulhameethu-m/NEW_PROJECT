const mediaService = require("../services/media.service");
const { asyncHandler } = require("../utils/asyncHandler");

/**
 * GET /api/admin/media or /api/vendor/media
 * List media assets with pagination and filters.
 */
const listAssets = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, entityType, entityId, format, resourceType, search, albumId, isFavorite } = req.query;
  const isVendor = req.user?.role === "vendor";
  const createdBy = isVendor ? req.user.sub : req.query.createdBy;

  const result = await mediaService.listAssets({
    page: Number(page),
    limit: Number(limit),
    status,
    entityType,
    entityId,
    format,
    resourceType,
    search,
    albumId,
    isFavorite,
    createdBy,
  });
  res.json({ success: true, ...result });
});

/**
 * GET /api/admin/media/metrics or /api/vendor/media/metrics
 * Aggregate counts for the Media Dashboard.
 */
const getMetrics = asyncHandler(async (req, res) => {
  const isVendor = req.user?.role === "vendor";
  const createdBy = isVendor ? req.user.sub : undefined;
  const metrics = await mediaService.getMetrics(createdBy);
  res.json({ success: true, metrics });
});

/**
 * GET /api/admin/media/:id or /api/vendor/media/:id
 * Get a single media asset by ID.
 */
const getAsset = asyncHandler(async (req, res) => {
  const isVendor = req.user?.role === "vendor";
  const createdBy = isVendor ? req.user.sub : undefined;
  const asset = await mediaService.getAsset(req.params.id, createdBy);
  if (!asset) return res.status(404).json({ success: false, message: "Asset not found" });
  res.json({ success: true, asset });
});

/**
 * GET /api/admin/media/:id/usage or /api/vendor/media/:id/usage
 * Get the references (usage) for a media asset.
 */
const getUsage = asyncHandler(async (req, res) => {
  const isVendor = req.user?.role === "vendor";
  const createdBy = isVendor ? req.user.sub : undefined;
  const asset = await mediaService.getAsset(req.params.id, createdBy);
  if (!asset) return res.status(404).json({ success: false, message: "Asset not found" });
  res.json({
    success: true,
    usageCount: asset.usageCount,
    references: asset.references || [],
  });
});

/**
 * POST /api/admin/media/:id/reconcile or /api/vendor/media/:id/reconcile
 * Recalculate usageCount from the actual references array.
 */
const reconcileAsset = asyncHandler(async (req, res) => {
  const isVendor = req.user?.role === "vendor";
  const createdBy = isVendor ? req.user.sub : undefined;
  if (isVendor) {
    const check = await mediaService.getAsset(req.params.id, createdBy);
    if (!check) return res.status(404).json({ success: false, message: "Asset not found" });
  }
  const asset = await mediaService.reconcileUsage(req.params.id);
  if (!asset) return res.status(404).json({ success: false, message: "Asset not found" });
  res.json({ success: true, asset });
});

/**
 * DELETE /api/admin/media/:id or /api/vendor/media/:id
 * Safely delete a media asset.
 * Blocked if usageCount > 0 or active references exist.
 */
const deleteAsset = asyncHandler(async (req, res) => {
  const isVendor = req.user?.role === "vendor";
  const createdBy = isVendor ? req.user.sub : undefined;
  const result = await mediaService.safeDelete(req.params.id, createdBy);
  if (!result.success) {
    return res.status(result.references ? 409 : 400).json({ success: false, ...result });
  }
  res.json({ success: true, ...result });
});

/**
 * POST /api/admin/media/upload or /api/vendor/media/upload
 * Safely upload media assets via Admin or Vendor portal.
 */
const uploadAsset = asyncHandler(async (req, res) => {
  const files = req.files || (req.file ? [req.file] : []);
  if (!files || files.length === 0) {
    return res.status(400).json({ success: false, message: "No files provided" });
  }

  const isVendor = req.user?.role === "vendor";
  const folder = isVendor ? `vendors/${req.user.sub}` : "general";
  const createdBy = isVendor ? req.user.sub : (req.user?._id || req.user?.sub || "admin");

  const uploadPromises = files.map(file => mediaService.uploadIfNotExists(file, {
    folder,
    createdBy,
  }));

  const assets = await Promise.all(uploadPromises);
  const dupes = assets.filter(a => a.wasDeduplicated).length;
  
  res.status(201).json({ 
    success: true, 
    assets, 
    message: `Successfully uploaded ${assets.length} assets${dupes > 0 ? ` (${dupes} deduplicated)` : ''}`
  });
});

/**
 * PUT /api/admin/media/:id/favorite or /api/vendor/media/:id/favorite
 */
const toggleFavorite = asyncHandler(async (req, res) => {
  const isVendor = req.user?.role === "vendor";
  const createdBy = isVendor ? req.user.sub : undefined;
  const asset = await mediaService.toggleFavorite(req.params.id, createdBy);
  if (!asset) return res.status(404).json({ success: false, message: "Asset not found" });
  res.json({ success: true, asset });
});

/**
 * POST /api/admin/media/bulk-action or /api/vendor/media/bulk-action
 */
const bulkAction = asyncHandler(async (req, res) => {
  const { action, assetIds, targetAlbumId } = req.body;
  if (!assetIds || !Array.isArray(assetIds)) {
    return res.status(400).json({ success: false, message: "assetIds must be an array" });
  }

  const isVendor = req.user?.role === "vendor";
  const createdBy = isVendor ? req.user.sub : undefined;
  const result = await mediaService.bulkAction(action, assetIds, { targetAlbumId, createdBy });
  res.json({ success: true, result });
});

module.exports = { listAssets, getMetrics, getAsset, getUsage, reconcileAsset, deleteAsset, uploadAsset, toggleFavorite, bulkAction };
