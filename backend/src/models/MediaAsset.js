const { Schema, model } = require("mongoose");

// ── Allowed enumerations ──────────────────────────────────────────────────────
const STATUSES = ["UPLOADING", "READY", "ORPHANED", "DELETING", "DELETED", "FAILED"];
const VISIBILITIES = ["public", "private", "restricted"];
const RESOURCE_TYPES = ["image", "video", "raw"];

// ── Embedded reference sub-document ──────────────────────────────────────────
// Tracks every place an asset is in use so we can detect orphans safely.
const ReferenceSchema = new Schema(
  {
    entityType: { type: String, required: true }, // e.g. "Product", "Review", "ReturnRequest"
    entityId:   { type: String, required: true }, // MongoDB ObjectId as string
    field:      { type: String },                  // e.g. "images", "videos", "logo"
    createdAt:  { type: Date, default: Date.now },
  },
  { _id: false }
);

// ── Main schema ───────────────────────────────────────────────────────────────
const MediaAssetSchema = new Schema(
  {
    // Deduplication key — SHA-256 of raw binary content.
    // The unique index enforces one canonical asset per byte-identical file.
    contentHash:       { type: String, required: true, unique: true, index: true },
    hashAlgorithm:     { type: String, default: "sha256" },

    // Cloudinary identifiers
    cloudinaryPublicId: { type: String, index: true, sparse: true },
    secureUrl:          { type: String },

    // Asset metadata
    resourceType:     { type: String, enum: RESOURCE_TYPES, default: "image" },
    format:           { type: String },   // e.g. "jpg", "png", "pdf"
    mimeType:         { type: String },
    fileSize:         { type: Number },   // bytes
    width:            { type: Number },   // pixels
    height:           { type: Number },   // pixels
    folder:           { type: String, index: true },
    originalFilename: { type: String },

    // Professional Gallery Extensions
    albums: [{ type: Schema.Types.ObjectId, ref: "MediaAlbum" }],
    isFavorite: { type: Boolean, default: false, index: true },

    // Lifecycle management
    status:     { type: String, enum: STATUSES, default: "UPLOADING", index: true },
    visibility: { type: String, enum: VISIBILITIES, default: "public" },

    // Reference tracking — embedded for low-to-medium asset volumes.
    // If references grow beyond tens of thousands, extract to a separate collection.
    references:  { type: [ReferenceSchema], default: [] },
    usageCount:  { type: Number, default: 0 },  // denormalised; rebuilt on reconcile

    // Timestamps for orphan grace-period logic
    orphanedAt: { type: Date },
    deletedAt:  { type: Date },

    // Audit
    createdBy: { type: String },     // userId or "system"
    metadata:  { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Compound indexes
MediaAssetSchema.index({ status: 1, orphanedAt: 1 });  // orphan cleanup queries
MediaAssetSchema.index({ "references.entityType": 1, "references.entityId": 1 });

module.exports = { MediaAsset: model("MediaAsset", MediaAssetSchema) };
