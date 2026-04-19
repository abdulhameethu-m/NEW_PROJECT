const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    actorRole: {
      type: String,
      trim: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    entityType: {
      type: String,
      trim: true,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    status: {
      type: String,
      enum: ["SUCCESS", "FAILURE"],
      default: "SUCCESS",
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1, action: 1 });

module.exports = {
  AuditLog: mongoose.model("AuditLog", auditLogSchema),
};
