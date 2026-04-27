const mongoose = require("mongoose");

// NOTE: Keep existing statuses for backward-compatibility with current UI and stored data.
// Admin APIs accept normalized uppercase statuses and map to these stored values.
const ORDER_STATUS = ["Pending", "Placed", "Packed", "Shipped", "Out for Delivery", "Delivered", "Returned", "Cancelled"];
const PAYMENT_STATUS = ["Pending", "Paid", "Failed", "Refunded", "Partially Refunded"];
const SHIPPING_MODE = ["SELF", "PLATFORM"];
const SHIPPING_STATUS = ["NOT_SHIPPED", "READY_FOR_PICKUP", "SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED"];
const PICKUP_STATUS = ["NOT_REQUESTED", "REQUESTED", "SCHEDULED", "COMPLETED", "FAILED"];

const ORDER_STATUS_NORMALIZED = ["PLACED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "RETURNED"];
const PAYMENT_STATUS_NORMALIZED = ["PENDING", "PAID", "FAILED"];

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    image: { type: String },
    variantId: { type: String, trim: true, default: "" },
    variantSku: { type: String, trim: true, default: "" },
    variantTitle: { type: String, trim: true, default: "" },
    variantAttributes: {
      type: Map,
      of: String,
      default: {},
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      index: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: function(arr) {
          return arr && arr.length > 0;
        },
        message: "Order must have at least one item",
      },
    },
    subtotal: { type: Number, required: true, min: 0, default: 0 },
    shippingFee: { type: Number, min: 0, default: 0 },
    taxAmount: { type: Number, min: 0, default: 0 },
    totalAmount: { type: Number, required: true, min: 0, default: 0 },
    platformCommissionRate: { type: Number, min: 0, default: 0 },
    platformCommissionAmount: { type: Number, min: 0, default: 0 },
    vendorEarning: { type: Number, min: 0, default: 0 },
    currency: {
      type: String,
      default: "INR",
      enum: ["USD", "EUR", "INR", "GBP"],
    },
    status: {
      type: String,
      enum: ORDER_STATUS,
      default: "Pending",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUS,
      default: "Pending",
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["ONLINE", "COD"],
      default: "ONLINE",
    },
    paymentRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      index: true,
    },
    orderGroupId: {
      type: String,
      trim: true,
      index: true,
    },
    razorpayOrderId: { type: String, trim: true, index: true },
    razorpayPaymentId: { type: String, trim: true, index: true },
    paymentCapturedAt: { type: Date },
    payoutEligibleAt: { type: Date, index: true },
    fraudFlags: {
      type: [String],
      default: [],
    },
    deliveryPartner: { type: String, default: "Shiprocket" },
    shippingMode: {
      type: String,
      enum: SHIPPING_MODE,
      default: "SELF",
      index: true,
    },
    shippingStatus: {
      type: String,
      enum: SHIPPING_STATUS,
      default: "NOT_SHIPPED",
      index: true,
    },
    trackingId: { type: String, trim: true },
    trackingUrl: { type: String, trim: true },
    courierName: { type: String, trim: true },
    trackingAssignedAt: { type: Date },
    shipmentId: { type: String, trim: true, index: true },
    pickupRequestedAt: { type: Date },
    pickupScheduledAt: { type: Date },
    pickupCompletedAt: { type: Date },
    pickupStatus: {
      type: String,
      enum: PICKUP_STATUS,
      default: "NOT_REQUESTED",
      index: true,
    },
    logisticsProvider: { type: String, trim: true, default: "SHIPROCKET" },
    pickupAddressSnapshot: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      addressLine1: { type: String, trim: true },
      addressLine2: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true },
      country: { type: String, trim: true },
      latitude: { type: Number },
      longitude: { type: Number },
    },
    logisticsMetadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    courierAssignedByRole: {
      type: String,
      enum: ["ADMIN", "VENDOR"],
    },
    courierAssignedById: {
      type: mongoose.Schema.Types.ObjectId,
    },
    courierAssignedAt: { type: Date },
    whatsappSent: { type: Boolean, default: false, index: true },
    deliveryStatus: {
      type: String,
      enum: ["PENDING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "RETURNED"],
      default: "PENDING",
    },
    shippingAddress: {
      fullName: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      line1: { type: String, required: true, trim: true },
      line2: { type: String, allowed: true, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      postalCode: { type: String, required: true, trim: true },
      country: { type: String, required: true, trim: true },
    },
    timeline: [
      {
        status: { type: String, enum: ORDER_STATUS, required: true },
        note: { type: String, trim: true },
        changedAt: { type: Date, default: Date.now },
      },
    ],
    deliveredAt: { type: Date },
    // Soft delete (admin)
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ isActive: 1, createdAt: -1 });
orderSchema.index({ sellerId: 1, shippingMode: 1, shippingStatus: 1, createdAt: -1 });

module.exports = {
  Order: mongoose.model("Order", orderSchema),
  ORDER_STATUS,
  PAYMENT_STATUS,
  SHIPPING_MODE,
  SHIPPING_STATUS,
  PICKUP_STATUS,
  ORDER_STATUS_NORMALIZED,
  PAYMENT_STATUS_NORMALIZED,
};
