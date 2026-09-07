/**
 * media.service.js
 *
 * Centralized Media Asset Registry service.
 *
 * RESPONSIBILITIES
 * ────────────────
 * 1. Calculate SHA-256 hash from file buffer (deduplication key).
 * 2. Look up the registry before every Cloudinary upload.
 * 3. Reuse an existing Cloudinary asset when the same bytes are seen again.
 * 4. Protect against concurrent uploads of the same file (race-safe via unique-index).
 * 5. Track where every asset is referenced.
 * 6. Manage the orphan → safe-delete lifecycle.
 * 7. Provide admin reconciliation helpers.
 *
 * USAGE (simple)
 * ──────────────
 * const mediaService = require("./media.service");
 * const asset = await mediaService.uploadIfNotExists(file, {
 *   folder:     "products",
 *   entityType: "Product",
 *   entityId:   productId,
 *   field:      "images",
 *   createdBy:  userId,
 * });
 * // asset.secureUrl  — the Cloudinary URL
 * // asset._id        — store as mediaId reference
 *
 * BACKWARD COMPATIBILITY
 * ──────────────────────
 * uploadIfNotExists returns an object that includes `url` and `publicId` in
 * addition to the full MediaAsset document so callers can drop-in replace
 * the existing uploadMany() result shape with zero other code changes.
 */

const crypto = require("crypto");
const { MediaAsset } = require("../models/MediaAsset");
const { configureCloudinary } = require("../config/cloudinary");
const { logger } = require("../utils/logger");

// ── Grace period before an orphaned asset may be deleted ─────────────────────
const ORPHAN_GRACE_MS = Number(process.env.MEDIA_ORPHAN_GRACE_DAYS || 7) * 24 * 60 * 60 * 1000;

// ── Hash ─────────────────────────────────────────────────────────────────────

/**
 * Calculate a SHA-256 hex digest from a binary Buffer.
 * This is the canonical deduplication key — independent of filename, path, or URL.
 *
 * @param {Buffer} buffer
 * @returns {string} 64-char lowercase hex string
 */
function calculateContentHash(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError("calculateContentHash requires a Buffer");
  }
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

// ── Cloudinary primitive ──────────────────────────────────────────────────────

/**
 * Upload a single file buffer to Cloudinary and return raw result.
 * This is the only place in media.service that touches Cloudinary directly.
 *
 * @param {object} file - Multer file object (must have .buffer and .mimetype)
 * @param {string} folder - Cloudinary folder name
 * @returns {object} Cloudinary upload result
 */
async function uploadBufferToCloudinary(file, folder) {
  const { enabled, cloudinary } = configureCloudinary();
  if (!enabled) {
    throw new Error("Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.");
  }

  const resourceType =
    file.mimetype === "application/pdf"
      ? "raw"
      : file.mimetype.startsWith("video/")
      ? "video"
      : "image";

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(file.buffer);
  });
}

// ── Core deduplication logic ──────────────────────────────────────────────────

/**
 * uploadIfNotExists — THE main entry point for all file uploads.
 *
 * Flow:
 *  1. Hash the buffer.
 *  2. Check if a READY MediaAsset exists for this hash.
 *  3a. If yes → reuse it (no Cloudinary upload).
 *  3b. If no  → attempt to "claim" a slot by inserting an UPLOADING record.
 *       • If the insert succeeds → upload to Cloudinary → mark READY.
 *       • If it fails with E11000 (race condition) → another process got there first;
 *         wait briefly and return the winner's asset.
 *  4. Add a reference entry and increment usageCount.
 *  5. Return the MediaAsset (with `url` and `publicId` aliases for drop-in compatibility).
 *
 * @param {object} file - Multer file ({ buffer, mimetype, originalname, size })
 * @param {object} context
 * @param {string} context.folder       - Cloudinary folder (e.g. "products")
 * @param {string} [context.entityType] - e.g. "Product"
 * @param {string} [context.entityId]   - entity MongoDB ID string
 * @param {string} [context.field]      - e.g. "images"
 * @param {string} [context.createdBy]  - userId
 * @param {string} [context.visibility] - "public" | "private" | "restricted"
 * @returns {MediaAsset & { url: string, publicId: string }}
 */
async function uploadIfNotExists(file, context = {}) {
  const { folder = "uploads", entityType, entityId, field, createdBy, visibility = "public" } = context;

  if (!file?.buffer) {
    throw new Error("uploadIfNotExists requires a file with a buffer");
  }

  const hash = calculateContentHash(file.buffer);

  // ── Step 1: Check for existing READY asset ────────────────────────────────
  const existing = await MediaAsset.findOne({ contentHash: hash, status: "READY" });
  if (existing) {
    logger.info(`[MediaRegistry] Dedup hit for hash ${hash.slice(0, 16)}… (asset ${existing._id})`);
    if (entityType && entityId) {
      await addReference(existing._id, { entityType, entityId, field });
    }
    const result = assetToResult(existing);
    result.wasDeduplicated = true;
    return result;
  }

  // ── Step 2: Claim the upload slot ─────────────────────────────────────────
  let asset;
  try {
    asset = await MediaAsset.create({
      contentHash: hash,
      status: "UPLOADING",
      folder,
      mimeType: file.mimetype,
      fileSize: file.size,
      originalFilename: file.originalname,
      visibility,
      createdBy: createdBy || "system",
    });
  } catch (err) {
    if (err.code === 11000) {
      // ── Race condition: another concurrent upload won the race ────────────
      // Poll for up to 5 seconds for the winner to finish uploading.
      logger.info(`[MediaRegistry] Race condition on hash ${hash.slice(0, 16)}…, waiting for winner`);
      const winner = await pollForReady(hash, 5000);
      if (winner) {
        if (entityType && entityId) {
          await addReference(winner._id, { entityType, entityId, field });
        }
        const result = assetToResult(winner);
        result.wasDeduplicated = true;
        return result;
      }
      // Winner timed out — fall through and create our own upload
      // (edge case: the winner failed; we retry)
      asset = await MediaAsset.findOne({ contentHash: hash });
      if (!asset) throw err;
      // The FAILED asset can be retried — update to UPLOADING
      asset.status = "UPLOADING";
      await asset.save();
    } else {
      throw err;
    }
  }

  // ── Step 3: Upload to Cloudinary ──────────────────────────────────────────
  try {
    const result = await uploadBufferToCloudinary(file, folder);

    asset.cloudinaryPublicId = result.public_id;
    asset.secureUrl          = result.secure_url;
    asset.resourceType       = result.resource_type;
    asset.format             = result.format;
    asset.width              = result.width;
    asset.height             = result.height;
    asset.fileSize           = result.bytes || file.size;
    asset.status             = "READY";

    await asset.save();

    logger.info(`[MediaRegistry] New asset registered: ${result.public_id} (${hash.slice(0, 16)}…)`);
  } catch (uploadErr) {
    // Mark FAILED so the slot can be retried later without blocking
    asset.status = "FAILED";
    await asset.save().catch(() => {}); // best-effort save
    throw uploadErr;
  }

  // ── Step 4: Add reference ─────────────────────────────────────────────────
  if (entityType && entityId) {
    await addReference(asset._id, { entityType, entityId, field });
  }

  return assetToResult(asset);
}

// ── Polling helper for race-condition winner ──────────────────────────────────

async function pollForReady(hash, timeoutMs) {
  const start = Date.now();
  const interval = 300; // ms
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, interval));
    const asset = await MediaAsset.findOne({ contentHash: hash });
    if (asset?.status === "READY") return asset;
    if (asset?.status === "FAILED") return null; // winner failed; let caller retry
  }
  return null;
}

// ── Result shape ──────────────────────────────────────────────────────────────

/**
 * Returns the asset document with extra alias fields for drop-in compatibility
 * with the existing uploadMany() result shape used throughout the codebase.
 */
function assetToResult(asset) {
  const doc = asset.toObject ? asset.toObject() : asset;
  return {
    ...doc,
    url:      doc.secureUrl,       // alias: uploadMany returns { url }
    publicId: doc.cloudinaryPublicId, // alias: uploadMany returns { publicId }
  };
}

// ── Reference management ──────────────────────────────────────────────────────

/**
 * Add a usage reference to an asset and increment usageCount.
 * Idempotent — will not add a duplicate reference for the same entityType/entityId/field.
 *
 * @param {string|ObjectId} mediaId
 * @param {{ entityType, entityId, field }} ref
 */
async function addReference(mediaId, ref) {
  const { entityType, entityId, field } = ref || {};
  if (!entityType || !entityId) return;

  // Check for duplicate before adding
  const existing = await MediaAsset.findOne({
    _id: mediaId,
    "references.entityType": entityType,
    "references.entityId": String(entityId),
    "references.field": field || { $exists: true },
  });

  if (existing) return; // already tracked

  await MediaAsset.findByIdAndUpdate(mediaId, {
    $push: { references: { entityType, entityId: String(entityId), field } },
    $inc:  { usageCount: 1 },
    $set:  { status: "READY" }, // ensure status is READY if previously ORPHANED
  });
}

/**
 * Remove a usage reference from an asset. If usageCount drops to zero,
 * the asset is marked ORPHANED (not immediately deleted).
 *
 * @param {string|ObjectId} mediaId
 * @param {string} entityType
 * @param {string} entityId
 */
async function removeReference(mediaId, entityType, entityId) {
  const asset = await MediaAsset.findById(mediaId);
  if (!asset) return;

  const sizeBefore = asset.references.length;
  asset.references = asset.references.filter(
    (r) => !(r.entityType === entityType && r.entityId === String(entityId))
  );
  const removed = sizeBefore - asset.references.length;
  if (removed > 0) {
    asset.usageCount = Math.max(0, asset.usageCount - removed);
  }

  if (asset.usageCount === 0 && asset.references.length === 0 && asset.status === "READY") {
    asset.status = "ORPHANED";
    asset.orphanedAt = new Date();
    logger.info(`[MediaRegistry] Asset ${asset._id} marked ORPHANED`);
  }

  await asset.save();
}

/**
 * Recalculate usageCount from the actual references array.
 * Useful after manual data corrections or bulk operations.
 *
 * @param {string|ObjectId} mediaId
 */
async function reconcileUsage(mediaId) {
  const asset = await MediaAsset.findById(mediaId);
  if (!asset) return null;

  const count = (asset.references || []).length;
  asset.usageCount = count;
  if (count === 0 && asset.status === "READY") {
    asset.status = "ORPHANED";
    asset.orphanedAt = new Date();
  }
  if (count > 0 && asset.status === "ORPHANED") {
    asset.status = "READY";
    asset.orphanedAt = undefined;
  }
  await asset.save();
  return asset;
}

// ── Admin / query helpers ─────────────────────────────────────────────────────

/**
 * List media assets with pagination and optional filters.
 *
 * @param {object} opts
 * @param {number} opts.page
 * @param {number} opts.limit
 * @param {string} [opts.status]
 * @param {string} [opts.entityType]
 * @param {string} [opts.entityId]
 * @param {string} [opts.format]
 * @param {string} [opts.search]  - searches originalFilename / cloudinaryPublicId / contentHash prefix
 */
async function listAssets({ page = 1, limit = 20, status, entityType, entityId, format, search, albumId, isFavorite } = {}) {
  const filter = {};

  if (status) {
    filter.status = status;
  } else {
    // By default, do not show permanently deleted assets in the "All Statuses" view
    filter.status = { $ne: "DELETED" };
  }
  if (format) filter.format = format;
  if (isFavorite === "true" || isFavorite === true) filter.isFavorite = true;
  if (albumId) filter.albums = albumId;
  if (entityType && entityId) {
    filter["references.entityType"] = entityType;
    filter["references.entityId"]   = String(entityId);
  } else if (entityType) {
    filter["references.entityType"] = entityType;
  }
  if (search) {
    const re = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [
      { originalFilename: re },
      { cloudinaryPublicId: re },
      { contentHash: re },
    ];
  }

  const skip = (Math.max(page, 1) - 1) * Math.min(limit, 100);
  const [assets, total] = await Promise.all([
    MediaAsset.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Math.min(limit, 100))
      .lean(),
    MediaAsset.countDocuments(filter),
  ]);

  return { assets, total, page, limit: Math.min(limit, 100), pages: Math.ceil(total / Math.min(limit, 100)) };
}

/**
 * Get a single asset by ID.
 */
async function getAsset(mediaId) {
  return MediaAsset.findById(mediaId).lean();
}

/**
 * List assets that have been ORPHANED past the grace period.
 */
async function listOrphans({ page = 1, limit = 50 } = {}) {
  const cutoff = new Date(Date.now() - ORPHAN_GRACE_MS);
  return listAssets({ status: "ORPHANED" });
  // Caller can filter by orphanedAt < cutoff for grace-period enforcement
}

// ── Safe deletion ─────────────────────────────────────────────────────────────

/**
 * Safely delete an asset from Cloudinary and mark it DELETED in the registry.
 *
 * Safety rules:
 *  - Refuses if usageCount > 0 (active references exist).
 *  - Recalculates usageCount from references before accepting deletion.
 *  - Only deletes from Cloudinary after confirming usageCount = 0.
 *  - If Cloudinary deletion fails, the asset is NOT marked DELETED.
 *
 * @param {string|ObjectId} mediaId
 * @returns {{ success: boolean, message: string }}
 */
async function safeDelete(mediaId) {
  const asset = await MediaAsset.findById(mediaId);
  if (!asset) return { success: false, message: "Asset not found" };
  if (asset.status === "DELETED") return { success: true, message: "Already deleted" };

  // Recount from the embedded references array for consistency
  const liveCount = (asset.references || []).length;
  if (liveCount > 0) {
    return {
      success: false,
      message: `Cannot delete: asset has ${liveCount} active reference(s)`,
      references: asset.references,
    };
  }

  // Mark DELETING to prevent concurrent deletion attempts
  asset.status = "DELETING";
  await asset.save();

  // Delete from Cloudinary
  if (asset.cloudinaryPublicId) {
    const { enabled, cloudinary } = configureCloudinary();
    if (enabled) {
      try {
        const result = await cloudinary.uploader.destroy(asset.cloudinaryPublicId, {
          resource_type: asset.resourceType || "image",
        });
        if (result.result !== "ok" && result.result !== "not found") {
          // Revert status so it can be retried
          asset.status = "ORPHANED";
          await asset.save();
          return { success: false, message: `Cloudinary deletion failed: ${result.result}` };
        }
      } catch (err) {
        asset.status = "ORPHANED";
        await asset.save();
        return { success: false, message: `Cloudinary deletion error: ${err.message}` };
      }
    }
  }

  asset.status    = "DELETED";
  asset.deletedAt = new Date();
  await asset.save();

  logger.info(`[MediaRegistry] Asset ${mediaId} deleted (public_id: ${asset.cloudinaryPublicId})`);
  return { success: true, message: "Asset deleted successfully" };
}

// ── Back-fill helper for existing uploads ─────────────────────────────────────

/**
 * Register an asset that was already uploaded to Cloudinary via the legacy uploadMany() path.
 * Creates a READY MediaAsset record without re-uploading.
 * Used when wrapping existing upload calls to back-fill the registry.
 *
 * If a duplicate contentHash already exists (e.g. called twice), silently
 * returns the existing record.
 *
 * Note: We cannot compute a content hash without the original buffer.
 * Legacy assets without a buffer use cloudinaryPublicId as a synthetic key
 * and are marked with a synthetic hash prefix so they can be identified.
 *
 * @param {object} uploadResult - result from uploadMany() { url, publicId, originalName, mimeType, size }
 * @param {object} context      - { entityType, entityId, field, folder, createdBy, visibility }
 * @param {Buffer} [buffer]     - original buffer for proper SHA-256 (preferred)
 */
async function registerExistingAsset(uploadResult, context = {}, buffer = null) {
  if (!uploadResult?.url) return null;

  const { entityType, entityId, field, folder, createdBy, visibility = "public" } = context;

  // Derive hash
  let contentHash;
  let syntheticHash = false;
  if (buffer && Buffer.isBuffer(buffer)) {
    contentHash = calculateContentHash(buffer);
  } else {
    // Synthetic hash — cannot deduplicate without buffer, but we still track the asset
    contentHash = `legacy:${uploadResult.publicId || uploadResult.url}`;
    syntheticHash = true;
  }

  try {
    const asset = await MediaAsset.create({
      contentHash,
      hashAlgorithm: syntheticHash ? "synthetic" : "sha256",
      status: "READY",
      cloudinaryPublicId: uploadResult.publicId || null,
      secureUrl: uploadResult.url,
      mimeType: uploadResult.mimeType,
      fileSize: uploadResult.size,
      originalFilename: uploadResult.originalName,
      folder: folder || null,
      visibility,
      createdBy: createdBy || "system",
    });

    if (entityType && entityId) {
      await addReference(asset._id, { entityType, entityId, field });
    }
    return assetToResult(asset);
  } catch (err) {
    if (err.code === 11000) {
      // Already registered — just add the reference
      const existing = await MediaAsset.findOne({ contentHash });
      if (existing && entityType && entityId) {
        await addReference(existing._id, { entityType, entityId, field });
      }
      return existing ? assetToResult(existing) : null;
    }
    // Non-duplicate errors: log and do NOT break the caller
    logger.warn(`[MediaRegistry] registerExistingAsset failed: ${err.message}`);
    return null;
  }
}

// ── Metrics ───────────────────────────────────────────────────────────────────

/**
 * Return aggregate statistics for the Admin Media Dashboard.
 */
async function getMetrics() {
  const [statusCounts, totalCloudinary] = await Promise.all([
    MediaAsset.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    MediaAsset.countDocuments({ cloudinaryPublicId: { $ne: null }, status: { $ne: "DELETED" } }),
  ]);

  const byStatus = Object.fromEntries(statusCounts.map((s) => [s._id, s.count]));
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
  const ready = byStatus.READY || 0;
  const orphaned = byStatus.ORPHANED || 0;
  const failed = byStatus.FAILED || 0;

  return {
    totalAssets: total,
    readyAssets: ready,
    orphanedAssets: orphaned,
    failedAssets: failed,
    deletedAssets: byStatus.DELETED || 0,
    totalCloudinaryAssets: totalCloudinary,
    // Deduplication savings = uploads avoided because hash already existed
    // Cannot be computed retroactively; tracked by application logs.
    deduplicationHits: "NOT_MEASURED",
  };
}

// ── Bulk & Favorite Extensions ────────────────────────────────────────────────

/**
 * Toggle favorite status of a single media asset
 */
async function toggleFavorite(mediaId) {
  const asset = await MediaAsset.findById(mediaId);
  if (!asset) return null;
  asset.isFavorite = !asset.isFavorite;
  await asset.save();
  return asset;
}

/**
 * Perform bulk action on selected assets
 * actions: addToAlbum, moveToAlbum, delete
 */
async function bulkAction(action, assetIds, context = {}) {
  const { targetAlbumId } = context;
  
  if (action === "addToAlbum") {
    if (!targetAlbumId) throw new Error("targetAlbumId required for addToAlbum");
    const res = await MediaAsset.updateMany(
      { _id: { $in: assetIds } },
      { $addToSet: { albums: targetAlbumId } }
    );
    return { modifiedCount: res.modifiedCount };
  }
  
  if (action === "removeFromAlbum") {
    if (!targetAlbumId) throw new Error("targetAlbumId required for removeFromAlbum");
    const res = await MediaAsset.updateMany(
      { _id: { $in: assetIds } },
      { $pull: { albums: targetAlbumId } }
    );
    return { modifiedCount: res.modifiedCount };
  }
  
  if (action === "moveToAlbum") {
    // Moves to one album exclusively
    if (!targetAlbumId) throw new Error("targetAlbumId required for moveToAlbum");
    const res = await MediaAsset.updateMany(
      { _id: { $in: assetIds } },
      { $set: { albums: [targetAlbumId] } }
    );
    return { modifiedCount: res.modifiedCount };
  }

  if (action === "delete") {
    let deletedCount = 0;
    let failedCount = 0;
    for (const id of assetIds) {
      const res = await safeDelete(id);
      if (res.success) deletedCount++;
      else failedCount++;
    }
    return { deletedCount, failedCount };
  }

  throw new Error("Invalid bulk action");
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  calculateContentHash,
  uploadIfNotExists,
  addReference,
  removeReference,
  reconcileUsage,
  getAsset,
  listAssets,
  listOrphans,
  safeDelete,
  registerExistingAsset,
  getMetrics,
  toggleFavorite,
  bulkAction,
};
