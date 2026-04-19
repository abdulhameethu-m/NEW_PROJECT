const mongoose = require("mongoose");

const SUPPORT_TICKET_STATUS = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

const supportTicketMessageSchema = new mongoose.Schema(
  {
    senderType: {
      type: String,
      enum: ["VENDOR", "SUPPORT"],
      required: true,
    },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const supportTicketSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    subject: { type: String, required: true, trim: true, maxlength: 160 },
    category: { type: String, trim: true, maxlength: 80 },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    status: {
      type: String,
      enum: SUPPORT_TICKET_STATUS,
      default: "OPEN",
      index: true,
    },
    messages: {
      type: [supportTicketMessageSchema],
      default: [],
    },
  },
  { timestamps: true }
);

supportTicketSchema.index({ vendorId: 1, updatedAt: -1 });

module.exports = {
  SupportTicket: mongoose.model("SupportTicket", supportTicketSchema),
  SUPPORT_TICKET_STATUS,
};
