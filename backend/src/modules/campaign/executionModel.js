const mongoose = require("mongoose");

const DELIVERABLE_STATUSES = [
  "pending",
  "uploaded",
  "vendor_review",
  "under_review",
  "approved",
  "revision_requested",
  "rejected",
  "published",
  "expired",
  "missed_deadline",
  "completed",
  "cancelled",
];

const SUBMISSION_STATUSES = ["uploaded", "under_review", "approved", "revision_requested", "rejected"];
const REVIEW_DECISIONS = ["approve", "reject", "revision_requested"];
const PAYOUT_STATUSES = ["not_eligible", "eligible", "generated", "released", "cancelled"];

const campaignDeliverableSchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", required: true, index: true },
    influencerId: { type: mongoose.Schema.Types.ObjectId, ref: "InfluencerProfile", required: true, index: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true, index: true },
    deliverableType: { type: String, trim: true, required: true, index: true },
    title: { type: String, trim: true, maxlength: 180, default: "" },
    quantity: { type: Number, min: 1, required: true },
    unitPrice: { type: Number, min: 0, default: 0 },
    totalPrice: { type: Number, min: 0, default: 0 },
    currency: { type: String, trim: true, uppercase: true, default: "INR" },
    expectedCompletionDate: { type: Date },
    dueDate: { type: Date, index: true },
    dueTime: { type: String, trim: true, default: "" },
    status: { type: String, enum: DELIVERABLE_STATUSES, default: "pending", index: true },
    completionStatus: { type: String, enum: ["pending", "partial", "completed", "cancelled"], default: "pending", index: true },
    approvalStatus: { type: String, enum: ["pending", "uploaded", "under_review", "approved", "revision_requested", "rejected"], default: "pending", index: true },
    paymentEligibility: { type: String, enum: ["not_eligible", "eligible", "paid"], default: "not_eligible", index: true },
    approvedAt: { type: Date },
    publishDate: { type: Date },
    publishTime: { type: String, trim: true, default: "" },
    publishTimezone: { type: String, trim: true, default: "UTC" },
    scheduledPublishAt: { type: Date, index: true },
    publishedAt: { type: Date },
    expiredAt: { type: Date },
    refundEligible: { type: Boolean, default: false, index: true },
    refundStatus: {
      type: String,
      enum: ["not_eligible", "refund_eligible", "refund_pending", "refund_approved", "refund_completed"],
      default: "not_eligible",
      index: true,
    },
    missedDeadline: { type: Boolean, default: false, index: true },
    affiliateEnabled: { type: Boolean, default: false },
    trackingEnabled: { type: Boolean, default: false },
    completedAt: { type: Date },
    latestSubmissionId: { type: mongoose.Schema.Types.ObjectId, ref: "DeliverableSubmission" },
    fundingAllocationId: { type: mongoose.Schema.Types.ObjectId, ref: "CampaignDeliverableFunding", default: null, index: true },
    source: { type: String, trim: true, default: "campaign_snapshot" },
    snapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: "campaign_deliverables" }
);

campaignDeliverableSchema.index({ campaignId: 1, influencerId: 1, deliverableType: 1 });
campaignDeliverableSchema.index({ status: 1, dueDate: 1 });
campaignDeliverableSchema.index({ status: 1, scheduledPublishAt: 1 });
campaignDeliverableSchema.index({ refundEligible: 1, refundStatus: 1 });

const deliverableSubmissionSchema = new mongoose.Schema(
  {
    deliverableId: { type: mongoose.Schema.Types.ObjectId, ref: "CampaignDeliverable", required: true, index: true },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", required: true, index: true },
    influencerId: { type: mongoose.Schema.Types.ObjectId, ref: "InfluencerProfile", required: true, index: true },
    contentUrl: { type: String, trim: true, required: true, maxlength: 1200 },
    contentType: {
      type: String,
      enum: ["post", "reel", "video", "image", "document", "url", "youtube", "instagram", "facebook", "tiktok", "other"],
      default: "post",
      index: true,
    },
    sourcePlatform: { type: String, trim: true, lowercase: true, default: "" },
    mediaType: { type: String, trim: true, lowercase: true, default: "" },
    uploadMethod: { type: String, enum: ["url", "file"], default: "url", index: true },
    mediaUrls: { type: [String], default: [] },
    fileMetadata: { type: [mongoose.Schema.Types.Mixed], default: [] },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    version: { type: Number, min: 1, default: 1 },
    status: { type: String, enum: SUBMISSION_STATUSES, default: "under_review", index: true },
    notes: { type: String, trim: true, maxlength: 1000, default: "" },
    submittedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true, collection: "deliverable_submissions" }
);

deliverableSubmissionSchema.index({ deliverableId: 1, version: -1 });

const deliverableReviewSchema = new mongoose.Schema(
  {
    submissionId: { type: mongoose.Schema.Types.ObjectId, ref: "DeliverableSubmission", required: true, index: true },
    deliverableId: { type: mongoose.Schema.Types.ObjectId, ref: "CampaignDeliverable", required: true, index: true },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", required: true, index: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true, index: true },
    decision: { type: String, enum: REVIEW_DECISIONS, required: true, index: true },
    comments: { type: String, trim: true, maxlength: 1500, default: "" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reviewedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true, collection: "deliverable_reviews" }
);

const deliverablePayoutSchema = new mongoose.Schema(
  {
    deliverableId: { type: mongoose.Schema.Types.ObjectId, ref: "CampaignDeliverable", required: true, index: true },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", required: true, index: true },
    influencerId: { type: mongoose.Schema.Types.ObjectId, ref: "InfluencerProfile", required: true, index: true },
    approvedAmount: { type: Number, min: 0, default: 0 },
    currency: { type: String, trim: true, uppercase: true, default: "INR" },
    status: { type: String, enum: PAYOUT_STATUSES, default: "eligible", index: true },
    paymentModel: { type: String, trim: true, default: "" },
    payoutBasis: { type: String, trim: true, default: "approved_deliverable_value" },
    generatedAt: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: "deliverable_payouts" }
);

deliverablePayoutSchema.index({ deliverableId: 1, influencerId: 1 }, { unique: true });

const campaignExecutionAuditSchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", index: true },
    deliverableId: { type: mongoose.Schema.Types.ObjectId, ref: "CampaignDeliverable", index: true },
    submissionId: { type: mongoose.Schema.Types.ObjectId, ref: "DeliverableSubmission", index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    role: { type: String, trim: true, default: "" },
    action: { type: String, trim: true, required: true, index: true },
    oldValue: { type: mongoose.Schema.Types.Mixed, default: null },
    newValue: { type: mongoose.Schema.Types.Mixed, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: "campaign_execution_audit_logs" }
);

module.exports = {
  CampaignDeliverable: mongoose.models.CampaignDeliverable || mongoose.model("CampaignDeliverable", campaignDeliverableSchema),
  DeliverableSubmission: mongoose.models.DeliverableSubmission || mongoose.model("DeliverableSubmission", deliverableSubmissionSchema),
  DeliverableReview: mongoose.models.DeliverableReview || mongoose.model("DeliverableReview", deliverableReviewSchema),
  DeliverablePayout: mongoose.models.DeliverablePayout || mongoose.model("DeliverablePayout", deliverablePayoutSchema),
  CampaignExecutionAudit: mongoose.models.CampaignExecutionAudit || mongoose.model("CampaignExecutionAudit", campaignExecutionAuditSchema),
  DELIVERABLE_STATUSES,
  SUBMISSION_STATUSES,
  REVIEW_DECISIONS,
  PAYOUT_STATUSES,
};
