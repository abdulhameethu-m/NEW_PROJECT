const mongoose = require("mongoose");

const SHIPMENT_STATUSES = [
  "pending_shipment",
  "packed",
  "dispatched",
  "in_transit",
  "delivered",
  "received",
  "content_creation_started",
  "campaign_completed",
  "return_pending",
  "return_dispatched",
  "return_in_transit",
  "return_delivered",
  "return_completed",
  "cancelled",
];

const timelineSchema = new mongoose.Schema(
  {
    status: { type: String, enum: SHIPMENT_STATUSES, required: true },
    label: { type: String, trim: true, maxlength: 160, default: "" },
    note: { type: String, trim: true, maxlength: 1000, default: "" },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actorRole: { type: String, trim: true, maxlength: 40, default: "" },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const campaignProductShipmentSchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", required: true, unique: true, index: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true, index: true },
    influencerId: { type: mongoose.Schema.Types.ObjectId, ref: "InfluencerProfile", index: true },
    productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    productRequired: { type: Boolean, default: false, index: true },
    returnRequired: { type: Boolean, default: true },

    influencerAddressId: { type: mongoose.Schema.Types.ObjectId },
    vendorReturnAddressId: { type: mongoose.Schema.Types.ObjectId },
    deliveryAddressSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
    returnAddressSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },

    courierCompany: { type: String, trim: true, maxlength: 120, default: "" },
    trackingNumber: { type: String, trim: true, maxlength: 120, default: "" },
    trackingUrl: { type: String, trim: true, maxlength: 500, default: "" },
    shipmentDate: { type: Date },
    estimatedDelivery: { type: Date },
    shippingCost: { type: Number, min: 0, default: 0 },
    packageWeight: { type: String, trim: true, maxlength: 80, default: "" },
    packageDimensions: {
      length: { type: String, trim: true, maxlength: 40, default: "" },
      width: { type: String, trim: true, maxlength: 40, default: "" },
      height: { type: String, trim: true, maxlength: 40, default: "" },
      unit: { type: String, trim: true, maxlength: 20, default: "cm" },
    },
    notes: { type: String, trim: true, maxlength: 1500, default: "" },

    shipmentStatus: { type: String, enum: SHIPMENT_STATUSES, default: "pending_shipment", index: true },
    deliveredAt: { type: Date },
    receivedAt: { type: Date },
    deliveryProof: { type: mongoose.Schema.Types.Mixed, default: {} },

    returnCourierCompany: { type: String, trim: true, maxlength: 120, default: "" },
    returnTrackingNumber: { type: String, trim: true, maxlength: 120, default: "" },
    returnTrackingUrl: { type: String, trim: true, maxlength: 500, default: "" },
    returnShipmentDate: { type: Date },
    returnEstimatedDelivery: { type: Date },
    returnNotes: { type: String, trim: true, maxlength: 1500, default: "" },
    returnProof: { type: mongoose.Schema.Types.Mixed, default: {} },

    timeline: { type: [timelineSchema], default: [] },
  },
  { timestamps: true, collection: "campaign_product_shipments" }
);

campaignProductShipmentSchema.index({ vendorId: 1, shipmentStatus: 1, updatedAt: -1 });
campaignProductShipmentSchema.index({ influencerId: 1, shipmentStatus: 1, updatedAt: -1 });

campaignProductShipmentSchema.statics.STATUSES = SHIPMENT_STATUSES;

module.exports = mongoose.models.CampaignProductShipment || mongoose.model("CampaignProductShipment", campaignProductShipmentSchema);
